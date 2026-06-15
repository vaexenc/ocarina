import clsx from "clsx";
import Clef from "/src/images/clef.svg?react";
import {noteMap} from "/src/note-map";
import {NoteObject} from "/src/types";

const rootByVariant = {
	reference:
		"[--height:104px] p-[calc(var(--height)*0.4423)_calc(var(--height)*0.1923)_calc(var(--height)*0.23076)]",
	player: "[--height:98px] min-[650px]:[--height:120px] min-[1000px]:[--height:180px] w-[calc(100%-30px)] max-w-[410px] min-[650px]:max-w-[500px] min-[1000px]:w-full min-[1000px]:max-w-[700px] mt-[30px] mb-[30px] min-[1000px]:mt-[75px] min-[1000px]:mb-[50px] shrink-0 grow-0 p-[calc(var(--height)*0.5)_calc(var(--height)*0.1923)_calc(var(--height)*0.2)]",
};

const textContainerByVariant = {
	reference: "top-[calc(var(--height)*0.115384)] [transform:translateX(-50%)]",
	player: "top-[calc(var(--height)*0.22)] leading-[1.2] h-[calc(2.06em*1.2)] [transform:translate(-50%,-50%)]",
};

export default function NoteBox({
	className,
	variant = "reference",
	text,
	notes,
	isHighlighted,
}: {
	className?: string;
	variant?: "reference" | "player";
	text: React.JSX.Element;
	notes: NoteObject[];
	isHighlighted?: boolean;
}) {
	return (
		<div
			className={clsx(
				"relative h-(--height) isolate rounded-[calc(var(--height)*0.1923)] bg-black/72 transition-[box-shadow,outline,transform] duration-300 [outline-color:transparent]",
				rootByVariant[variant],
				className,
				isHighlighted &&
					"z-[1] animate-highlighted min-[650px]:scale-[1.03] [outline:calc(var(--height)*0.01)_solid_#3280fe]"
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
									"relative h-full w-[calc(var(--height)*0.375)] pointer-events-none",
									note.isFlashing && "animate-flashing"
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
				</div>
			</div>
		</div>
	);
}
