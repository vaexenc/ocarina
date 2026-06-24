export type AudioSystem = {
	context: AudioContext;
	gain: GainNode;
};
export type AudioBuffers = Record<string, AudioBuffer>;

export function createAudioSystem(): AudioSystem {
	const context = new AudioContext();
	const gain = context.createGain();
	gain.connect(context.destination);
	return {context, gain};
}

export type SoundOptions = {
	/** Gain applied to this sound, relative to the system gain. Defaults to 1. */
	gain?: number;
	loop?: boolean;
	loopStart?: number;
	loopEnd?: number;
	detune?: number;
	/** An extra node to route the sound into, in addition to the system gain (e.g. a convolver). */
	extraDestination?: AudioNode;
};

export type Sound = {source: AudioBufferSourceNode; gain: GainNode};

/**
 * Wires up a buffer source through its own gain node into the system output (and any
 * `extraDestination`), but does not start it. Returns `null` if the buffer hasn't loaded.
 */
export function createSound(
	system: AudioSystem,
	buffer: AudioBuffer | undefined,
	options: SoundOptions = {}
): Sound | null {
	if (!buffer) return null;

	const source = system.context.createBufferSource();
	source.buffer = buffer;

	const gain = system.context.createGain();
	gain.gain.value = options.gain ?? 1;
	gain.connect(system.gain);
	if (options.extraDestination) gain.connect(options.extraDestination);
	source.connect(gain);

	if (options.loop) {
		source.loop = true;
		if (options.loopStart !== undefined) source.loopStart = options.loopStart;
		if (options.loopEnd !== undefined) source.loopEnd = options.loopEnd;
	}
	if (options.detune !== undefined) source.detune.value = options.detune;

	return {source, gain};
}

/** Builds a sound via {@link createSound} and starts it immediately. */
export function playSound(
	system: AudioSystem,
	buffer: AudioBuffer | undefined,
	options: SoundOptions = {}
): Sound | null {
	const sound = createSound(system, buffer, options);
	sound?.source.start();
	return sound;
}

export function fadeOutSource(
	audioContext: AudioContext,
	source: AudioBufferSourceNode,
	gainNode: GainNode,
	fadeDuration: number
) {
	const currentTime = audioContext.currentTime;
	gainNode.gain.setValueAtTime(gainNode.gain.value, currentTime);
	gainNode.gain.linearRampToValueAtTime(0, currentTime + fadeDuration);
	source.stop(currentTime + fadeDuration);
}
