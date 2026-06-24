import {Instrument} from "@/data/instrument-data";
import {NoteName, NoteObject, Song, SongId, songs} from "@/data/song-data";
import {normalizeKey, NoteKeybindId, SettingValues} from "@/settings/setting-fields";
import {AudioBuffers, AudioSystem, fadeOutSource, playSound, Sound} from "@/util/audio";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {useMatchedSongPlayback} from "./use-matched-song-playback";
import {usePitchModifiers} from "./use-pitch-modifiers";

const liveNoteFadeDuration = 0.3;
// The longest song is 8 notes, so the box never needs to show more. The player NoteBox also reserves
// exactly this many note slots so its layout (and the gap between notes) doesn't shift with the count.
export const maxVisibleNotes = 8;

const keybindsToNotes: Record<NoteKeybindId, NoteName> = {
	keybindA: "a",
	keybindCUp: "u",
	keybindCDown: "d",
	keybindCLeft: "l",
	keybindCRight: "r",
};

// The single sounding key-input note. Owned here so the engine can fade it out and the pitch
// modifiers (which read this same ref) can bend/vibrato it — one source of truth instead of two.
// It persists until replaced by the next note, so a press can still fade the previous note out even
// after that note's key was released.
export type LiveNote = Sound & {note: NoteName; baseDetune: number};

// A non-note sentinel that a bent note contributes to the played sequence, so it can never be
// part of (or bridge) a matched song, which contain only real note letters.
const bentNoteSentinel = "#";

// Each song's note sequence as a string, so a played sequence is recognised with a single
// `endsWith` instead of a hand-rolled reverse comparison.
const songMatchers = (Object.entries(songs) as [SongId, Song][]).map(([id, song]) => ({
	id,
	song,
	notes: song.notes.join(""),
}));

// The song, if any, completed by the tail of the played sequence. `matchableSongIds`, when given,
// is the allowlist of songs that may match (Speedrun: the current set's not-yet-completed songs);
// any song outside it — from another set or already played this run — is ignored. Undefined (Song
// mode) lets every song match.
function findMatch(played: string, matchableSongIds?: Set<SongId>) {
	return songMatchers.find(
		(m) =>
			m.notes.length > 0 && played.endsWith(m.notes) && (matchableSongIds?.has(m.id) ?? true)
	);
}

// The played sequence as a string for matching: a bent note contributes the sentinel, everything
// else its own note letter.
function notesToSequence(notes: NoteObject[]): string {
	return notes.map((note) => (note.isBent ? bentNoteSentinel : note.note)).join("");
}

export type OcarinaPlayback = {
	notes: NoteObject[];
	matchedSong: Song | null;
	matchedSongId: SongId | null;
	inputPress: (note: NoteName) => void;
	inputRelease: (note: NoteName) => void;
};

/**
 * The imperative ocarina engine: input handling, song-match detection, and the live-note WebAudio
 * lifecycle. The matched-song result presentation (its playback state machine and timeout cascade)
 * lives in {@link useMatchedSongPlayback}; pitch bend and vibrato live in {@link usePitchModifiers},
 * which acts on the shared {@link LiveNote} owned here. This hook stays the single owner of the
 * mutable note/audio refs so the component can stay declarative.
 *
 * A new match can only appear the instant a note is pressed — a bend only ever *invalidates* a
 * sequence — so detection happens inline in `inputPress` rather than in an effect watching `notes`.
 * That keeps a mode switch from ever re-matching a sequence built up under the previous mode, and
 * means the flashing/bent note updates can't accidentally re-trigger a match either.
 *
 * `matchedSongId`/`matchedSong` are the single source of truth for the currently playing song;
 * the consumer reports them upward via `onSongCorrect`/`onSongEnd` rather than feeding state back.
 */
export function useOcarinaPlayback({
	isReady,
	settings,
	instrument,
	isInputEnabled,
	matchingEnabled,
	instantMatch,
	matchableSongIds,
	onNotePress,
	resetSignal,
	onSongCorrect,
	onSongEnd,
	audioSystem,
	audioBuffers,
}: {
	isReady: boolean;
	settings: SettingValues;
	instrument: Instrument;
	isInputEnabled: boolean;
	// When false (Free mode) played notes still sound, but no song is ever matched or played back.
	matchingEnabled: boolean;
	// Speedrun: a matched song registers instantly (confirmation sound only, via `onSongCorrect`)
	// without blocking input or playing the melody back, so the player can keep going at full speed.
	instantMatch: boolean;
	// Restricts which songs can be matched. Undefined (Song mode) matches any song. In Speedrun it's
	// the current set's songs not yet completed, so a song from another set — or one already played
	// this run — never matches (no confirmation, no progress).
	matchableSongIds?: Set<SongId>;
	// Fired on every accepted note press, used to start the speedrun timer on the first note.
	onNotePress?: () => void;
	// An external counter; the engine flushes its buffered note sequence whenever it changes.
	// Speedrun bumps it to drop a partial sequence when a run is abandoned without a mode change.
	resetSignal?: number;
	onSongCorrect: (songId: SongId, songData: Song) => void;
	onSongEnd: () => void;
	audioSystem: AudioSystem;
	audioBuffers: React.RefObject<AudioBuffers>;
}): OcarinaPlayback {
	const [notes, setNotes] = useState<NoteObject[]>([]);
	const nextNoteId = useRef(0);
	const liveNote = useRef<LiveNote | null>(null);

	// Mirrors `notes` so `inputPress` can read the up-to-date sequence (and match on it) the instant
	// a key is pressed, without waiting for a re-render. Every write to `notes` goes through
	// `updateNotes` so the ref and the state never diverge.
	const notesRef = useRef<NoteObject[]>([]);
	const updateNotes = useCallback(
		(update: NoteObject[] | ((prev: NoteObject[]) => NoteObject[])) => {
			const next = typeof update === "function" ? update(notesRef.current) : update;
			notesRef.current = next;
			setNotes(next);
		},
		[]
	);

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

	const fadeOutLiveNote = useCallback(() => {
		const live = liveNote.current;
		if (live) {
			fadeOutSource(audioSystem.context, live.source, live.gain, liveNoteFadeDuration);
		}
	}, [audioSystem]);

	// Mark the sounding (most recently added) note as bent, excluding it from song matching.
	const markCurrentNoteBent = useCallback(() => {
		updateNotes((prev) =>
			prev.length === 0
				? prev
				: prev.map((note, i) => (i === prev.length - 1 ? {...note, isBent: true} : note))
		);
	}, [updateNotes]);

	const {
		bendCents,
		isBendActive,
		onLiveNoteStarted,
		onLiveNoteReleased,
		handleKeyDown: handleModifierKeyDown,
		handleKeyUp: handleModifierKeyUp,
		reset: resetModifiers,
	} = usePitchModifiers({audioSystem, settings, liveNote, onBendLiveNote: markCurrentNoteBent});

	// Flash the last `matchLength` played notes to highlight the song that was just matched.
	const flashMatchedNotes = useCallback(
		(matchLength: number) => {
			updateNotes((prev) =>
				prev.map((note, i) =>
					i >= prev.length - matchLength ? {...note, isFlashing: true} : note
				)
			);
		},
		[updateNotes]
	);

	// Tear down the played sequence and the live-note modifiers when a presentation ends, then notify
	// the app. The mode/run reset below reuses the first two steps (without notifying the app).
	const handleSongEnd = useCallback(() => {
		resetModifiers();
		updateNotes([]);
		onSongEnd();
	}, [resetModifiers, updateNotes, onSongEnd]);

	const {
		matched,
		state: playbackState,
		play: playMatchedSong,
		cancel: cancelPlayback,
		reset: resetMatchedPlayback,
	} = useMatchedSongPlayback({
		instrument,
		audioSystem,
		audioBuffers,
		onSongCorrect,
		onSongEnd: handleSongEnd,
		flashMatchedNotes,
		fadeOutLiveNote,
	});

	const resetPlayback = useCallback(() => {
		resetMatchedPlayback();
		resetModifiers();
		updateNotes([]);
	}, [resetMatchedPlayback, resetModifiers, updateNotes]);

	const inputPress = useCallback(
		(note: NoteName) => {
			if (!isInputEnabled) return;
			if (playbackState === "playing") return;
			if (playbackState === "playingCanCancel") cancelPlayback();

			// A note carries any bend that's active the instant it starts (e.g. a bend key held
			// over from the previous note). Vibrato never affects matching, so it's not counted.
			const newNote: NoteObject = {
				note,
				id: nextNoteId.current++,
				...(isBendActive() && {isBent: true}),
			};
			const prev = notesRef.current;
			const nextNotes =
				prev.length >= maxVisibleNotes ? [...prev.slice(1), newNote] : [...prev, newNote];
			updateNotes(nextNotes);
			onNotePress?.();

			fadeOutLiveNote();
			const detune = instrument.detune[note];
			const sound = playSound(audioSystem, audioBuffers.current[instrument.bufferId], {
				gain: instrument.gain,
				loop: instrument.loop,
				loopStart: instrument.loopStart,
				loopEnd: instrument.loopEnd,
				detune: detune + bendCents(),
				extraDestination: convolver,
			});
			if (sound) {
				liveNote.current = {...sound, note, baseDetune: detune};
				onLiveNoteStarted();
				// Plucked instruments (guitar) ring out and die on their own, so a held note still
				// fades to silence instead of sustaining forever. An early release just overrides
				// this with the quicker release fade in `inputRelease`.
				if (instrument.holdFadeDuration !== undefined) {
					fadeOutSource(
						audioSystem.context,
						sound.source,
						sound.gain,
						instrument.holdFadeDuration
					);
				}
			}

			// Match against the sequence this press just produced — the only moment a new match can
			// appear. Reaching here means we're not mid-playback (a "playing" press bailed above; a
			// "playingCanCancel" press cancelled into a clean sequence), so no extra state guard.
			if (!matchingEnabled) return;
			const match = findMatch(notesToSequence(nextNotes), matchableSongIds);
			if (!match) return;

			if (instantMatch) {
				// Register the song and clear the played notes so the next song starts from a clean
				// sequence (preventing a stray re-match). Input is never blocked; no melody is played.
				onSongCorrect(match.id, match.song);
				updateNotes([]);
			} else {
				playMatchedSong(match.id, match.song, match.notes.length);
			}
		},
		[
			isInputEnabled,
			playbackState,
			cancelPlayback,
			instrument,
			updateNotes,
			onNotePress,
			fadeOutLiveNote,
			audioSystem,
			audioBuffers,
			convolver,
			isBendActive,
			bendCents,
			onLiveNoteStarted,
			matchingEnabled,
			instantMatch,
			matchableSongIds,
			onSongCorrect,
			playMatchedSong,
		]
	);

	const inputRelease = useCallback(
		(note: NoteName) => {
			if (note !== liveNote.current?.note) return;
			if (playbackState === "playing") return;
			onLiveNoteReleased();
			if (instrument.loop) fadeOutLiveNote();
		},
		[playbackState, instrument, fadeOutLiveNote, onLiveNoteReleased]
	);

	// Drop the played-note sequence (and any pending playback) whenever a fresh play session starts,
	// so notes from the previous session can't bleed into the new one. Triggers: a play-mode change
	// — (matchingEnabled, instantMatch) is a unique signature per mode, and leaving Free mode must
	// drop the open-play notes before Song mode could match against them — or a `resetSignal` bump,
	// which a speedrun run-abandon (reset button / set switch) fires while staying in the same mode.
	// The initial run is a no-op: the buffer is already empty on mount.
	useEffect(() => {
		resetPlayback();
	}, [matchingEnabled, instantMatch, resetSignal, resetPlayback]);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			// Bend/vibrato are reserved keys: always handled (and preventDefault'd) so they never
			// fall through to note input or the browser, even while input is disabled. Auto-repeats
			// are skipped so a held bend key isn't reprocessed on every repeat.
			if (!event.repeat && handleModifierKeyDown(event)) return;

			// Note presses are gated like the note path always was; releases (keyup) always run so a
			// held key can't get stuck once input is re-enabled.
			if (!isInputEnabled) return;
			const note = keyToNote.get(normalizeKey(event.key));
			if (!note) return;

			// Notes default to the arrow keys, which would otherwise scroll the song list (the
			// focusable overflow region). We own these keys as input, so suppress the scroll on every
			// keydown — including the auto-repeats while a key is held, or holding it would still
			// scroll.
			event.preventDefault();

			// Ignore auto-repeats so a held key doesn't re-trigger the note.
			if (event.repeat) return;
			inputPress(note);
		};

		const handleKeyUp = (event: KeyboardEvent) => {
			if (handleModifierKeyUp(event)) return;

			const note = keyToNote.get(normalizeKey(event.key));
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

		convolver.buffer = audioBuffers.current["convolver-impulse"];
		const gainNode = audioSystem.context.createGain();
		gainNode.gain.value = 1;
		convolver.connect(gainNode);
		gainNode.connect(audioSystem.gain);
	}, [isReady, convolver, audioBuffers, audioSystem]);

	return {
		notes,
		matchedSong: matched?.song ?? null,
		matchedSongId: matched?.id ?? null,
		inputPress,
		inputRelease,
	};
}
