import A from "/src/images/buttons/a.svg?react";
import CDown from "/src/images/buttons/c-down.svg?react";
import CLeft from "/src/images/buttons/c-left.svg?react";
import CRight from "/src/images/buttons/c-right.svg?react";
import CUp from "/src/images/buttons/c-up.svg?react";
import {KeybindId, SettingDef, SettingValues} from "/src/types";

// The single source of truth for settings: their order, labels, controls, and defaults.
export const settingDefs: readonly SettingDef[] = [
	{id: "volume", name: "Volume", type: "slider", default: 0.25},
	{
		id: "bgMovement",
		name: "Background Movement",
		type: "toggle",
		default: true,
		hideOnMobile: true,
	},
	{id: "keybindA", name: "A", type: "keybind", image: A, default: "a", hideOnMobile: true},
	{
		id: "keybindCUp",
		name: "C-Up",
		type: "keybind",
		image: CUp,
		default: "ArrowUp",
		hideOnMobile: true,
	},
	{
		id: "keybindCDown",
		name: "C-Down",
		type: "keybind",
		image: CDown,
		default: "ArrowDown",
		hideOnMobile: true,
	},
	{
		id: "keybindCLeft",
		name: "C-Left",
		type: "keybind",
		image: CLeft,
		default: "ArrowLeft",
		hideOnMobile: true,
	},
	{
		id: "keybindCRight",
		name: "C-Right",
		type: "keybind",
		image: CRight,
		default: "ArrowRight",
		hideOnMobile: true,
	},
];

export const keybindIds: readonly KeybindId[] = settingDefs
	.filter((def): def is Extract<SettingDef, {type: "keybind"}> => def.type === "keybind")
	.map((def) => def.id);

export const defaultSettingValues = Object.fromEntries(
	settingDefs.map((def) => [def.id, def.default])
) as SettingValues;
