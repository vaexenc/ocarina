import {Instrument} from "@/data/instrument-data";
import {Song, SongId} from "@/data/song-data";
import {AudioBuffers, AudioSystem, createSound} from "@/util/audio";
import {useCallback, useEffect, useRef, useState} from "react";

// Delays (ms) that shape the result window after a song is matched: the melody starts
// `songStartDelay` in, becomes cancellable `canCancelDelay` after that, and the whole result clears
// `songEndDelay` after the melody finishes. The held live note is faded out
// `songStartLiveNoteFadeoutDelay` relative to the melody start (negative = just before it).
const songStartDelay = 800;
const canCancelDelay = 500;
const songEndDelay = 500;
const songStartLiveNoteFadeoutDelay = -100;

export type MatchedSong = {id: SongId; song: Song};

// "notPlaying" until a song is matched; "playing" while the result is locked; "playingCanCancel"
// once the player may press a note to drop out of it early.
export type PlaybackState = "notPlaying" | "playing" | "playingCanCancel";

export type MatchedSongPlayback = {
	/** The song currently being presented (and its id), or null when idle. */
	matched: MatchedSong | null;
	state: PlaybackState;
	/** Present a freshly matched song: flash its notes, play the melody, and time the result window. */
	play: (songId: SongId, song: Song, matchLength: number) => void;
	/** End the in-progress presentation early (a note pressed during the cancel window). */
	cancel: () => void;
	/** Drop any in-progress presentation *without* firing `onSongEnd` (the mode/run reset path). */
	reset: () => void;
};

/**
 * Owns the matched-song "result" presentation: the {@link PlaybackState} machine, the scheduled
 * timeout cascade (melody start → cancel window → teardown), and the melody audio source. Split out
 * of {@link useOcarinaPlayback} so the input/match path stays free of this playback orchestration.
 *
 * The played notes live in the caller: `flashMatchedNotes` highlights the matched ones, and
 * `onSongEnd` tears the sequence (and live note) down. Ending naturally and cancelling are the same
 * operation — stop the melody, reset, notify — so both funnel through one internal `finish`.
 */
export function useMatchedSongPlayback({
	instrument,
	audioSystem,
	audioBuffers,
	onSongCorrect,
	onSongEnd,
	flashMatchedNotes,
	fadeOutLiveNote,
}: {
	instrument: Instrument;
	audioSystem: AudioSystem;
	audioBuffers: React.RefObject<AudioBuffers>;
	onSongCorrect: (songId: SongId, songData: Song) => void;
	// Tears down the played-note sequence and the live note when a presentation ends or is cancelled.
	onSongEnd: () => void;
	// Flash the last `matchLength` played notes, marking the matched song.
	flashMatchedNotes: (matchLength: number) => void;
	fadeOutLiveNote: () => void;
}): MatchedSongPlayback {
	const [matched, setMatched] = useState<MatchedSong | null>(null);
	const [state, setState] = useState<PlaybackState>("notPlaying");
	const songSource = useRef<AudioBufferSourceNode | null>(null);
	const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

	const clearTimeouts = useCallback(() => {
		timeouts.current.forEach(clearTimeout);
		timeouts.current = [];
	}, []);

	// Stop the matched song's melody if one is sounding. `songSource` is only set once the melody has
	// actually started (see `play`), so this is a no-op — and stays safe — before then, since `stop()`
	// throws on a source that was never started.
	const stopSong = useCallback(() => {
		songSource.current?.stop();
		songSource.current = null;
	}, []);

	// Stop the melody, clear the result, and reset the state machine. Used by both `finish` and the
	// mode/run reset path, so switching modes mid-playback cancels the melody rather than letting it
	// play out.
	const reset = useCallback(() => {
		clearTimeouts();
		stopSong();
		setMatched(null);
		setState("notPlaying");
	}, [clearTimeouts, stopSong]);

	// Tell the caller to drop the played notes on top of the teardown `reset` does. Shared by both the
	// scheduled end of a run-through and an early cancel.
	const finish = useCallback(() => {
		reset();
		onSongEnd();
	}, [reset, onSongEnd]);

	const play = useCallback(
		(songId: SongId, song: Song, matchLength: number) => {
			setMatched({id: songId, song});
			setState("playing");
			flashMatchedNotes(matchLength);
			onSongCorrect(songId, song);

			// The ocarina plays the matched song's melody back; the other instruments play only the
			// confirmation sound (fired in `onSongCorrect`). Either way the timing below is the same —
			// the melody's duration still drives how long the result stays up — so the on-screen result
			// and cancel window are identical across instruments.
			const sound = instrument.playsMatchedSong
				? createSound(audioSystem, audioBuffers.current[songId], {gain: 0.6})
				: null;

			const schedule = (fn: () => void, delay: number) =>
				timeouts.current.push(setTimeout(fn, delay));

			// Fade out the held note just before the song proper begins.
			schedule(fadeOutLiveNote, Math.max(songStartDelay + songStartLiveNoteFadeoutDelay, 0));

			schedule(() => {
				sound?.source.start();
				// Track the source only now that it's started, so `stopSong` can cancel it but never
				// calls `stop()` on a source that hasn't begun (which would throw).
				songSource.current = sound?.source ?? null;
				schedule(() => setState("playingCanCancel"), canCancelDelay);
				schedule(finish, audioBuffers.current[songId].duration * 1000 + songEndDelay);
			}, songStartDelay);
		},
		[
			instrument,
			audioSystem,
			audioBuffers,
			onSongCorrect,
			flashMatchedNotes,
			fadeOutLiveNote,
			finish,
		]
	);

	useEffect(() => clearTimeouts, [clearTimeouts]);

	return {matched, state, play, cancel: finish, reset};
}
