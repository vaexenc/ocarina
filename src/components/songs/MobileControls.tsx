import {NoteName} from "@/data/song-data";
import A from "@/images/buttons/a-simple.svg?react";
import CDown from "@/images/buttons/c-down-simple.svg?react";
import CLeft from "@/images/buttons/c-left-simple.svg?react";
import CRight from "@/images/buttons/c-right-simple.svg?react";
import CUp from "@/images/buttons/c-up-simple.svg?react";
import {SvgComponent} from "@/util/svg";
import clsx from "clsx";
import {useState} from "react";

function Button({
	className,
	Image,
	onPress,
	onRelease,
}: {
	className?: string;
	Image: SvgComponent;
	onPress: () => void;
	onRelease: () => void;
}) {
	const [isPressed, setIsPressed] = useState(false);

	const press = () => {
		setIsPressed(true);
		// Optional haptic confirmation; unsupported on iOS Safari, hence the guard.
		if ("vibrate" in navigator) {
			navigator.vibrate(10);
		}
		onPress();
	};

	const release = () => {
		setIsPressed(false);
		onRelease();
	};

	return (
		<Image
			className={clsx(
				"h-auto w-(--button-size) cursor-pointer rounded-[99999px] pointer-events-auto! transition-[transform,filter] duration-75",
				isPressed && "scale-90 brightness-125",
				className
			)}
			onTouchStart={(e) => {
				e.preventDefault();
				press();
			}}
			onTouchEnd={() => {
				release();
			}}
			onTouchCancel={() => {
				release();
			}}
			onContextMenu={(e) => {
				e.preventDefault();
				e.stopPropagation();
				return false;
			}}
		/>
	);
}

export default function MobileControls({
	inputPress,
	inputRelease,
}: {
	inputPress: (note: NoteName) => void;
	inputRelease: (note: NoteName) => void;
}) {
	// The A button bottom-aligns against the C-pad via `items-end` on the row — so it no longer
	// needs a full-height wrapper (the old `h-full` only resolved when an ancestor had a definite
	// height). It's tucked under the pad's lower-left with the negative right margin, and the pad's
	// `mb` keeps it sitting slightly below C-down. The C-pad is a self-contained flex column whose
	// diamond comes entirely from the buttons' own margins (`--inward-offset`).
	return (
		<div className="flex items-end mb-[calc(env(safe-area-inset-bottom)+30px)] isolate [--button-size:54px] [--inward-offset:calc(var(--button-size)*-0.1)]">
			<Button
				className="mr-[calc(var(--button-size)*-0.66)]"
				Image={A}
				onPress={() => inputPress("a")}
				onRelease={() => inputRelease("a")}
			/>
			<div className="flex flex-col items-center justify-center mb-[calc(var(--button-size)*0.33)] pointer-events-none">
				<Button
					Image={CUp}
					onPress={() => inputPress("u")}
					onRelease={() => inputRelease("u")}
				/>

				<div className="flex items-center justify-center my-(--inward-offset)">
					<Button
						className="mr-(--inward-offset)"
						Image={CLeft}
						onPress={() => inputPress("l")}
						onRelease={() => inputRelease("l")}
					/>
					<Button
						className="ml-[calc(var(--button-size)+var(--inward-offset)*0.25)]"
						Image={CRight}
						onPress={() => inputPress("r")}
						onRelease={() => inputRelease("r")}
					/>
				</div>

				<Button
					Image={CDown}
					onPress={() => inputPress("d")}
					onRelease={() => inputRelease("d")}
				/>
			</div>
		</div>
	);
}
