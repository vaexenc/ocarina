import clsx from "clsx";
import style from "./Notebox.module.less";
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
				<img className="clef" src="images/clef.svg" />
				<div className="notes">
					{notes.map((note, i) => {
						return (
							<div
								className={clsx("note-container", {
									"flashing": typeof note === "object" && note.isFlashing,
								})}
								key={typeof note === "object" ? note.id : i}
							>
								<img
									className={clsx(
										"note",
										noteMap[typeof note === "object" ? note.note : note].class
									)}
									src={noteMap[typeof note === "object" ? note.note : note].image}
								/>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
