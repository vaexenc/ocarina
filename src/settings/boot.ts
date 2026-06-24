import {saveMode} from "./settings";
import {clearAll} from "./storage";

// URL params consumed once at boot, before any persisted value is read, then stripped so a refresh
// (or shared link) doesn't keep re-applying them:
//  - `?reset`:    escape hatch that wipes all persisted state.
//  - `?speedrun`: deep-link that switches to — and persists — speedrun mode.
// If both are present, the reset runs first so the speedrun mode still survives the wipe.
export function consumeBootParams() {
	const url = new URL(window.location.href);
	const doReset = url.searchParams.has("reset");
	const goSpeedrun = url.searchParams.has("speedrun");

	if (doReset) clearAll();
	if (goSpeedrun) saveMode("speedrun");

	if (doReset || goSpeedrun) {
		url.searchParams.delete("reset");
		url.searchParams.delete("speedrun");
		window.history.replaceState({}, document.title, url.href);
	}
}
