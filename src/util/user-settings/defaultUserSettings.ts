import {UserSettings} from "/src/types";

const defaultUserSettings: UserSettings = [
	{id: "volume", name: "Volume", type: "slider", value: 0.5},
	{id: "bgMovement", name: "Moving Background", type: "toggle", value: true},
	{
		id: "keybindA",
		name: "A",
		type: "keybind",
		image: "images/buttons/a.svg",
		value: "a",
		hideOnMobile: true,
	},
	{
		id: "keybindCUp",
		name: "C-Up",
		type: "keybind",
		image: "images/buttons/c-up.svg",
		value: "ArrowUp",
		hideOnMobile: true,
	},
	{
		id: "keybindCDown",
		name: "C-Down",
		type: "keybind",
		image: "images/buttons/c-down.svg",
		value: "ArrowDown",
		hideOnMobile: true,
	},
	{
		id: "keybindCLeft",
		name: "C-Left",
		type: "keybind",
		image: "images/buttons/c-left.svg",
		value: "ArrowLeft",
		hideOnMobile: true,
	},
	{
		id: "keybindCRight",
		name: "C-Right",
		type: "keybind",
		image: "images/buttons/c-right.svg",
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
