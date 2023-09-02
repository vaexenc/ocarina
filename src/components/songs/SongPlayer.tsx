import clsx from "clsx";
import {useCallback, useEffect, useRef, useState} from "react";
import MobileControls from "./MobileControls";
import NoteBox from "./Notebox";
import style from "./SongPlayer.module.less";
import SongReference from "./SongReference";
import {songs} from "/src/song-data";
import {
	AudioBuffers,
	AudioSystem,
	Note,
	NoteName,
	NoteObject,
	Song,
	UserSettings,
} from "/src/types";
import {fadeOutSource} from "/src/util/util";

const songStartDelay = 800;
const canCancelDelay = 500;
const songEndDelay = 500;
const ocarinaFadeDuration = 0.3;
const songStartOcarinaFadeoutDelay = -100;

const keybindsToNotes: {[key: string]: NoteName} = {
	"keybindA": "a",
	"keybindCUp": "u",
	"keybindCDown": "d",
	"keybindCLeft": "l",
	"keybindCRight": "r",
};

const notesToDetune: {[key in NoteName]: number} = {
	// ocarina.ogg: g#
	"a": -600, // d
	"d": -300, // f
	"r": 100, // a
	"l": 300, // b
	"u": 600, // d
};

export default function SongPlayer({
	isReady,
	userSettings,
	isMobile,
	isInputEnabled,
	onSongCorrect,
	onSongEnd,
	audioSystem,
	audioBuffers,
	currentSongId,
}: {
	isReady: boolean;
	userSettings: UserSettings;
	isMobile: boolean;
	isInputEnabled: boolean;
	onSongCorrect: (songId: string, songData: Song) => void;
	onSongEnd: () => void;
	audioSystem: React.MutableRefObject<AudioSystem>;
	audioBuffers: React.MutableRefObject<AudioBuffers>;
	currentSongId: string | null;
}) {
	const [text, setText] = useState(<span />);
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
	const ocarinaConvolverNode = useRef(audioSystem.current.context.createConvolver());

	function addNote(note: NoteName) {
		setNotes((notes) => {
			const newNote: Note = {note: note, id: nextNoteId.current++};

			if (notes.length > 7) {
				return [...notes.slice(1), newNote];
			} else {
				return [...notes, newNote];
			}
		});
	}

	const inputPress = useCallback(
		(note: NoteName) => {
			if (!isInputEnabled) return;
			if (currentSongId && playerState === "playing") return;

			if (playerState === "playingCanCancel") {
				currentSongSource.current?.stop();
				currentPlayerId.current++;
				setNotes([]);
				setPlayerState("notPlaying");
				setText(<span />);
				onSongEnd();
			}

			addNote(note);

			if (currentOcarinaSource.current && currentOcarinaGain.current) {
				fadeOutSource(
					audioSystem.current.context,
					currentOcarinaSource.current,
					currentOcarinaGain.current,
					ocarinaFadeDuration
				);
			}

			const source = audioSystem.current.context.createBufferSource();
			source.buffer = audioBuffers.current["ocarina"];
			const gainNode = audioSystem.current.context.createGain();
			gainNode.gain.value = 0.3;
			gainNode.connect(audioSystem.current.gain);
			gainNode.connect(ocarinaConvolverNode.current);
			source.connect(gainNode);
			source.loop = true;
			source.loopStart = 0.47;
			source.loopEnd = 0.7163;
			source.start();
			source.detune.value = notesToDetune[note];

			currentOcarinaSource.current = source;
			currentOcarinaGain.current = gainNode;
			currentNote.current = note;
		},
		[currentSongId, isInputEnabled, playerState, onSongEnd, audioBuffers, audioSystem]
	);

	const inputRelease = useCallback(
		(note: NoteName) => {
			if (note !== currentNote.current) return;
			if (!currentOcarinaSource.current || !currentOcarinaGain.current) return;
			if (playerState === "playing") return;

			fadeOutSource(
				audioSystem.current.context,
				currentOcarinaSource.current,
				currentOcarinaGain.current,
				ocarinaFadeDuration
			);
		},
		[audioSystem, playerState]
	);

	useEffect(() => {
		if (!isReady) return;

		ocarinaConvolverNode.current.buffer = audioBuffers.current["ocarina-convolver-impulse"];
		const gainNode = audioSystem.current.context.createGain();
		gainNode.connect(audioSystem.current.gain);
		gainNode.gain.value = 1;
		ocarinaConvolverNode.current.connect(gainNode);
		// eslint-disable-next-line
	}, [isReady]);

	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if (event.repeat) return;

			Object.entries(keybindsToNotes).forEach(([keybindId, note]) => {
				if (
					event.key ===
					userSettings.find((userSetting) => userSetting.id === keybindId)!.value
				) {
					inputPress(note);
				}
			});
		}

		function handleKeyUp(event: KeyboardEvent) {
			Object.entries(keybindsToNotes).forEach(([keybindId, note]) => {
				if (
					event.key ===
					userSettings.find((userSetting) => userSetting.id === keybindId)!.value
				) {
					inputRelease(note);
				}
			});
		}

		window.addEventListener("keydown", handleKeyDown);
		window.addEventListener("keyup", handleKeyUp);

		return () => {
			window.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener("keyup", handleKeyUp);
		};
	}, [userSettings, inputPress, inputRelease]);

	useEffect(() => {
		const lastEightNotes = notes.slice(-8).map((note) => {
			return note.note;
		});
		const songEntries = Object.entries(songs);
		for (const songEntry of songEntries) {
			const [songId, songData] = songEntry;

			if (songData.notes.length > lastEightNotes.length) continue;

			for (let i = 0; i < songData.notes.length; i++) {
				if (
					songData.notes[songData.notes.length - 1 - i] !==
					lastEightNotes[lastEightNotes.length - 1 - i]
				)
					break;

				if (i === songData.notes.length - 1) {
					setText(
						<span>
							You played {songData.omitThe ? "" : "the"}{" "}
							<span style={{color: songData.color}}>{songData.name}</span>.
						</span>
					);
					onSongCorrect(songId, songData);
					setPlayerState("playing");

					for (let i = 0; i < songData.notes.length; i++) {
						notes[notes.length - 1 - i].isFlashing = true;
					}

					const source = audioSystem.current.context.createBufferSource();
					source.buffer = audioBuffers.current[songId];
					const gainNode = audioSystem.current.context.createGain();
					gainNode.connect(audioSystem.current.gain);
					gainNode.gain.value = 0.6;
					source.connect(gainNode);
					currentSongSource.current = source;

					const playerId = currentPlayerId.current;

					setTimeout(() => {
						if (currentOcarinaSource.current && currentOcarinaGain.current) {
							fadeOutSource(
								audioSystem.current.context,
								currentOcarinaSource.current,
								currentOcarinaGain.current,
								ocarinaFadeDuration
							);
						}
					}, Math.max(songStartDelay + songStartOcarinaFadeoutDelay, 0));

					setTimeout(() => {
						source.start();

						setTimeout(() => {
							setPlayerState("playingCanCancel");
						}, canCancelDelay);

						setTimeout(() => {
							if (currentPlayerId.current !== playerId) return;

							source.stop();
							setNotes([]);
							setText(<span />);
							onSongEnd();
							setPlayerState("notPlaying");
						}, audioBuffers.current[songId].duration * 1000 + songEndDelay);
					}, songStartDelay);
				}
			}
		}
	}, [notes, onSongCorrect, audioBuffers, audioSystem, onSongEnd]);

	return (
		<div className={clsx(style["song-player"])}>
			<SongReference currentSongId={currentSongId} />
			<NoteBox className={"note-box-player"} text={text} notes={notes} />
			{isMobile && <MobileControls inputPress={inputPress} inputRelease={inputRelease} />}
		</div>
	);
}
