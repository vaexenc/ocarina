import {defaultSettingValues} from "./setting-fields";
import {SettingValues} from "/src/types";

const STORAGE_KEY = "ocarina.userSettings";
const HAS_PLAYED_KEY = "ocarina.hasPlayedBefore";

export function saveSettings(values: SettingValues) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
}

export function loadSettings(): SettingValues {
	const raw = localStorage.getItem(STORAGE_KEY);
	if (!raw) return defaultSettingValues;
	try {
		return {...defaultSettingValues, ...(JSON.parse(raw) as Partial<SettingValues>)};
	} catch {
		// Corrupt/incompatible stored value — fall back to defaults rather than crash on boot.
		return defaultSettingValues;
	}
}

export function deleteSettings() {
	localStorage.removeItem(STORAGE_KEY);
}

export function loadHasPlayed() {
	return !!localStorage.getItem(HAS_PLAYED_KEY);
}

export function markHasPlayed() {
	localStorage.setItem(HAS_PLAYED_KEY, "1");
}

export function deleteHasPlayed() {
	localStorage.removeItem(HAS_PLAYED_KEY);
}
