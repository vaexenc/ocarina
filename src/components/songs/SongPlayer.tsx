import SongReference from "./SongReference";
import clsx from "clsx";
import style from "./SongPlayer.module.less";
import NoteBox from "./Notebox";
import {useEffect, useRef, useState} from "react";
import {Note, NoteName, Sounds} from "/src/types";
import {UserSettings} from "/src/types";
import MobileControls from "./MobileControls";

const keybindsToNotes: {[key: string]: NoteName} = {
	"keybindA": "a",
	"keybindCUp": "u",
	"keybindCDown": "d",
	"keybindCLeft": "l",
	"keybindCRight": "r",
};

export default function SongPlayer({
	userSettings,
	sounds,
	isMobile,
}: {
	userSettings: UserSettings;
	sounds: Sounds;
	isMobile: boolean;
}) {
	const [notes, setNotes] = useState<Note[]>([]);
	const noteId = useRef(0);

	sounds; // REMOVE //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

	function addNote(note: NoteName) {
		setNotes((notes) => {
			const newNote: Note = {note: note, id: ++noteId.current};

			if (notes.length > 7) {
				return [...notes.slice(1), newNote];
			} else {
				return [...notes, newNote];
			}
		});
	}

	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if (event.repeat) return;

			Object.entries(keybindsToNotes).forEach(([keybindId, note]) => {
				if (
					event.key ===
					userSettings.find((userSetting) => userSetting.id === keybindId)!.value
				) {
					addNote(note);
				}
			});
		}

		window.addEventListener("keydown", handleKeyDown);

		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [userSettings]);

	return (
		<div className={clsx(style["song-player"])}>
			<SongReference />
			<NoteBox
				className={"note-box-player"}
				text={
					<span>
						You played the <span>Inverted Song of Time</span>. {/**/}
						You played the <span>Inverted Song of Time</span>. {/**/}
						You played the <span>Inverted Song of Time</span>. {/**/}
						You played the <span>Inverted Song of Time</span>. {/**/}
						You played the <span>Inverted Song of Time</span>.
					</span>
				}
				notes={notes}
			/>
			{isMobile && <MobileControls addNote={addNote} />}
		</div>
	);
}
