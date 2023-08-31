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

export default function MobileControls({input}: {input: (note: NoteName) => void}) {
	return (
		<div className={style["mobile-controls"]}>
			<div className="a-container">
				<Button
					className="a"
					src={"images/buttons/a-simple.svg"}
					onPress={() => input("a")}
				/>
			</div>
			<div className="c-container">
				<Button
					className="c-up"
					src={"images/buttons/c-up-simple.svg"}
					onPress={() => input("u")}
				/>

				<div className="c-middle-buttons">
					<Button
						className="c-left"
						src={"images/buttons/c-left-simple.svg"}
						onPress={() => input("l")}
					/>
					<Button
						className="c-right"
						src={"images/buttons/c-right-simple.svg"}
						onPress={() => input("r")}
					/>
				</div>

				<Button
					className="c-down"
					src={"images/buttons/c-down-simple.svg"}
					onPress={() => input("d")}
				/>
			</div>
		</div>
	);
}
