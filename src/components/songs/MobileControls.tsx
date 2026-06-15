import clsx from "clsx";
import style from "./MobileControls.module.scss";
import A from "/src/images/buttons/a.svg?react";
import CUp from "/src/images/buttons/c-up.svg?react";
import CDown from "/src/images/buttons/c-down.svg?react";
import CLeft from "/src/images/buttons/c-left.svg?react";
import CRight from "/src/images/buttons/c-right.svg?react";
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
			className={clsx("button", className)}
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
		<div className={style["mobile-controls"]}>
			<div className="a-container">
				<Button
					className="a"
					Image={A}
					onPress={() => inputPress("a")}
					onRelease={() => inputRelease("a")}
				/>
			</div>
			<div className="c-container">
				<Button
					className="c-up"
					Image={CUp}
					onPress={() => inputPress("u")}
					onRelease={() => inputRelease("u")}
				/>

				<div className="c-middle-buttons">
					<Button
						className="c-left"
						Image={CLeft}
						onPress={() => inputPress("l")}
						onRelease={() => inputRelease("l")}
					/>
					<Button
						className="c-right"
						Image={CRight}
						onPress={() => inputPress("r")}
						onRelease={() => inputRelease("r")}
					/>
				</div>

				<Button
					className="c-down"
					Image={CDown}
					onPress={() => inputPress("d")}
					onRelease={() => inputRelease("d")}
				/>
			</div>
		</div>
	);
}
