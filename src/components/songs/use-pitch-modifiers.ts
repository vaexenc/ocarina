import {BendKeybindId, normalizeKey, SettingValues} from "@/settings/setting-fields";
import {AudioSystem} from "@/util/audio";
import {RefObject, useCallback, useEffect, useMemo, useRef} from "react";
import type {LiveNote} from "./use-ocarina-playback";

// Ocarina of Time-style pitch bending: each rebindable bend key offsets the live note's pitch by
// the given number of cents while held. A note bent this way can't be part of a song match.
const bendKeybindCents: Record<BendKeybindId, number> = {
	keybindBendWholeDown: -200,
	keybindBendSemiDown: -100,
	keybindBendSemiUp: 100,
	keybindBendWholeUp: 200,
};

// Vibrato is purely an audio effect — it does not affect matching.
const vibratoRateHz = 6;
const vibratoDepthCents = 35;

// A bend glides to pitch rather than snapping. Ramping in cents is linear in semitones, which is
// the musically natural glide.
const bendGlideDuration = 0.08;

export type PitchModifiers = {
	/** Sum of all currently-held bend offsets, in cents. */
	bendCents: () => number;
	/** Whether a bend is held right now — a note starting now should be marked bent. */
	isBendActive: () => boolean;
	/** A freshly-played note is now the live note; (re)apply the armed bend/vibrato to it. */
	onLiveNoteStarted: () => void;
	/** The live note's key was released; bend/vibrato stop affecting it (but stay armed). */
	onLiveNoteReleased: () => void;
	/** Handle a bend/vibrato keydown. Returns whether the key was consumed. */
	handleKeyDown: (event: KeyboardEvent) => boolean;
	/** Handle a bend/vibrato keyup. Returns whether the key was consumed. */
	handleKeyUp: (event: KeyboardEvent) => boolean;
	/** Forget all held keys and disconnect vibrato (the shared LFO keeps running). */
	reset: () => void;
};

/**
 * Owns the live pitch-modifier subsystem: bend offsets and the vibrato LFO, applied to whichever
 * note is currently sounding. The note itself is owned by {@link useOcarinaPlayback} and read through
 * the shared `liveNote` ref, so there's a single source of truth for it. Bend/vibrato keys stay
 * "armed" while held — they affect the live note immediately, and `onLiveNoteStarted` re-applies the
 * armed state to each new note, so a pre-held key keeps bending/vibrato-ing notes played afterwards
 * too. The `isHeld` gate confines all of this to the window between a note's play and its release, so
 * an idle press never alters an already-finished note (the `liveNote` ref itself lingers after
 * release so the engine can still fade the note out).
 *
 * `onBendLiveNote` is invoked when a bend lands on the live note, so the caller can mark it bent.
 */
export function usePitchModifiers({
	audioSystem,
	settings,
	liveNote,
	onBendLiveNote,
}: {
	audioSystem: AudioSystem;
	settings: SettingValues;
	// The currently sounding note, owned by the caller. Read here to bend/vibrato its source.
	liveNote: RefObject<LiveNote | null>;
	onBendLiveNote: () => void;
}): PitchModifiers {
	const activeBends = useRef<Map<string, number>>(new Map());
	const vibratoActive = useRef(false);
	const vibratoOsc = useRef<OscillatorNode | null>(null);
	const vibratoDepth = useRef<GainNode | null>(null);

	// Whether the live note's key is currently held. Gates bend/vibrato so they only act between a
	// note's play and its release — never on a faded-out, auto-played, or already-finished note.
	const isHeld = useRef(false);

	// Maps each configured bend key to its cent offset, for O(1) lookup on key events.
	const keyToBendCents = useMemo(() => {
		const map = new Map<string, number>();
		(Object.entries(bendKeybindCents) as [BendKeybindId, number][]).forEach(([id, cents]) =>
			map.set(settings[id], cents)
		);
		return map;
	}, [settings]);

	const vibratoKey = settings.keybindVibrato;

	const bendCents = useCallback(() => {
		let sum = 0;
		for (const cents of activeBends.current.values()) sum += cents;
		return sum;
	}, []);

	const isBendActive = useCallback(() => activeBends.current.size > 0, []);

	// Glide the live note from its current pitch to its base plus the current bend. Used when a bend
	// key changes mid-note; a note's initial pitch is set at creation, not here. The vibrato LFO,
	// when connected, oscillates on top of this intrinsic value.
	const glideBend = useCallback(() => {
		const live = liveNote.current;
		if (!isHeld.current || !live) return;
		const now = audioSystem.context.currentTime;
		live.source.detune.cancelScheduledValues(now);
		live.source.detune.setValueAtTime(live.source.detune.value, now);
		live.source.detune.linearRampToValueAtTime(
			live.baseDetune + bendCents(),
			now + bendGlideDuration
		);
	}, [audioSystem, bendCents, liveNote]);

	const disconnectVibrato = useCallback(() => {
		vibratoDepth.current?.disconnect();
	}, []);

	// Route a shared, always-running LFO into the live source's detune. Created lazily so the
	// oscillator only exists once vibrato is first used.
	const connectVibrato = useCallback(() => {
		const ctx = audioSystem.context;
		if (!vibratoOsc.current) {
			const osc = ctx.createOscillator();
			osc.frequency.value = vibratoRateHz;
			const depth = ctx.createGain();
			depth.gain.value = vibratoDepthCents;
			osc.connect(depth);
			osc.start();
			vibratoOsc.current = osc;
			vibratoDepth.current = depth;
		}
		const live = liveNote.current;
		if (isHeld.current && live && vibratoDepth.current) {
			vibratoDepth.current.disconnect();
			vibratoDepth.current.connect(live.source.detune);
		}
	}, [audioSystem, liveNote]);

	const onLiveNoteStarted = useCallback(() => {
		isHeld.current = true;
		// The source is created already at its base + held-bend pitch, so there's no bend to set here
		// — only a later bend key change glides it. Vibrato, being continuous, is (re)connected now.
		if (vibratoActive.current) connectVibrato();
	}, [connectVibrato]);

	const onLiveNoteReleased = useCallback(() => {
		isHeld.current = false;
	}, []);

	const handleKeyDown = useCallback(
		(event: KeyboardEvent) => {
			const key = normalizeKey(event.key);
			const cents = keyToBendCents.get(key);
			if (cents !== undefined) {
				event.preventDefault();
				activeBends.current.set(key, cents);
				if (isHeld.current) {
					glideBend();
					onBendLiveNote();
				}
				return true;
			}
			if (key === vibratoKey) {
				event.preventDefault();
				vibratoActive.current = true;
				connectVibrato();
				return true;
			}
			return false;
		},
		[keyToBendCents, vibratoKey, glideBend, connectVibrato, onBendLiveNote]
	);

	const handleKeyUp = useCallback(
		(event: KeyboardEvent) => {
			const key = normalizeKey(event.key);
			if (keyToBendCents.has(key)) {
				activeBends.current.delete(key);
				glideBend();
				return true;
			}
			if (key === vibratoKey) {
				vibratoActive.current = false;
				disconnectVibrato();
				return true;
			}
			return false;
		},
		[keyToBendCents, vibratoKey, glideBend, disconnectVibrato]
	);

	const reset = useCallback(() => {
		activeBends.current.clear();
		vibratoActive.current = false;
		isHeld.current = false;
		disconnectVibrato();
	}, [disconnectVibrato]);

	// Stop the shared LFO when the consumer unmounts.
	useEffect(
		() => () => {
			vibratoOsc.current?.stop();
			vibratoOsc.current = null;
			vibratoDepth.current = null;
		},
		[]
	);

	return {
		bendCents,
		isBendActive,
		onLiveNoteStarted,
		onLiveNoteReleased,
		handleKeyDown,
		handleKeyUp,
		reset,
	};
}
