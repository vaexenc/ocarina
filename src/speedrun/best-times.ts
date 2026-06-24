import {SpeedrunSet} from "@/modes";
import {loadJson, saveJson} from "@/settings/storage";

const BEST_TIME_KEY = "speedrunBestTimes";

type BestTimes = Partial<Record<SpeedrunSet, number>>;

function loadBestTimes(): BestTimes {
	return loadJson<BestTimes>(BEST_TIME_KEY, {});
}

export function loadBestTime(set: SpeedrunSet): number | null {
	return loadBestTimes()[set] ?? null;
}

// Persists `ms` as the set's best only if it beats the stored time, returning the resulting best.
export function saveBestTime(set: SpeedrunSet, ms: number): number {
	const times = loadBestTimes();
	const previous = times[set];
	if (previous === undefined || ms < previous) {
		times[set] = ms;
		saveJson(BEST_TIME_KEY, times);
		return ms;
	}
	return previous;
}
