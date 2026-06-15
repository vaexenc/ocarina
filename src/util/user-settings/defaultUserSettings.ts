import A from "/src/images/buttons/a.svg?react";
import CUp from "/src/images/buttons/c-up.svg?react";
import CDown from "/src/images/buttons/c-down.svg?react";
import CLeft from "/src/images/buttons/c-left.svg?react";
import CRight from "/src/images/buttons/c-right.svg?react";
import {UserSettings} from "/src/types";

const defaultUserSettings: UserSettings = [
	{id: "volume", name: "Volume", type: "slider", value: 0.25},
	{
		id: "bgMovement",
		name: "Background Movement",
		type: "toggle",
		value: true,
		hideOnMobile: true,
	},
	{
		id: "keybindA",
		name: "A",
		type: "keybind",
		image: A,
		value: "a",
		hideOnMobile: true,
	},
	{
		id: "keybindCUp",
		name: "C-Up",
		type: "keybind",
		image: CUp,
		value: "ArrowUp",
		hideOnMobile: true,
	},
	{
		id: "keybindCDown",
		name: "C-Down",
		type: "keybind",
		image: CDown,
		value: "ArrowDown",
		hideOnMobile: true,
	},
	{
		id: "keybindCLeft",
		name: "C-Left",
		type: "keybind",
		image: CLeft,
		value: "ArrowLeft",
		hideOnMobile: true,
	},
	{
		id: "keybindCRight",
		name: "C-Right",
		type: "keybind",
		image: CRight,
		value: "ArrowRight",
		hideOnMobile: true,
	},
];

// check for duplicate ids

const defaultUserSettingIds = new Set();
defaultUserSettings.forEach((defaultUserSetting) => {
	if (defaultUserSettingIds.has(defaultUserSetting.id)) throw Error("duplicate setting id");
	defaultUserSettingIds.add(defaultUserSetting.id);
});

export default defaultUserSettings;
