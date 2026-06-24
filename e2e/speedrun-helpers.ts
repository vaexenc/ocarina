import {expect, type Page} from "@playwright/test";
import {NoteName, SongId, songs, songSlots} from "../src/data/song-data";

// Speedrun-specific e2e helpers. The generic boot/switcher helpers live in `helpers.ts`; this file
// adds what only the speedrun specs need — driving note input and locating the HUD.

type SpeedrunSet = "oot" | "mm" | "both";

// The default keybinds (setting-fields.ts) that the playback engine listens for, by note. Pressing
// these via Playwright dispatches real key events that bubble to the window-level handler.
const noteToKey: Record<NoteName, string> = {
	a: "a",
	u: "ArrowUp",
	d: "ArrowDown",
	l: "ArrowLeft",
	r: "ArrowRight",
};

// Which sheet sections a set covers, mirroring `speedrunSections` in src/speedrun/logic.ts (which
// can't be imported here as it uses `@/` alias imports).
const setSections: Record<SpeedrunSet, (keyof typeof songSlots)[]> = {
	oot: ["oot"],
	mm: ["mm"],
	both: ["oot", "mm"],
};

/** The unique song ids needed to complete a set, deduped in section order (mirrors logic.ts). */
export function speedrunSongIds(set: SpeedrunSet): SongId[] {
	const ids = new Set<SongId>();
	for (const section of setSections[set]) {
		for (const id of songSlots[section].songIds) ids.add(id);
	}
	return [...ids];
}

/** The total number of songs in a set — i.e. the HUD's progress denominator. */
export function speedrunSetSize(set: SpeedrunSet): number {
	return speedrunSongIds(set).length;
}

/** Plays a single song by pressing its note keys in order. */
export async function playSong(page: Page, songId: SongId): Promise<void> {
	for (const note of songs[songId].notes) {
		await page.keyboard.press(noteToKey[note]);
	}
}

/** Plays every song required to complete a set, finishing the run. */
export async function playSet(page: Page, set: SpeedrunSet): Promise<void> {
	for (const id of speedrunSongIds(set)) {
		await playSong(page, id);
	}
}

/** The speedrun set/category selector button (aria-label "Category: <label>. ..."). */
export function category(page: Page) {
	return page.getByRole("button", {name: /^Category:/});
}

// The live timer span shows exactly "mm:ss.cs". The anchored regex excludes the "Best: mm:ss.cs"
// line, whose text node also contains a time.
export function timer(page: Page) {
	return page.getByText(/^\d\d:\d\d\.\d\d$/);
}

/** The completion progress counter, shown as "NN/NN" while a run is in progress. */
export function progress(page: Page) {
	return page.getByText(/^\d{2}\/\d{2}$/);
}

/** The "Best: —" / "Best: mm:ss.cs" line. */
export function bestTime(page: Page) {
	return page.getByText(/^Best:/);
}

// The reset button. Its accessible name is "Reset run" or, once armed, "Confirm reset run"; the
// case-insensitive substring matches both states.
export function resetButton(page: Page) {
	return page.getByRole("button", {name: /reset run/i});
}

/**
 * Seeds a stored best time for `set` and selects that set, so the next completed run reports New
 * Record / Complete deterministically rather than depending on the actual run duration. Must run
 * after a `?reset` boot (which wipes storage); the category click makes `useSpeedrun` re-read the
 * seeded best for the now-active set.
 */
export async function seedBestTime(page: Page, set: SpeedrunSet, ms: number): Promise<void> {
	await page.evaluate(
		({set, ms}) => {
			localStorage.setItem("ocarina.speedrunBestTimes", JSON.stringify({[set]: ms}));
		},
		{set, ms}
	);
	// After a `?reset` boot the selector starts at "both"; cycle it to the target set (order is
	// both → oot → mm) so useSpeedrun re-reads the seeded best for the now-active set.
	const clicksToReach: Record<SpeedrunSet, number> = {both: 0, oot: 1, mm: 2};
	for (let clicks = clicksToReach[set]; clicks > 0; clicks--) {
		await category(page).click();
	}
	await expect(category(page)).toHaveText({oot: "OoT", mm: "MM", both: "OoT+MM"}[set]);
}
