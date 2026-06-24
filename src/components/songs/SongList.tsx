import {SongId, songSlots} from "@/data/song-data";
import clsx from "clsx";
import React from "react";
import GameLogo from "./GameLogo";
import SongCard from "./SongCard";

// Song-mode layout: each game gets its own centered logo header and wrapped grid of songs.
export default function SongList({
	gameIds,
	currentSongId,
	playedSongIds,
	isTouch,
}: {
	gameIds: (keyof typeof songSlots)[];
	currentSongId: SongId | null;
	playedSongIds?: Set<SongId>;
	isTouch?: boolean;
}) {
	return (
		<>
			{gameIds.map((gameId, i) => (
				<React.Fragment key={gameId}>
					<div
						className={clsx(
							"mb-[10px] pointer-events-none lg:mb-[15px]",
							i > 0 && "mt-[50px]"
						)}
					>
						<GameLogo gameId={gameId} className="mx-auto" />
					</div>

					<div className="flex flex-wrap justify-center gap-[10px]">
						{songSlots[gameId].songIds.map((songId) => (
							<SongCard
								key={songId}
								songId={songId}
								variant="sheet"
								className="w-full max-w-sm sm:w-[calc(50%-5px)] xl:w-[calc(33%-5px)]"
								isHighlighted={songId === currentSongId}
								isPlayed={playedSongIds?.has(songId) ?? false}
								isTouch={isTouch}
							/>
						))}
					</div>
				</React.Fragment>
			))}
		</>
	);
}
