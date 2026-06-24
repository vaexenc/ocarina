import {SongId, songSlots} from "@/data/song-data";
import clsx from "clsx";
import GameLogo from "./GameLogo";
import SongCard from "./SongCard";

// Speedrun layout: the game logos in one row, then a single grid. `songIds` is the run's deduped
// song list (computed once in the speedrun logic layer), so songs shared between OoT and MM appear
// only once and the categories run together with no gap.
export default function SpeedrunSongList({
	gameIds,
	songIds,
	currentSongId,
	playedSongIds,
}: {
	gameIds: (keyof typeof songSlots)[];
	// The run's song ids, already deduped across sections — see speedrunSongIds in speedrun/logic.
	songIds: SongId[];
	currentSongId: SongId | null;
	playedSongIds?: Set<SongId>;
}) {
	// Only the combined OoT+MM set ("both") spans two sections and has enough songs to fill a third
	// column; a single-game set stays at two columns so its cards don't get cramped.
	const isCombinedSet = gameIds.length > 1;

	return (
		<>
			<div className="mb-[10px] flex h-9 items-center justify-center gap-3 pointer-events-none lg:mb-[15px] lg:h-12">
				{gameIds.map((gameId) => (
					<GameLogo key={gameId} gameId={gameId} size="compact" />
				))}
			</div>

			<div
				className={clsx(
					"mx-auto grid w-full max-w-sm sm:max-w-3xl grid-cols-1 gap-1.5 sm:grid-cols-2",
					isCombinedSet && "lg:max-w-6xl lg:grid-cols-3"
				)}
			>
				{songIds.map((songId) => (
					<SongCard
						key={songId}
						songId={songId}
						variant="speedrun"
						className="w-full"
						isHighlighted={songId === currentSongId}
						isPlayed={playedSongIds?.has(songId) ?? false}
					/>
				))}
			</div>
		</>
	);
}
