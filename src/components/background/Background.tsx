import clsx from "clsx";
import {useCallback, useEffect, useRef} from "react";
import style from "./Background.module.less";
import {clamp} from "/src/util/util";

export default function Background({
	isParallaxOn,
	doesParallaxUpdate,
}: {
	isParallaxOn: boolean;
	doesParallaxUpdate: boolean;
}) {
	const backgroundRoot = useRef<HTMLDivElement>(null);

	const handleMouseMove = useCallback(
		(event: MouseEvent) => {
			if (!isParallaxOn || !doesParallaxUpdate) return;

			backgroundRoot.current?.style.setProperty(
				"--offset-x",
				String(clamp((event.clientX / window.innerWidth) * 2 - 1, -1, 1))
			);
			backgroundRoot.current?.style.setProperty(
				"--offset-y",
				String(clamp((event.clientY / window.innerHeight) * 2 - 1, -1, 1))
			);
		},
		[isParallaxOn, doesParallaxUpdate]
	);

	useEffect(() => {
		window.addEventListener("mousemove", handleMouseMove);

		return () => {
			window.removeEventListener("mousemove", handleMouseMove);
		};
	}, [handleMouseMove]);

	return (
		<>
			<div
				className={clsx(style.bg, {[style["no-parallax"]]: !isParallaxOn})}
				ref={backgroundRoot}
				style={
					!isParallaxOn ? ({"--offset-x": 0, "--offset-y": 0} as React.CSSProperties) : {}
				}
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
