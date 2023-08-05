import {useState, useEffect, useRef, useCallback} from "react";
import {clamp} from "../../util";
import style from "./Background.module.less";

export default function Background() {
	const [isMoving /*, setIsMoving*/] = useState(true);
	const backgroundRoot = useRef<HTMLDivElement>(null);

	const handleMouseMove = useCallback(
		(event: MouseEvent) => {
			if (!isMoving) return;

			backgroundRoot.current?.style.setProperty(
				"--offset-x",
				String(clamp((event.clientX / window.innerWidth) * 2 - 1, -1, 1))
			);
			backgroundRoot.current?.style.setProperty(
				"--offset-y",
				String(clamp((event.clientY / window.innerHeight) * 2 - 1, -1, 1))
			);
		},
		[isMoving]
	);

	useEffect(() => {
		window.addEventListener("mousemove", handleMouseMove);

		return () => {
			window.removeEventListener("mousemove", handleMouseMove);
		};
	}, [handleMouseMove]);

	return (
		<>
			{/* <button
				className={style["test-button"]}
				onClick={() => {
					setIsMoving((v) => !v);
				}}
			>
				Toggle
			</button> */}
			<div
				className={style.bg}
				ref={backgroundRoot}
				style={!isMoving ? ({"--offset-x": 1, "--offset-y": 1} as React.CSSProperties) : {}}
			>
				<img className="bg-elem bg-sky" src="images/background/bg-sky.webp" />
				<img className="bg-elem bg-mountains" src="images/background/bg-mountains.webp" />
				<img
					className="bg-elem bg-death-mountain"
					src="images/background/bg-death-mountain.webp"
				/>
				<img
					className="bg-elem bg-river-castle"
					src="images/background/bg-river-castle.webp"
				/>
				<img
					className="bg-elem bg-lon-lon-ranch"
					src="images/background/bg-lon-lon-ranch.webp"
				/>
				<img
					className="bg-elem bg-bottom-right"
					src="images/background/bg-bottom-right.webp"
				/>
				<img className="bg-elem bg-bottom" src="images/background/bg-bottom.webp" />
			</div>
		</>
	);
}
