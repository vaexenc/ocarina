import clsx from "clsx";
import style from "./Notebox.module.scss";
import Clef from "/src/images/clef.svg?react";
import {noteMap} from "/src/song-data";
import {Note} from "/src/types";

export default function NoteBox({
	className,
	text,
	notes,
	isHighlighted,
}: {
	className?: string;
	text: JSX.Element;
	notes: Note[];
	isHighlighted?: boolean;
}) {
	return (
		<div
			className={clsx(style["note-box"], "note-box", className, {
				[style["note-box--highlighted"]]: isHighlighted,
			})}
		>
			<div className="text-container">
				<div className="text">{text}</div>
			</div>
			<div className="inner">
				<div className="lines">
					<div className="line" />
					<div className="line" />
					<div className="line" />
					<div className="line" />
				</div>
				<Clef className="clef" />
				<div className="notes">
					{notes.map((note, i) => {
						const {class: noteClass, Image} =
							noteMap[typeof note === "object" ? note.note : note];
						return (
							<div
								className={clsx("note-container", {
									"flashing": typeof note === "object" && note.isFlashing,
								})}
								key={typeof note === "object" ? note.id : i}
							>
								<Image className={clsx("note", noteClass)} />
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
