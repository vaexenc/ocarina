import {animated, useSpring} from "@react-spring/web";
import {useCallback, useEffect} from "react";
import style from "./Background.module.scss";
import {clamp} from "/src/util/util";

export default function Background({
	isParallaxOn,
	doesParallaxUpdate,
}: {
	isParallaxOn: boolean;
	doesParallaxUpdate: boolean;
}) {
	const [springs] = useSpring(
		() => ({
			x: 0,
			y: 0,
			config: {
				mass: 1,
				friction: 50,
				tension: 100,
			},
		}),
		[]
	);

	const handleMouseMove = useCallback(
		(event: MouseEvent) => {
			if (!isParallaxOn || !doesParallaxUpdate) return;

			springs.x.start(clamp((event.clientX / window.innerWidth) * 2 - 1, -1, 1));
			springs.y.start(clamp((event.clientY / window.innerHeight) * 2 - 1, -1, 1));
		},
		[isParallaxOn, doesParallaxUpdate, springs.x, springs.y]
	);

	useEffect(() => {
		window.addEventListener("mousemove", handleMouseMove);

		return () => {
			window.removeEventListener("mousemove", handleMouseMove);
		};
	}, [handleMouseMove]);

	return (
		<animated.div
			className={style.bg}
			style={
				!isParallaxOn
					? ({"--offset-x": 0, "--offset-y": 0} as React.CSSProperties)
					: ({
							"--offset-x": springs.x.to((value) => value.toString()),
							"--offset-y": springs.y.to((value) => value.toString()),
							// eslint-disable-next-line no-mixed-spaces-and-tabs
					  } as React.CSSProperties)
			}
		>
			<img className="bg-elem bg-sky" src="images/background/bg-sky.webp" />
			<img className="bg-elem bg-mountains" src="images/background/bg-mountains.webp" />
			<img
				className="bg-elem bg-death-mountain"
				src="images/background/bg-death-mountain.webp"
			/>
			<img className="bg-elem bg-river-castle" src="images/background/bg-river-castle.webp" />
			<img
				className="bg-elem bg-lon-lon-ranch"
				src="images/background/bg-lon-lon-ranch.webp"
			/>
			<img className="bg-elem bg-bottom-right" src="images/background/bg-bottom-right.webp" />
			<img className="bg-elem bg-bottom" src="images/background/bg-bottom.webp" />
		</animated.div>
	);
}
