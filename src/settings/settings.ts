import {defaultInstrumentId, InstrumentId, instruments} from "@/data/instrument-data";
import {Mode, modeOrder, SpeedrunSet, speedrunSetOrder} from "@/modes";
import {defaultSettingValues, keybindIds, normalizeKey, SettingValues} from "./setting-fields";
import {loadEnum, loadFlag, loadJson, saveJson, saveString, setFlag} from "./storage";

const STORAGE_KEY = "userSettings";
const HAS_PLAYED_KEY = "hasPlayedBefore";
const INSTRUMENT_KEY = "instrument";
const MODE_KEY = "mode";
const SPEEDRUN_SET_KEY = "speedrunSet";

const instrumentIds = Object.keys(instruments) as InstrumentId[];

export function saveSettings(values: SettingValues) {
	saveJson(STORAGE_KEY, values);
}

export function loadSettings(): SettingValues {
	// Merge over defaults so a stored value missing newer fields stays valid.
	const merged = {...defaultSettingValues, ...loadJson<Partial<SettingValues>>(STORAGE_KEY, {})};
	for (const id of keybindIds) merged[id] = normalizeKey(merged[id]);
	return merged;
}

export function loadInstrument(): InstrumentId {
	return loadEnum(INSTRUMENT_KEY, instrumentIds, defaultInstrumentId);
}

export function saveInstrument(id: InstrumentId) {
	saveString(INSTRUMENT_KEY, id);
}

export function loadMode(): Mode {
	return loadEnum(MODE_KEY, modeOrder, "song");
}

export function saveMode(mode: Mode) {
	saveString(MODE_KEY, mode);
}

export function loadSpeedrunSet(): SpeedrunSet {
	return loadEnum(SPEEDRUN_SET_KEY, speedrunSetOrder, "both");
}

export function saveSpeedrunSet(set: SpeedrunSet) {
	saveString(SPEEDRUN_SET_KEY, set);
}

export function loadHasPlayed() {
	return loadFlag(HAS_PLAYED_KEY);
}

export function markHasPlayed() {
	setFlag(HAS_PLAYED_KEY);
}
