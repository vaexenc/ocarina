import {clamp} from "@/util/math";
import {animated, useSpring} from "@react-spring/web";
import clsx from "clsx";
import {useCallback, useEffect} from "react";

const bgElemClass =
	"absolute [transform:scale(var(--scale))_translate(calc(var(--offset-x)*var(--offset-max-x)*-1),calc(var(--offset-y)*var(--offset-max-y)*-1))]";

const bgElems = [
	{
		name: "bg-sky",
		cls: "left-0 top-0 h-auto w-full [--scale:1.1] [--offset-max-x:0%] [--offset-max-y:0%]",
	},
	{
		name: "bg-mountains",
		cls: "left-0 bottom-[36%] h-auto w-full [--scale:1] [--offset-max-x:0.1%] [--offset-max-y:0%]",
	},
	{
		name: "bg-death-mountain",
		cls: "right-0 bottom-[40%] h-auto w-[46%] [--scale:1] [--offset-max-x:0.3%] [--offset-max-y:0%]",
	},
	{
		name: "bg-river-castle",
		cls: "left-0 bottom-[24%] h-auto w-full [--scale:1.03] [--offset-max-x:0.4%] [--offset-max-y:0.5%]",
	},
	{
		name: "bg-lon-lon-ranch",
		cls: "left-[7%] bottom-[24%] h-auto w-[43%] [--scale:1.075] [--offset-max-x:1.6%] [--offset-max-y:2%]",
	},
	{
		name: "bg-bottom-right",
		cls: "right-[-1%] bottom-[16%] h-auto w-[60%] [--scale:1] [--offset-max-x:1.8%] [--offset-max-y:2%]",
	},
	{
		name: "bg-bottom",
		cls: "left-0 bottom-[-1%] h-auto w-full [--scale:1.05] [--offset-max-x:2%] [--offset-max-y:3%]",
	},
];

export default function Background({isParallaxOn}: {isParallaxOn: boolean}) {
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
			if (!isParallaxOn) return;

			springs.x.start(clamp((event.clientX / window.innerWidth) * 2 - 1, -1, 1));
			springs.y.start(clamp((event.clientY / window.innerHeight) * 2 - 1, -1, 1));
		},
		[isParallaxOn, springs.x, springs.y]
	);

	useEffect(() => {
		window.addEventListener("mousemove", handleMouseMove);

		return () => {
			window.removeEventListener("mousemove", handleMouseMove);
		};
	}, [handleMouseMove]);

	return (
		<animated.div
			aria-hidden="true"
			className="fixed top-1/2 left-1/2 w-full aspect-[3408/2058] -translate-x-1/2 -translate-y-1/2 overflow-hidden pointer-events-none select-none opacity-90 z-[-10000] [@media(max-aspect-ratio:3408/2058)]:h-full [@media(max-aspect-ratio:3408/2058)]:w-auto"
			style={
				!isParallaxOn
					? ({"--offset-x": 0, "--offset-y": 0} as React.CSSProperties)
					: ({
							"--offset-x": springs.x.to((value) => value.toString()),
							"--offset-y": springs.y.to((value) => value.toString()),
						} as React.CSSProperties)
			}
		>
			{bgElems.map((elem) => (
				<img
					key={elem.name}
					alt=""
					className={clsx(bgElemClass, elem.cls)}
					src={`images/background/${elem.name}.webp`}
				/>
			))}
		</animated.div>
	);
}
