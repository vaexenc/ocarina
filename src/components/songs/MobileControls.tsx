import clsx from "clsx";
import style from "./MobileControls.module.less";
import {NoteName} from "/src/types";

function Button({className, src, onPress}: {className?: string; src: string; onPress: () => void}) {
	return (
		<img
			className={clsx("button", className)}
			src={src}
			onMouseDown={(e) => {
				e.preventDefault();
				onPress();
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

export default function MobileControls({addNote}: {addNote: (note: NoteName) => void}) {
	return (
		<div className={style["mobile-controls"]}>
			<div className="a-container">
				<Button
					className="a"
					src={"images/buttons/a-simple.svg"}
					onPress={() => addNote("a")}
				/>
			</div>
			<div className="c-container">
				<Button
					className="c-up"
					src={"images/buttons/c-up-simple.svg"}
					onPress={() => addNote("u")}
				/>

				<div className="c-middle-buttons">
					<Button
						className="c-left"
						src={"images/buttons/c-left-simple.svg"}
						onPress={() => addNote("l")}
					/>
					<Button
						className="c-right"
						src={"images/buttons/c-right-simple.svg"}
						onPress={() => addNote("r")}
					/>
				</div>

				<Button
					className="c-down"
					src={"images/buttons/c-down-simple.svg"}
					onPress={() => addNote("d")}
				/>
			</div>
		</div>
	);
}
