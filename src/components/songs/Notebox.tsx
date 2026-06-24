import {NoteObject} from "@/data/song-data";
import Clef from "@/images/clef.svg?react";
import clsx from "clsx";
import {noteMap} from "./note-map";
import {maxVisibleNotes} from "./use-ocarina-playback";

const noteSlotWidth = "w-[calc(var(--height)*0.375)]";

const rootByVariant = {
	sheet: "p-[calc(var(--height)*0.4423)_calc(var(--height)*0.1923)_calc(var(--height)*0.23076)]",
	player: "[--height:98px] sm:[--height:120px] w-[calc(100%-30px)] max-w-sm sm:max-w-lg shrink-0 grow-0 p-[calc(var(--height)*0.5)_calc(var(--height)*0.1923)_calc(var(--height)*0.2)]",
};

// --height drives every internal dimension. Mobile controls take the bottom of the screen, so the
// sheet cards shrink to claw back vertical space; the player box is capped at tablet size instead
// (it never gets the desktop scale-up).
const sheetHeightClass = (isTouch?: boolean) => (isTouch ? "[--height:84px]" : "[--height:104px]");
const playerDesktopClass = "lg:[--height:180px] lg:w-full lg:max-w-2xl";

const textContainerByVariant = {
	sheet: "top-[calc(var(--height)*0.115384)] [transform:translateX(-50%)]",
	player: "top-[calc(var(--height)*0.22)] leading-[1.2] h-[calc(2.06em*1.2)] [transform:translate(-50%,-50%)]",
};

// Per-note state styling shared by every layout. Bent notes are excluded from song matching, so
// they're dimmed; the notes of a just-matched song flash.
function noteStateClass(note: NoteObject): string {
	return clsx(note.isFlashing && "animate-flashing", note.isBent && "opacity-60");
}

type NoteBoxProps = {
	className?: string;
	variant?: "sheet" | "player" | "speedrun";
	text: React.JSX.Element;
	notes: NoteObject[];
	isHighlighted?: boolean;
	// Speedrun: this song has already been completed in the current run.
	isPlayed?: boolean;
	// Mobile controls present: shrinks the sheet cards and caps the player box at tablet size.
	isTouch?: boolean;
};

// Speedrun uses a compact flow layout: auto height, nothing absolutely positioned, the buttons in
// one tight row beside the name.
function SpeedrunNoteBox({
	className,
	text,
	notes,
	isHighlighted,
	isPlayed,
}: Omit<NoteBoxProps, "variant">) {
	return (
		<div
			className={clsx(
				"flex flex-row-reverse items-center justify-between gap-[10px] rounded-[12px] bg-black/72 px-[12px] py-[8px] transition-[box-shadow,outline,opacity,transform] duration-300 [outline-color:transparent]",
				className,
				isHighlighted && "z-[1] animate-highlighted [outline:1px_solid_#3280fe]",
				isPlayed && "opacity-40"
			)}
		>
			<div className="flex items-center gap-[6px] text-right text-[13px] [text-shadow:0.075em_0.075em_0.2em_rgba(0,0,0,0.5)]">
				{text}
			</div>
			<div className="flex items-center gap-[5px]">
				{notes.map((note) => {
					const {Image} = noteMap[note.note];
					return (
						<Image
							key={note.id}
							className={clsx(
								"h-[20px] w-auto pointer-events-none [filter:drop-shadow(1px_1px_1px_rgba(0,0,0,0.15))]",
								noteStateClass(note)
							)}
						/>
					);
				})}
			</div>
		</div>
	);
}

// The staff-based layout used by the song-sheet cards and the main player box: a music staff with
// the notes positioned vertically by pitch and the song name overlaid.
function StaffNoteBox({
	className,
	variant,
	text,
	notes,
	isHighlighted,
	isTouch,
}: Omit<NoteBoxProps, "variant"> & {variant: "sheet" | "player"}) {
	return (
		<div
			className={clsx(
				"relative h-(--height) isolate rounded-[calc(var(--height)*0.1923)] bg-black/72 transition-[box-shadow,outline,transform] duration-300 [outline-color:transparent]",
				rootByVariant[variant],
				variant === "sheet" && sheetHeightClass(isTouch),
				variant === "player" && !isTouch && playerDesktopClass,
				className,
				isHighlighted &&
					"z-[1] animate-highlighted sm:scale-[1.03] [outline:calc(var(--height)*0.01)_solid_#3280fe]"
			)}
		>
			<div
				className={clsx(
					"absolute left-1/2 z-[1] flex w-full items-center justify-center px-[1em] text-center text-[calc(var(--height)*0.153846)] [text-shadow:0.075em_0.075em_0.2em_rgba(0,0,0,0.5)]",
					textContainerByVariant[variant]
				)}
			>
				<div className={clsx(variant === "player" && "line-clamp-2")}>{text}</div>
			</div>
			<div className="relative h-full w-full">
				<div>
					<div className="absolute top-0 h-[calc(var(--height)*0.01923)] w-full bg-[#9b180b]" />
					<div className="absolute top-[33%] h-[calc(var(--height)*0.01923)] w-full bg-[#9b180b] [transform:translateY(-50%)]" />
					<div className="absolute top-[66%] h-[calc(var(--height)*0.01923)] w-full bg-[#9b180b] [transform:translateY(-50%)]" />
					<div className="absolute bottom-0 h-[calc(var(--height)*0.01923)] w-full bg-[#9b180b]" />
				</div>
				<Clef className="absolute top-0 left-[calc(var(--height)*0.076923)] h-[138%] w-auto pointer-events-none [transform:translate(0%,-14.1%)]" />
				<div className="flex h-full pl-[calc(var(--height)*0.4326923)]">
					{notes.map((note) => {
						const {class: noteClass, Image} = noteMap[note.note];
						return (
							<div
								className={clsx(
									"relative h-full pointer-events-none",
									noteSlotWidth,
									noteStateClass(note)
								)}
								key={note.id}
							>
								<Image
									className={clsx(
										"absolute h-auto w-[calc(var(--height)*0.26923)] [transform:translateY(-50%)] [filter:drop-shadow(calc(var(--height)*0.01923)_calc(var(--height)*0.01923)_calc(var(--height)*0.01923)_rgba(0,0,0,0.15))]",
										noteClass,
										variant === "player" && "opacity-0 animate-note-add"
									)}
								/>
							</div>
						);
					})}
					{/* The player always reserves every note slot so the per-slot width — and the gap
					    between notes — is fixed by the max count, not the current one. Otherwise the
					    last note that no longer fits at natural width would shrink every slot, nudging
					    all the notes closer together (a layout shift). */}
					{variant === "player" &&
						Array.from(
							{length: Math.max(0, maxVisibleNotes - notes.length)},
							(_, i) => (
								<div key={`slot-${i}`} className={clsx("h-full", noteSlotWidth)} />
							)
						)}
				</div>
			</div>
		</div>
	);
}

export default function NoteBox({variant = "sheet", ...props}: NoteBoxProps) {
	return variant === "speedrun" ? (
		<SpeedrunNoteBox {...props} />
	) : (
		<StaffNoteBox variant={variant} {...props} />
	);
}
