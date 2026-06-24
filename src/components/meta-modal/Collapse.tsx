import IconChevronDown from "@/images/icons/chevron-down.svg?react";
import clsx from "clsx";
import {useEffect, useState} from "react";
import {settingClass} from "./styles";

// A collapsible group of settings whose open/closed state is owned by the caller, so it survives
// the modal being closed and reopened.
export default function Collapse({
	title,
	isOpen,
	onToggle,
	hidden,
	children,
}: {
	title: string;
	isOpen: boolean;
	onToggle: () => void;
	hidden?: boolean;
	children: React.ReactNode;
}) {
	// The body clips its content while expanding/collapsing so the animation looks clean. Once
	// fully open we reveal overflow so the keybind buttons' focus/active outlines aren't cut off at
	// the edges. Resetting on close re-arms the clip for the next open animation.
	const [revealed, setRevealed] = useState(isOpen);
	useEffect(() => {
		if (!isOpen) setRevealed(false);
	}, [isOpen]);

	return (
		<div className={clsx({hidden})}>
			<button
				className={clsx(settingClass, "cursor-pointer")}
				onClick={onToggle}
				aria-expanded={isOpen}
			>
				<div className="mr-[1.5em]">{title}</div>
				<IconChevronDown
					className={clsx(
						"h-[0.6em] w-auto transition-transform duration-300",
						isOpen && "rotate-180"
					)}
				/>
			</button>
			<div
				className={clsx(
					"grid transition-[grid-template-rows] duration-300",
					isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
				)}
				onTransitionEnd={(e) => {
					if (e.target === e.currentTarget && isOpen) setRevealed(true);
				}}
			>
				<div className={isOpen && revealed ? "overflow-visible" : "overflow-hidden"}>
					{children}
				</div>
			</div>
		</div>
	);
}
