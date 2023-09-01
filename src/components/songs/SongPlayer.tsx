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

const keybindsToNotes: {[key: string]: NoteName} = {
	"keybindA": "a",
	"keybindCUp": "u",
	"keybindCDown": "d",
	"keybindCLeft": "l",
	"keybindCRight": "r",
};

export default function SongPlayer({
	userSettings,
	isMobile,
	isInputEnabled,
	onSongCorrect,
	onSongEnd,
	audioSystem,
	audioBuffers,
	currentSongId,
}: {
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
	const currentNoteId = useRef(0);
	const currentPlayerId = useRef(0);
	const currentSongSource = useRef<AudioBufferSourceNode | null>(null);

	function addNote(note: NoteName) {
		setNotes((notes) => {
			const newNote: Note = {note: note, id: currentNoteId.current++};

			if (notes.length > 7) {
				return [...notes.slice(1), newNote];
			} else {
				return [...notes, newNote];
			}
		});
	}

	const input = useCallback(
		(note: NoteName) => {
			if (!isInputEnabled) return;
			if (currentSongId && playerState === "playing") return;

			if (playerState === "playingCanCancel") {
				currentSongSource.current?.stop();
				currentPlayerId.current++;
				setNotes([]);
				setPlayerState("notPlaying");
				onSongEnd();
			}

			addNote(note);
		},
		[currentSongId, isInputEnabled, playerState, onSongEnd]
	);

	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if (event.repeat) return;

			Object.entries(keybindsToNotes).forEach(([keybindId, note]) => {
				if (
					event.key ===
					userSettings.find((userSetting) => userSetting.id === keybindId)!.value
				) {
					input(note);
				}
			});
		}

		window.addEventListener("keydown", handleKeyDown);

		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [userSettings, input]);

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
						source.start();

						setTimeout(() => {
							setPlayerState("playingCanCancel");
						}, 1000);

						setTimeout(() => {
							if (currentPlayerId.current !== playerId) return;

							source.stop();
							setNotes([]);
							setText(<span />);
							onSongEnd();
							setPlayerState("notPlaying");
						}, audioBuffers.current[songId].duration * 1000 + 500);
					}, 1000);
				}
			}
		}
	}, [notes, onSongCorrect, audioBuffers, audioSystem, onSongEnd]);

	return (
		<div className={clsx(style["song-player"])}>
			<SongReference currentSongId={currentSongId} />
			<NoteBox className={"note-box-player"} text={text} notes={notes} />
			{isMobile && <MobileControls input={input} />}
		</div>
	);
}
