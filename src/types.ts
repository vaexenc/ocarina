export type NoteName = "u" | "d" | "l" | "r" | "a";
export type NoteObject = {note: NoteName; id: number | string; isFlashing?: true};
export type Note = NoteName | NoteObject;
export type Color = `#${string}`;
export type Song = {
	readonly name: string;
	readonly color: Color;
	readonly notes: readonly Note[];
	readonly omitThe?: boolean;
};
export type Songs = {readonly [key: string]: Readonly<Song>};

export type AudioSystem = {
	context: AudioContext;
	gain: GainNode;
};
export type AudioBuffers = {[id: string]: AudioBuffer};

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
