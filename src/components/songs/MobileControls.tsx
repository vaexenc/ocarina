import clsx from "clsx";
import A from "/src/images/buttons/a-simple.svg?react";
import CDown from "/src/images/buttons/c-down-simple.svg?react";
import CLeft from "/src/images/buttons/c-left-simple.svg?react";
import CRight from "/src/images/buttons/c-right-simple.svg?react";
import CUp from "/src/images/buttons/c-up-simple.svg?react";
import {NoteName, SvgComponent} from "/src/types";

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
	return (
		<Image
			className={clsx(
				"h-auto w-(--button-size) cursor-pointer rounded-[99999px] pointer-events-auto!",
				className
			)}
			onTouchStart={(e) => {
				e.preventDefault();
				onPress();
			}}
			onTouchEnd={() => {
				onRelease();
			}}
			onTouchCancel={() => {
				onRelease();
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
	return (
		<div className="flex mb-[60px] isolate [--button-size:64px] [--inward-offset:calc(var(--button-size)*-0.1)]">
			<div className="flex h-full items-end justify-end mr-[calc(var(--button-size)*-0.66)] pointer-events-none">
				<Button
					Image={A}
					onPress={() => inputPress("a")}
					onRelease={() => inputRelease("a")}
				/>
			</div>
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
