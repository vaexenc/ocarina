import {defaultSettingValues} from "./default-user-settings";
import {SettingValues} from "/src/types";

const STORAGE_KEY = "ocarina.userSettings";

export function saveSettings(values: SettingValues) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
}

export function loadSettings(): SettingValues {
	const raw = localStorage.getItem(STORAGE_KEY);
	if (!raw) return defaultSettingValues;
	return {...defaultSettingValues, ...(JSON.parse(raw) as Partial<SettingValues>)};
}

export function deleteSettings() {
	localStorage.removeItem(STORAGE_KEY);
}
