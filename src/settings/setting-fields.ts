import A from "/src/images/buttons/a.svg?react";
import CDown from "/src/images/buttons/c-down.svg?react";
import CLeft from "/src/images/buttons/c-left.svg?react";
import CRight from "/src/images/buttons/c-right.svg?react";
import CUp from "/src/images/buttons/c-up.svg?react";
import {KeybindId, SettingField, SettingValues} from "/src/types";

export const settingFields: readonly SettingField[] = [
	{
		id: "volume",
		name: "Volume",
		type: "slider",
		default: 0.25,
	},
	{
		id: "bgMovement",
		name: "Background Movement",
		type: "toggle",
		default: true,
		hideOnMobile: true,
	},
	{
		id: "keybindA",
		name: "A",
		type: "keybind",
		image: A,
		default: "a",
		hideOnMobile: true,
	},
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
	{
		id: "keybindBendSemiDown",
		name: "Bend Down (Semitone)",
		type: "keybind",
		default: "q",
		hideOnMobile: true,
	},
	{
		id: "keybindBendWholeUp",
		name: "Bend Up (Whole Tone)",
		type: "keybind",
		default: "w",
		hideOnMobile: true,
	},
	{
		id: "keybindBendSemiUp",
		name: "Bend Up (Semitone)",
		type: "keybind",
		default: "e",
		hideOnMobile: true,
	},
	{
		id: "keybindBendWholeDown",
		name: "Bend Down (Whole Tone)",
		type: "keybind",
		default: "s",
		hideOnMobile: true,
	},
	{
		id: "keybindVibrato",
		name: "Vibrato",
		type: "keybind",
		default: " ",
		hideOnMobile: true,
	},
];

export const keybindIds: readonly KeybindId[] = settingFields
	.filter((field): field is Extract<SettingField, {type: "keybind"}> => field.type === "keybind")
	.map((field) => field.id);

export const defaultSettingValues = Object.fromEntries(
	settingFields.map((field) => [field.id, field.default])
) as SettingValues;
