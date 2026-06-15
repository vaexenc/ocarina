import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {songs} from "/src/data/song-data";
import {
	AudioBuffers,
	AudioSystem,
	NoteKeybindId,
	NoteName,
	NoteObject,
	SettingValues,
	Song,
} from "/src/types";
import {createSound, fadeOutSource, playSound} from "/src/util/audio";
import {usePitchModifiers} from "./use-pitch-modifiers";

const songStartDelay = 800;
const canCancelDelay = 500;
const songEndDelay = 500;
const ocarinaFadeDuration = 0.3;
const songStartOcarinaFadeoutDelay = -100;
const maxVisibleNotes = 8; // the longest song is 8 notes, so the box never needs to show more

const keybindsToNotes: Record<NoteKeybindId, NoteName> = {
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
 * Pitch bend and vibrato live in {@link usePitchModifiers}, which acts on the live note here.
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

	const convolverRef = useRef<ConvolverNode | null>(null);
	const convolver = (convolverRef.current ??= audioSystem.context.createConvolver());

	// Maps each configured key to the note it plays, for O(1) lookup on keydown.
	const keyToNote = useMemo(() => {
		const map = new Map<string, NoteName>();
		(Object.entries(keybindsToNotes) as [NoteKeybindId, NoteName][]).forEach(([id, note]) => {
			map.set(settings[id], note);
		});
		return map;
	}, [settings]);

	const clearPlaybackTimeouts = useCallback(() => {
		playbackTimeouts.current.forEach(clearTimeout);
		playbackTimeouts.current = [];
	}, []);

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

	// Mark the sounding (most recently added) note as bent, excluding it from song matching.
	const markCurrentNoteBent = useCallback(() => {
		setNotes((prev) =>
			prev.length === 0
				? prev
				: prev.map((note, i) => (i === prev.length - 1 ? {...note, isBent: true} : note))
		);
	}, []);

	const {
		bendCents,
		isBendActive,
		attachToSource,
		detach: detachModifiers,
		handleKeyDown: handleModifierKeyDown,
		handleKeyUp: handleModifierKeyUp,
		reset: resetModifiers,
	} = usePitchModifiers({audioSystem, settings, onBendLiveNote: markCurrentNoteBent});

	const resetPlayback = useCallback(() => {
		clearPlaybackTimeouts();
		resetModifiers();
		setNotes([]);
		setMatched(null);
		setPlayerState("notPlaying");
	}, [clearPlaybackTimeouts, resetModifiers]);

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
			addNote(note, isBendActive());

			fadeOutOcarina();
			const sound = playSound(audioSystem, audioBuffers.current.ocarina, {
				gain: 0.3,
				loop: true,
				loopStart: 0.47,
				loopEnd: 0.7163,
				detune: notesToDetune[note] + bendCents(),
				extraDestination: convolver,
			});
			if (sound) {
				currentOcarinaSource.current = sound.source;
				currentOcarinaGain.current = sound.gain;
				attachToSource(sound.source, notesToDetune[note]);
			}
			currentNote.current = note;
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
			isBendActive,
			bendCents,
			attachToSource,
		]
	);

	const inputRelease = useCallback(
		(note: NoteName) => {
			if (note !== currentNote.current) return;
			if (playerState === "playing") return;
			detachModifiers();
			fadeOutOcarina();
		},
		[playerState, fadeOutOcarina, detachModifiers]
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
		// Bend/vibrato keys are handled first and, when consumed, never fall through to note input.
		// Input gating mirrors the note path (no presses while the modal or loading screen is up),
		// while releases always run so held keys can't get stuck once input is re-enabled.
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.repeat) return;
			if (!isInputEnabled) return;

			if (handleModifierKeyDown(event)) return;

			const note = keyToNote.get(event.key);
			if (note) inputPress(note);
		};

		const handleKeyUp = (event: KeyboardEvent) => {
			if (handleModifierKeyUp(event)) return;

			const note = keyToNote.get(event.key);
			if (note) inputRelease(note);
		};

		window.addEventListener("keydown", handleKeyDown);
		window.addEventListener("keyup", handleKeyUp);

		return () => {
			window.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener("keyup", handleKeyUp);
		};
	}, [
		isInputEnabled,
		keyToNote,
		inputPress,
		inputRelease,
		handleModifierKeyDown,
		handleModifierKeyUp,
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

	return {
		notes,
		matchedSong: matched?.song ?? null,
		matchedSongId: matched?.id ?? null,
		inputPress,
		inputRelease,
	};
}
