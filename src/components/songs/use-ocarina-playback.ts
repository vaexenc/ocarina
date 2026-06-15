import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {songs} from "/src/data/song-data";
import {
	AudioBuffers,
	AudioSystem,
	KeybindId,
	NoteName,
	NoteObject,
	SettingValues,
	Song,
} from "/src/types";
import {createSound, fadeOutSource, playSound} from "/src/util/audio";

const songStartDelay = 800;
const canCancelDelay = 500;
const songEndDelay = 500;
const ocarinaFadeDuration = 0.3;
const songStartOcarinaFadeoutDelay = -100;
const maxVisibleNotes = 8; // the longest song is 8 notes, so the box never needs to show more

const keybindsToNotes: Record<
	"keybindA" | "keybindCUp" | "keybindCDown" | "keybindCLeft" | "keybindCRight",
	NoteName
> = {
	keybindA: "a",
	keybindCUp: "u",
	keybindCDown: "d",
	keybindCLeft: "l",
	keybindCRight: "r",
};

const notesToDetune: Record<NoteName, number> = {
	// ocarina.ogg: g#
	"a": -600, // d
	"d": -300, // f
	"r": 100, // a
	"l": 300, // b
	"u": 600, // d
};

// Ocarina of Time-style pitch bending: each rebindable bend key offsets the note's pitch by the
// given number of cents while held. A note bent this way can't be part of a song match.
const bendKeybindCents: Record<
	"keybindBendWholeDown" | "keybindBendSemiDown" | "keybindBendSemiUp" | "keybindBendWholeUp",
	number
> = {
	keybindBendWholeDown: -200,
	keybindBendSemiDown: -100,
	keybindBendSemiUp: 100,
	keybindBendWholeUp: 200,
};

// Vibrato is purely an audio effect — it does not affect matching.
const vibratoRateHz = 6;
const vibratoDepthCents = 35;

// A non-note sentinel that a bent note contributes to the played sequence, so it can never be
// part of (or bridge) a matched song, which contain only real note letters.
const bentNoteSentinel = "#";

// Each song's note sequence as a string, so a played sequence is recognised with a single
// `endsWith` instead of a hand-rolled reverse comparison.
const songMatchers = Object.entries(songs).map(([id, song]) => ({
	id,
	song,
	notes: song.notes.join(""),
}));

export type OcarinaPlayback = {
	notes: NoteObject[];
	matchedSong: Song | null;
	matchedSongId: string | null;
	inputPress: (note: NoteName) => void;
	inputRelease: (note: NoteName) => void;
};

/**
 * The imperative ocarina engine: input handling, song-match detection, playback scheduling,
 * and the WebAudio node lifecycle. Owns all the mutable refs so the component stays declarative.
 *
 * `matchedSongId`/`matchedSong` are the single source of truth for the currently playing song;
 * the consumer reports them upward via `onSongCorrect`/`onSongEnd` rather than feeding state back.
 */
export function useOcarinaPlayback({
	isReady,
	settings,
	isInputEnabled,
	onSongCorrect,
	onSongEnd,
	audioSystem,
	audioBuffers,
}: {
	isReady: boolean;
	settings: SettingValues;
	isInputEnabled: boolean;
	onSongCorrect: (songId: string, songData: Song) => void;
	onSongEnd: () => void;
	audioSystem: AudioSystem;
	audioBuffers: React.RefObject<AudioBuffers>;
}): OcarinaPlayback {
	const [matched, setMatched] = useState<{id: string; song: Song} | null>(null);
	const [notes, setNotes] = useState<NoteObject[]>([]);
	const [playerState, setPlayerState] = useState<"notPlaying" | "playing" | "playingCanCancel">(
		"notPlaying"
	);
	const nextNoteId = useRef(0);
	const currentSongSource = useRef<AudioBufferSourceNode | null>(null);
	const currentOcarinaSource = useRef<AudioBufferSourceNode | null>(null);
	const currentOcarinaGain = useRef<GainNode | null>(null);
	const currentNote = useRef<NoteName | null>(null);
	const playbackTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

	// Live input modifiers. `heldNotes` tracks which note keys are physically down so we know a
	// note is currently sounding; bend/vibrato keys only act in that case. Their keys never
	// overlap a note keybind, so keyup can tell them apart by the key alone.
	const heldNotes = useRef<Set<string>>(new Set());
	const activeBends = useRef<Map<string, number>>(new Map());
	const vibratoActive = useRef(false);
	const vibratoOsc = useRef<OscillatorNode | null>(null);
	const vibratoDepth = useRef<GainNode | null>(null);

	const convolverRef = useRef<ConvolverNode | null>(null);
	const convolver = (convolverRef.current ??= audioSystem.context.createConvolver());

	// Maps each configured key to the note it plays, for O(1) lookup on keydown.
	const keyToNote = useMemo(() => {
		const map = new Map<string, NoteName>();
		(Object.entries(keybindsToNotes) as [KeybindId, NoteName][]).forEach(([id, note]) => {
			map.set(settings[id], note);
		});
		return map;
	}, [settings]);

	// Maps each configured bend key to its cent offset, mirroring `keyToNote`.
	const keyToBendCents = useMemo(() => {
		const map = new Map<string, number>();
		(Object.entries(bendKeybindCents) as [keyof typeof bendKeybindCents, number][]).forEach(
			([id, cents]) => map.set(settings[id], cents)
		);
		return map;
	}, [settings]);

	const vibratoKey = settings.keybindVibrato;

	const clearPlaybackTimeouts = useCallback(() => {
		playbackTimeouts.current.forEach(clearTimeout);
		playbackTimeouts.current = [];
	}, []);

	const currentBendCents = useCallback(() => {
		let sum = 0;
		for (const cents of activeBends.current.values()) sum += cents;
		return sum;
	}, []);

	// Push the current bend (plus the note's base detune) onto the sounding source. The vibrato
	// LFO, when connected, adds its oscillation on top of this intrinsic value.
	const applyDetune = useCallback(() => {
		const source = currentOcarinaSource.current;
		const note = currentNote.current;
		if (!source || !note) return;
		source.detune.setValueAtTime(
			notesToDetune[note] + currentBendCents(),
			audioSystem.context.currentTime
		);
	}, [audioSystem, currentBendCents]);

	const disconnectVibrato = useCallback(() => {
		vibratoDepth.current?.disconnect();
	}, []);

	// Route a shared, always-running LFO into the current source's detune. Created lazily so the
	// oscillator only exists once vibrato is first used.
	const connectVibrato = useCallback(() => {
		const ctx = audioSystem.context;
		if (!vibratoOsc.current) {
			const osc = ctx.createOscillator();
			osc.frequency.value = vibratoRateHz;
			const depth = ctx.createGain();
			depth.gain.value = vibratoDepthCents;
			osc.connect(depth);
			osc.start();
			vibratoOsc.current = osc;
			vibratoDepth.current = depth;
		}
		const source = currentOcarinaSource.current;
		if (source && vibratoDepth.current) {
			vibratoDepth.current.disconnect();
			vibratoDepth.current.connect(source.detune);
		}
	}, [audioSystem]);

	// Mark the sounding (most recently added) note as bent, excluding it from song matching.
	const markCurrentNoteBent = useCallback(() => {
		setNotes((prev) =>
			prev.length === 0
				? prev
				: prev.map((note, i) => (i === prev.length - 1 ? {...note, isBent: true} : note))
		);
	}, []);

	const resetModifiers = useCallback(() => {
		heldNotes.current.clear();
		activeBends.current.clear();
		vibratoActive.current = false;
		disconnectVibrato();
	}, [disconnectVibrato]);

	const resetPlayback = useCallback(() => {
		clearPlaybackTimeouts();
		resetModifiers();
		setNotes([]);
		setMatched(null);
		setPlayerState("notPlaying");
	}, [clearPlaybackTimeouts, resetModifiers]);

	const fadeOutOcarina = useCallback(() => {
		if (currentOcarinaSource.current && currentOcarinaGain.current) {
			fadeOutSource(
				audioSystem.context,
				currentOcarinaSource.current,
				currentOcarinaGain.current,
				ocarinaFadeDuration
			);
		}
	}, [audioSystem]);

	const addNote = useCallback((note: NoteName, isBent: boolean) => {
		setNotes((prev) => {
			const newNote: NoteObject = {note, id: nextNoteId.current++, ...(isBent && {isBent: true})};
			return prev.length >= maxVisibleNotes
				? [...prev.slice(1), newNote]
				: [...prev, newNote];
		});
	}, []);

	const inputPress = useCallback(
		(note: NoteName) => {
			if (!isInputEnabled) return;
			if (playerState === "playing") return;

			if (playerState === "playingCanCancel") {
				currentSongSource.current?.stop();
				resetPlayback();
				onSongEnd();
			}

			// A note carries any bend that's active the instant it starts (e.g. a bend key held
			// over from the previous note). Vibrato never affects matching, so it's not counted.
			const isBent = activeBends.current.size > 0;
			addNote(note, isBent);

			fadeOutOcarina();
			const sound = playSound(audioSystem, audioBuffers.current.ocarina, {
				gain: 0.3,
				loop: true,
				loopStart: 0.47,
				loopEnd: 0.7163,
				detune: notesToDetune[note] + currentBendCents(),
				extraDestination: convolver,
			});
			if (sound) {
				currentOcarinaSource.current = sound.source;
				currentOcarinaGain.current = sound.gain;
			}
			currentNote.current = note;
			if (vibratoActive.current) connectVibrato();
		},
		[
			isInputEnabled,
			playerState,
			addNote,
			resetPlayback,
			onSongEnd,
			fadeOutOcarina,
			audioSystem,
			audioBuffers,
			convolver,
			currentBendCents,
			connectVibrato,
		]
	);

	const inputRelease = useCallback(
		(note: NoteName) => {
			if (note !== currentNote.current) return;
			if (playerState === "playing") return;
			fadeOutOcarina();
		},
		[playerState, fadeOutOcarina]
	);

	const playMatchedSong = useCallback(
		(songId: string, song: Song, matchLength: number) => {
			setMatched({id: songId, song});
			setPlayerState("playing");
			setNotes((prev) =>
				prev.map((note, i) =>
					i >= prev.length - matchLength ? {...note, isFlashing: true} : note
				)
			);
			onSongCorrect(songId, song);

			const sound = createSound(audioSystem, audioBuffers.current[songId], {
				gain: 0.6,
			});
			if (!sound) return;
			currentSongSource.current = sound.source;

			const schedule = (fn: () => void, delay: number) =>
				playbackTimeouts.current.push(setTimeout(fn, delay));

			// Fade out the held note just before the song proper begins.
			schedule(fadeOutOcarina, Math.max(songStartDelay + songStartOcarinaFadeoutDelay, 0));

			schedule(() => {
				sound.source.start();
				schedule(() => setPlayerState("playingCanCancel"), canCancelDelay);
				schedule(
					() => {
						sound.source.stop();
						resetPlayback();
						onSongEnd();
					},
					audioBuffers.current[songId].duration * 1000 + songEndDelay
				);
			}, songStartDelay);
		},
		[onSongCorrect, onSongEnd, resetPlayback, fadeOutOcarina, audioSystem, audioBuffers]
	);

	// Detect a completed song from the most recent notes. Guarded so the flashing update
	// below (which mutates `notes`) doesn't re-trigger the match.
	useEffect(() => {
		if (playerState !== "notPlaying" || notes.length === 0) return;

		const played = notes.map((note) => (note.isBent ? bentNoteSentinel : note.note)).join("");
		const match = songMatchers.find((m) => m.notes.length > 0 && played.endsWith(m.notes));
		if (match) playMatchedSong(match.id, match.song, match.notes.length);
	}, [notes, playerState, playMatchedSong]);

	useEffect(() => {
		// Bend/vibrato keys stay "armed" while held: pressing one applies to the sounding note
		// (if any) immediately, and `inputPress` re-applies the armed state to each new note so a
		// pre-held key bends/vibratos notes played afterwards too. `heldNotes` only gates the
		// "mark the current note bent" step, so an idle press never taints an already-finished note.
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.repeat) return;

			const cents = keyToBendCents.get(event.key);
			if (cents !== undefined) {
				event.preventDefault();
				activeBends.current.set(event.key, cents);
				applyDetune();
				if (heldNotes.current.size > 0) markCurrentNoteBent();
				return;
			}
			if (event.key === vibratoKey) {
				event.preventDefault();
				vibratoActive.current = true;
				connectVibrato();
				return;
			}

			const note = keyToNote.get(event.key);
			if (note) {
				heldNotes.current.add(event.key);
				inputPress(note);
			}
		};

		const handleKeyUp = (event: KeyboardEvent) => {
			if (keyToBendCents.has(event.key)) {
				activeBends.current.delete(event.key);
				applyDetune();
				return;
			}
			if (event.key === vibratoKey) {
				vibratoActive.current = false;
				disconnectVibrato();
				return;
			}

			const note = keyToNote.get(event.key);
			if (note) {
				heldNotes.current.delete(event.key);
				inputRelease(note);
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		window.addEventListener("keyup", handleKeyUp);

		return () => {
			window.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener("keyup", handleKeyUp);
		};
	}, [
		keyToNote,
		keyToBendCents,
		vibratoKey,
		inputPress,
		inputRelease,
		applyDetune,
		connectVibrato,
		disconnectVibrato,
		markCurrentNoteBent,
	]);

	useEffect(() => {
		if (!isReady) return;

		convolver.buffer = audioBuffers.current["ocarina-convolver-impulse"];
		const gainNode = audioSystem.context.createGain();
		gainNode.gain.value = 1;
		convolver.connect(gainNode);
		gainNode.connect(audioSystem.gain);
	}, [isReady, convolver, audioBuffers, audioSystem]);

	useEffect(() => clearPlaybackTimeouts, [clearPlaybackTimeouts]);

	useEffect(
		() => () => {
			vibratoOsc.current?.stop();
			vibratoOsc.current = null;
			vibratoDepth.current = null;
		},
		[]
	);

	return {
		notes,
		matchedSong: matched?.song ?? null,
		matchedSongId: matched?.id ?? null,
		inputPress,
		inputRelease,
	};
}
