import {NoteName} from "./song-data";

export type InstrumentId = "ocarina" | "deku-trumpet" | "goron-drum" | "zora-guitar";

export type Instrument = {
	readonly id: InstrumentId;
	readonly name: string;
	/** Key into the loaded `AudioBuffers` map (also the audio file's basename). */
	readonly bufferId: string;
	/** Gain applied to a played note, relative to the system gain. */
	readonly gain: number;
	/**
	 * Whether holding a note sustains by looping the sample, or whether the sample plays once
	 * and rings out on its own (a plucked guitar / drum hit). Loop points only apply when `loop`.
	 */
	readonly loop: boolean;
	readonly loopStart?: number;
	readonly loopEnd?: number;
	/**
	 * If set, a held note fades to silence over this many seconds and then stops, instead of
	 * sustaining for as long as the key is held. Used for plucked instruments (guitar) that
	 * should ring out and die on their own even while the button stays down.
	 */
	readonly holdFadeDuration?: number;
	/**
	 * Whether matching a song plays back its melody (as the ocarina does in-game). When false,
	 * only the confirmation sound plays; the on-screen result and timing are unaffected.
	 */
	readonly playsMatchedSong: boolean;
	/**
	 * Cents to detune the (single-pitch) sample by for each note. Every instrument reproduces the
	 * same Ocarina-of-Time D-F-A-B-D layout, positioned in the octave nearest the sample's own
	 * recorded pitch so it stays in tune without being stretched too far. Bases: ocarina g#,
	 * deku trumpet g5, goron drum b3, zora guitar d4.
	 */
	readonly detune: Readonly<Record<NoteName, number>>;
	/** Top-left switcher icon, served from `public/`. */
	readonly iconSrc: string;
};

export const defaultInstrumentId: InstrumentId = "ocarina";

// Display/selection order in the top-left switcher.
export const instrumentList: readonly Instrument[] = [
	{
		id: "ocarina",
		name: "Ocarina",
		bufferId: "ocarina",
		gain: 0.3,
		loop: true,
		loopStart: 0.47,
		loopEnd: 0.7163,
		playsMatchedSong: true,
		detune: {a: -600, d: -300, r: 100, l: 300, u: 600},
		iconSrc: "images/instrument-ocarina.webp",
	},
	{
		id: "deku-trumpet",
		name: "Deku Trumpet",
		bufferId: "deku-trumpet",
		gain: 0.3,
		loop: true,
		loopStart: 0.5525,
		loopEnd: 1.0698,
		playsMatchedSong: false,
		detune: {a: -500, d: -200, r: 200, l: 400, u: 700},
		iconSrc: "images/instrument-deku-trumpet.webp",
	},
	{
		id: "goron-drum",
		name: "Goron Drum",
		bufferId: "goron-drum",
		gain: 0.5,
		loop: false,
		playsMatchedSong: false,
		detune: {a: -900, d: -600, r: -200, l: 0, u: 300},
		iconSrc: "images/instrument-goron-drums.webp",
	},
	{
		id: "zora-guitar",
		name: "Zora Guitar",
		bufferId: "zora-guitar",
		gain: 0.4,
		loop: true,
		loopStart: 1.0402,
		loopEnd: 1.2589,
		holdFadeDuration: 2,
		playsMatchedSong: false,
		detune: {a: 0, d: 300, r: 700, l: 900, u: 1200},
		iconSrc: "images/instrument-zora-guitar.webp",
	},
];

export const instruments = Object.fromEntries(
	instrumentList.map((instrument) => [instrument.id, instrument])
) as Record<InstrumentId, Instrument>;
