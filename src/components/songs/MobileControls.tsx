import clsx from "clsx";
import style from "./MobileControls.module.less";
import {NoteName} from "/src/types";

function Button({
	className,
	src,
	onPress,
	onRelease,
}: {
	className?: string;
	src: string;
	onPress: () => void;
	onRelease: () => void;
}) {
	return (
		<img
			className={clsx("button", className)}
			src={src}
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
			draggable="false"
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
					src={"images/buttons/a-simple.svg"}
					onPress={() => inputPress("a")}
					onRelease={() => inputRelease("a")}
				/>
			</div>
			<div className="c-container">
				<Button
					className="c-up"
					src={"images/buttons/c-up-simple.svg"}
					onPress={() => inputPress("u")}
					onRelease={() => inputRelease("u")}
				/>

				<div className="c-middle-buttons">
					<Button
						className="c-left"
						src={"images/buttons/c-left-simple.svg"}
						onPress={() => inputPress("l")}
						onRelease={() => inputRelease("l")}
					/>
					<Button
						className="c-right"
						src={"images/buttons/c-right-simple.svg"}
						onPress={() => inputPress("r")}
						onRelease={() => inputRelease("r")}
					/>
				</div>

				<Button
					className="c-down"
					src={"images/buttons/c-down-simple.svg"}
					onPress={() => inputPress("d")}
					onRelease={() => inputRelease("d")}
				/>
			</div>
		</div>
	);
}
