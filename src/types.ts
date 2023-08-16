type SliderUserSetting = {readonly type: "slider"; value: number};
type ToggleUserSetting = {readonly type: "toggle"; value: boolean};
type KeybindUserSetting = {readonly type: "keybind"; readonly image: string; value: string};
export type UserSetting = {
	readonly id: string;
	readonly name: string;
	readonly hideOnMobile?: boolean;
} & (SliderUserSetting | ToggleUserSetting | KeybindUserSetting);
export type UserSettings = UserSetting[];
export type SerializedUserSettings = {[key in UserSetting["id"]]: UserSetting["value"]};
