import {useCallback, useEffect, useMemo, useRef} from "react";
import {AudioSystem, BendKeybindId, SettingValues} from "/src/types";

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
	/** Adopt a freshly-played note as the live target, (re)applying bend and vibrato to it. */
	attachToSource: (source: AudioBufferSourceNode, baseDetune: number) => void;
	/** The live note was released; bend/vibrato keys stop affecting it (but stay armed). */
	detach: () => void;
	/** Handle a bend/vibrato keydown. Returns whether the key was consumed. */
	handleKeyDown: (event: KeyboardEvent) => boolean;
	/** Handle a bend/vibrato keyup. Returns whether the key was consumed. */
	handleKeyUp: (event: KeyboardEvent) => boolean;
	/** Forget all held keys and disconnect vibrato (the shared LFO keeps running). */
	reset: () => void;
};

/**
 * Owns the live pitch-modifier subsystem: bend offsets and the vibrato LFO, applied to whichever
 * ocarina source is currently sounding. Bend/vibrato keys stay "armed" while held — they affect
 * the live note immediately and `attachToSource` re-applies the armed state to each new note, so a
 * pre-held key keeps bending/vibrato-ing notes played afterwards too. Keys only act while a note is
 * live (between its play and release), so an idle press never alters an already-finished note.
 *
 * `onBendLiveNote` is invoked when a bend lands on the live note, so the caller can mark it bent.
 */
export function usePitchModifiers({
	audioSystem,
	settings,
	onBendLiveNote,
}: {
	audioSystem: AudioSystem;
	settings: SettingValues;
	onBendLiveNote: () => void;
}): PitchModifiers {
	const activeBends = useRef<Map<string, number>>(new Map());
	const vibratoActive = useRef(false);
	const vibratoOsc = useRef<OscillatorNode | null>(null);
	const vibratoDepth = useRef<GainNode | null>(null);

	// The note currently sounding from key input, until it's released. `null` means no live note,
	// which gates bend/vibrato so they never touch a faded-out or auto-played note.
	const liveSource = useRef<AudioBufferSourceNode | null>(null);
	const liveBaseDetune = useRef(0);

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
		const source = liveSource.current;
		if (!source) return;
		const now = audioSystem.context.currentTime;
		source.detune.cancelScheduledValues(now);
		source.detune.setValueAtTime(source.detune.value, now);
		source.detune.linearRampToValueAtTime(liveBaseDetune.current + bendCents(), now + bendGlideDuration);
	}, [audioSystem, bendCents]);

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
		const source = liveSource.current;
		if (source && vibratoDepth.current) {
			vibratoDepth.current.disconnect();
			vibratoDepth.current.connect(source.detune);
		}
	}, [audioSystem]);

	const attachToSource = useCallback(
		(source: AudioBufferSourceNode, baseDetune: number) => {
			liveSource.current = source;
			liveBaseDetune.current = baseDetune;
			// The source is created already at its base + held-bend pitch, so there's nothing to set
			// here — only a later bend key change glides it.
			if (vibratoActive.current) connectVibrato();
		},
		[connectVibrato]
	);

	const detach = useCallback(() => {
		liveSource.current = null;
	}, []);

	const handleKeyDown = useCallback(
		(event: KeyboardEvent) => {
			const cents = keyToBendCents.get(event.key);
			if (cents !== undefined) {
				event.preventDefault();
				activeBends.current.set(event.key, cents);
				if (liveSource.current) {
					glideBend();
					onBendLiveNote();
				}
				return true;
			}
			if (event.key === vibratoKey) {
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
			if (keyToBendCents.has(event.key)) {
				activeBends.current.delete(event.key);
				glideBend();
				return true;
			}
			if (event.key === vibratoKey) {
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
		liveSource.current = null;
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

	return {bendCents, isBendActive, attachToSource, detach, handleKeyDown, handleKeyUp, reset};
}
