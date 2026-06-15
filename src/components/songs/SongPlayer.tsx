import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import MobileControls from "./MobileControls";
import NoteBox from "./Notebox";
import SongReference from "./SongReference";
import {songs} from "/src/song-data";
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

const keybindsToNotes: Record<KeybindId, NoteName> = {
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

// Each song's note sequence as a string, so a played sequence is recognised with a single
// `endsWith` instead of a hand-rolled reverse comparison.
const songMatchers = Object.entries(songs).map(([id, song]) => ({
	id,
	song,
	notes: song.notes.map((note) => (typeof note === "object" ? note.note : note)).join(""),
}));

export default function SongPlayer({
	isReady,
	settings,
	isMobile,
	isInputEnabled,
	onSongCorrect,
	onSongEnd,
	audioSystem,
	audioBuffers,
	currentSongId,
}: {
	isReady: boolean;
	settings: SettingValues;
	isMobile: boolean;
	isInputEnabled: boolean;
	onSongCorrect: (songId: string, songData: Song) => void;
	onSongEnd: () => void;
	audioSystem: React.RefObject<AudioSystem>;
	audioBuffers: React.RefObject<AudioBuffers>;
	currentSongId: string | null;
}) {
	const [matchedSong, setMatchedSong] = useState<Song | null>(null);
	const [notes, setNotes] = useState<NoteObject[]>([]);
	const [playerState, setPlayerState] = useState<"notPlaying" | "playing" | "playingCanCancel">(
		"notPlaying"
	);
	const nextNoteId = useRef(0);
	const currentPlayerId = useRef(0);
	const currentSongSource = useRef<AudioBufferSourceNode | null>(null);
	const currentOcarinaSource = useRef<AudioBufferSourceNode | null>(null);
	const currentOcarinaGain = useRef<GainNode | null>(null);
	const currentNote = useRef<NoteName | null>(null);
	const playbackTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

	const convolverRef = useRef<ConvolverNode | null>(null);
	const convolver = (convolverRef.current ??= audioSystem.current.context.createConvolver());

	// Maps each configured key to the note it plays, for O(1) lookup on keydown.
	const keyToNote = useMemo(() => {
		const map = new Map<string, NoteName>();
		(Object.entries(keybindsToNotes) as [KeybindId, NoteName][]).forEach(([id, note]) => {
			map.set(settings[id], note);
		});
		return map;
	}, [settings]);

	const clearPlaybackTimeouts = useCallback(() => {
		playbackTimeouts.current.forEach(clearTimeout);
		playbackTimeouts.current = [];
	}, []);

	const resetPlayback = useCallback(() => {
		clearPlaybackTimeouts();
		setNotes([]);
		setMatchedSong(null);
		setPlayerState("notPlaying");
	}, [clearPlaybackTimeouts]);

	const fadeOutOcarina = useCallback(() => {
		if (currentOcarinaSource.current && currentOcarinaGain.current) {
			fadeOutSource(
				audioSystem.current.context,
				currentOcarinaSource.current,
				currentOcarinaGain.current,
				ocarinaFadeDuration
			);
		}
	}, [audioSystem]);

	const addNote = useCallback((note: NoteName) => {
		setNotes((prev) => {
			const newNote: NoteObject = {note, id: nextNoteId.current++};
			return prev.length > 7 ? [...prev.slice(1), newNote] : [...prev, newNote];
		});
	}, []);

	const inputPress = useCallback(
		(note: NoteName) => {
			if (!isInputEnabled) return;
			if (currentSongId && playerState === "playing") return;

			if (playerState === "playingCanCancel") {
				currentSongSource.current?.stop();
				currentPlayerId.current++;
				resetPlayback();
				onSongEnd();
			}

			addNote(note);

			fadeOutOcarina();
			const sound = playSound(audioSystem.current, audioBuffers.current.ocarina, {
				gain: 0.3,
				loop: true,
				loopStart: 0.47,
				loopEnd: 0.7163,
				detune: notesToDetune[note],
				extraDestination: convolver,
			});
			if (sound) {
				currentOcarinaSource.current = sound.source;
				currentOcarinaGain.current = sound.gain;
			}
			currentNote.current = note;
		},
		[
			isInputEnabled,
			currentSongId,
			playerState,
			addNote,
			resetPlayback,
			onSongEnd,
			fadeOutOcarina,
			audioSystem,
			audioBuffers,
			convolver,
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
			setMatchedSong(song);
			setPlayerState("playing");
			setNotes((prev) =>
				prev.map((note, i) =>
					i >= prev.length - matchLength ? {...note, isFlashing: true} : note
				)
			);
			onSongCorrect(songId, song);

			const sound = createSound(audioSystem.current, audioBuffers.current[songId], {
				gain: 0.6,
			});
			if (!sound) return;
			currentSongSource.current = sound.source;

			const playerId = currentPlayerId.current;
			const schedule = (fn: () => void, delay: number) =>
				playbackTimeouts.current.push(setTimeout(fn, delay));

			// Fade out the held note just before the song proper begins.
			schedule(fadeOutOcarina, Math.max(songStartDelay + songStartOcarinaFadeoutDelay, 0));

			schedule(() => {
				sound.source.start();
				schedule(() => setPlayerState("playingCanCancel"), canCancelDelay);
				schedule(
					() => {
						if (currentPlayerId.current !== playerId) return;
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

		const played = notes.map((note) => note.note).join("");
		const match = songMatchers.find((m) => m.notes.length > 0 && played.endsWith(m.notes));
		if (match) playMatchedSong(match.id, match.song, match.notes.length);
	}, [notes, playerState, playMatchedSong]);

	useEffect(() => {
		const onKey = (handler: (note: NoteName) => void) => (event: KeyboardEvent) => {
			if (event.repeat) return;
			const note = keyToNote.get(event.key);
			if (note) handler(note);
		};
		const handleKeyDown = onKey(inputPress);
		const handleKeyUp = onKey(inputRelease);

		window.addEventListener("keydown", handleKeyDown);
		window.addEventListener("keyup", handleKeyUp);

		return () => {
			window.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener("keyup", handleKeyUp);
		};
	}, [keyToNote, inputPress, inputRelease]);

	useEffect(() => {
		if (!isReady) return;

		convolver.buffer = audioBuffers.current["ocarina-convolver-impulse"];
		const gainNode = audioSystem.current.context.createGain();
		gainNode.gain.value = 1;
		convolver.connect(gainNode);
		gainNode.connect(audioSystem.current.gain);
	}, [isReady, convolver, audioBuffers, audioSystem]);

	useEffect(() => clearPlaybackTimeouts, [clearPlaybackTimeouts]);

	const text = matchedSong ? (
		<span>
			You played {matchedSong.omitThe ? "" : "the"}{" "}
			<span style={{color: matchedSong.color}}>{matchedSong.name}</span>.
		</span>
	) : (
		<span />
	);

	return (
		<div className="fixed inset-0 flex h-full w-full flex-col items-center justify-center select-none">
			<SongReference currentSongId={currentSongId} />
			<NoteBox variant="player" text={text} notes={notes} />
			{isMobile && <MobileControls inputPress={inputPress} inputRelease={inputRelease} />}
		</div>
	);
}
