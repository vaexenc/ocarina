import {SettingValues} from "/src/types";
import {defaultSettingValues} from "./default-user-settings";

const STORAGE_KEY = "ocarina.userSettings";

export function saveSettings(values: SettingValues) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
}

/** Returns the persisted settings merged over the defaults, or the defaults if none are stored. */
export function loadSettings(): SettingValues {
	const raw = localStorage.getItem(STORAGE_KEY);
	if (!raw) return defaultSettingValues;
	return {...defaultSettingValues, ...(JSON.parse(raw) as Partial<SettingValues>)};
}

export function deleteSettings() {
	localStorage.removeItem(STORAGE_KEY);
}
