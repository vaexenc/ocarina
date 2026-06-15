import type {FunctionComponent, SVGProps} from "react";

export type SvgComponent = FunctionComponent<SVGProps<SVGSVGElement> & {title?: string}>;

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
export type Songs = Readonly<Record<string, Readonly<Song>>>;

export type AudioSystem = {
	context: AudioContext;
	gain: GainNode;
};
export type AudioBuffers = Record<string, AudioBuffer>;

// The mutable settings the user can change, as a typed map. Reading a value is a
// direct, typed property access (`settings.volume` is a `number`) — no lookups,
// no casts. This is also exactly the shape we persist to localStorage.
export type SettingValues = {
	volume: number;
	bgMovement: boolean;
	keybindA: string;
	keybindCUp: string;
	keybindCDown: string;
	keybindCLeft: string;
	keybindCRight: string;
};
export type SettingId = keyof SettingValues;
export type KeybindId =
	| "keybindA"
	| "keybindCUp"
	| "keybindCDown"
	| "keybindCLeft"
	| "keybindCRight";

// The static metadata describing how each setting is rendered, in display order.
// Discriminating on `type` narrows `id`, which in turn types the value lookup, so
// the modal can render and edit each control without a single cast.
type SliderDef = {readonly type: "slider"; readonly id: "volume"; readonly default: number};
type ToggleDef = {readonly type: "toggle"; readonly id: "bgMovement"; readonly default: boolean};
type KeybindDef = {
	readonly type: "keybind";
	readonly id: KeybindId;
	readonly image: SvgComponent;
	readonly default: string;
};
export type SettingDef = {
	readonly name: string;
	readonly hideOnMobile?: boolean;
} & (SliderDef | ToggleDef | KeybindDef);
