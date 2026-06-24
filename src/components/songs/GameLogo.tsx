import {songSlots} from "@/data/song-data";
import clsx from "clsx";

// The game's title logo, sized per game. Speedrun mode uses the smaller "compact" size.
export default function GameLogo({
	gameId,
	size = "default",
	className,
}: {
	gameId: keyof typeof songSlots;
	size?: "default" | "compact";
	className?: string;
}) {
	return (
		<img
			alt={songSlots[gameId].title}
			className={clsx(
				"w-auto",
				size === "default" && gameId === "oot" && "h-12 lg:h-16",
				size === "default" && gameId === "mm" && "h-9 lg:h-12",
				size === "compact" && gameId === "oot" && "h-9 lg:h-12",
				size === "compact" && gameId === "mm" && "h-7 lg:h-9",
				className
			)}
			src={songSlots[gameId].image}
		/>
	);
}
