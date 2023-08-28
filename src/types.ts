export type NoteName = "u" | "d" | "l" | "r" | "a";
export type Note = NoteName | {note: NoteName; id: number | string};
export type Color = `#${string}`;
export type Song = {
	readonly name: string;
	readonly color: Color;
	readonly notes: readonly Note[];
	readonly omitThe?: boolean;
};
export type Songs = {readonly [key: string]: Readonly<Song>};

export type Sounds = {[id: string]: ArrayBuffer};

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
