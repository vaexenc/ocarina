import {SongId, songSlots} from "@/data/song-data";
import {SpeedrunSet} from "@/modes";

// Which sheet sections (and thus which song slots) each set covers. "both" shows both
// sections; songs that appear in both are simply listed under each, and completing one such song
// marks every slot that shares its id (see {@link isSpeedrunComplete}).
const setSections: Record<SpeedrunSet, (keyof typeof songSlots)[]> = {
	oot: ["oot"],
	mm: ["mm"],
	both: ["oot", "mm"],
};

export function speedrunSections(set: SpeedrunSet): (keyof typeof songSlots)[] {
	return setSections[set];
}

// The unique song ids that must be played to complete a run of the given set. Deduped, so a song
// shared between OoT and MM only has to be played once.
export function speedrunSongIds(set: SpeedrunSet): SongId[] {
	const ids = new Set<SongId>();
	for (const section of setSections[set]) {
		for (const id of songSlots[section].songIds) ids.add(id);
	}
	return [...ids];
}

export function isSpeedrunComplete(set: SpeedrunSet, playedSongIds: Set<SongId>): boolean {
	return speedrunSongIds(set).every((id) => playedSongIds.has(id));
}

// mm:ss.cs — the centisecond precision speedruns are conventionally shown at.
export function formatSpeedrunTime(ms: number): string {
	const totalCs = Math.floor(ms / 10);
	const cs = totalCs % 100;
	const totalSeconds = Math.floor(totalCs / 100);
	const seconds = totalSeconds % 60;
	const minutes = Math.floor(totalSeconds / 60);
	const pad = (n: number) => n.toString().padStart(2, "0");
	return `${pad(minutes)}:${pad(seconds)}.${pad(cs)}`;
}
