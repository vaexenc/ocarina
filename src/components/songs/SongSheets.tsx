import {SongId, songSlots} from "@/data/song-data";
import clsx from "clsx";
import SongList from "./SongList";
import SpeedrunSongList from "./SpeedrunSongList";
import {useScrollEdgeMask} from "./use-scroll-edge-mask";

export default function SongSheets({
	currentSongId,
	sections,
	songIds,
	playedSongIds,
	isSpeedrun,
	isTouch,
}: {
	currentSongId: SongId | null;
	// Which game sections to show. Omitted means all of them (the normal Song mode view).
	sections?: (keyof typeof songSlots)[];
	// The run's deduped song ids (Speedrun mode), computed once in the speedrun logic layer.
	songIds?: SongId[];
	// When provided (Speedrun mode), songs in this set are marked as already played this run.
	playedSongIds?: Set<SongId>;
	// Speedrun mode: merge the sections into one logo row + a single deduped two-column grid.
	isSpeedrun?: boolean;
	// Mobile controls present: shrinks the song-sheet cards to free up vertical space.
	isTouch?: boolean;
}) {
	// Re-measure the scroll edges whenever the visible sections change (the scrollbar can appear or
	// disappear, which changes whether the edges should be softened).
	const sectionsKey = sections?.join(",") ?? "all";
	const {ref, maskClass} = useScrollEdgeMask(sectionsKey);

	const allGameIds = Object.keys(songSlots) as (keyof typeof songSlots)[];
	const gameIds = allGameIds.filter((gameId) => !sections || sections.includes(gameId));

	return (
		<div
			ref={ref}
			// The cards aren't interactive, so without a tabstop a keyboard user can't scroll the
			// overflowing list. tabIndex + a label make it a focusable, announced scroll region.
			tabIndex={0}
			role="region"
			aria-label="Song list"
			className={clsx(
				// This region is focusable only so keyboard users can scroll it; suppress the focus
				// ring since the scroll position itself is the feedback and the cards aren't tabstops.
				"w-full min-h-0 grow self-start overflow-auto px-4 pt-0 pb-2.5 focus-visible:outline-none lg:self-auto",
				// Speedrun mode sits right below the in-flow timer, so it needs a tighter top gap.
				isSpeedrun ? "mt-3" : "mt-10 max-w-6xl lg:mt-4 lg:w-4/5",
				maskClass
			)}
		>
			{isSpeedrun ? (
				<SpeedrunSongList
					gameIds={gameIds}
					songIds={songIds ?? []}
					currentSongId={currentSongId}
					playedSongIds={playedSongIds}
				/>
			) : (
				<SongList
					gameIds={gameIds}
					currentSongId={currentSongId}
					playedSongIds={playedSongIds}
					isTouch={isTouch}
				/>
			)}
		</div>
	);
}
