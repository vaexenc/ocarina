import {SongId} from "@/data/song-data";
import {Mode, SpeedrunSet} from "@/modes";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {loadBestTime, saveBestTime} from "./best-times";
import {isSpeedrunComplete, speedrunSongIds} from "./logic";

// After a run completes, song input is briefly locked so the celebratory final note can't
// immediately kick off a new run.
const postRunLockMs = 1000;

export type SpeedrunTimerProps = {
	startTime: number | null;
	endTime: number | null;
	bestMs: number | null;
	isNewBest: boolean;
	playedCount: number;
	totalCount: number;
};

export type Speedrun = {
	/** Songs completed in the current run. Empty (and inert) outside Speedrun mode. */
	playedSongIds: Set<SongId>;
	/** True during the brief post-completion window when song input should be ignored. */
	isInputLocked: boolean;
	/** Call on every accepted note press; starts the clock (or a fresh run after completion). */
	onNotePress: () => void;
	/** Record a song as completed this run. */
	registerSong: (songId: SongId) => void;
	/** Abandon the current run and re-read the best time to beat. */
	reset: () => void;
	/** Bumped whenever a run is abandoned, so the playback engine can drop any buffered notes. */
	runResetSignal: number;
	/** Everything the {@link SpeedrunTimer} HUD needs to render. */
	timerProps: SpeedrunTimerProps;
};

/**
 * Owns the speedrun *run* lifecycle: which songs have been played, the timed window from the first
 * note (`runStartTime`) until the set is complete (`runEndTime`), the stored best for the set, and
 * the short post-completion input lock. The run is driven entirely by `onNotePress`/`registerSong`;
 * `mode` and `speedrunSet` are owned by the caller (they outlive any single run) and passed in.
 *
 * All run state lives here rather than in the app shell, so the root component just wires it up.
 */
export function useSpeedrun({mode, speedrunSet}: {mode: Mode; speedrunSet: SpeedrunSet}): Speedrun {
	const [playedSongIds, setPlayedSongIds] = useState<Set<SongId>>(() => new Set());
	const [runStartTime, setRunStartTime] = useState<number | null>(null);
	const [runEndTime, setRunEndTime] = useState<number | null>(null);
	const [bestMs, setBestMs] = useState<number | null>(() => loadBestTime(speedrunSet));
	const [isNewBest, setIsNewBest] = useState(false);
	const [isInputLocked, setIsInputLocked] = useState(false);
	const [runResetSignal, setRunResetSignal] = useState(0);

	// The event-time of the last accepted note press. The run ends at the press that completes the
	// set, so this (not `performance.now()` in the completion effect, which runs a render later) is
	// what the run is timed against — keeping the end measurement as accurate as the start.
	const lastNotePressAt = useRef(0);

	// The single "start from a clean run" operation. `startNow` begins timing immediately (the first
	// note after a finished run), otherwise the run sits idle until the next note.
	const resetRun = useCallback(
		(startNow: boolean) => {
			setPlayedSongIds(new Set());
			setRunStartTime(startNow ? performance.now() : null);
			setRunEndTime(null);
			setIsNewBest(false);
			setBestMs(loadBestTime(speedrunSet));
			// Abandoning a run (reset button, or a mode/set switch) must also drop any partial note
			// sequence still buffered in the playback engine — otherwise those leftover notes bridge
			// into the fresh run and complete a song with too few presses. Continuing into a new run
			// after a completion (`startNow`) needs no clear: the finishing match already emptied it.
			if (!startNow) setRunResetSignal((n) => n + 1);
		},
		[speedrunSet]
	);

	// Changing mode or set abandons any in-progress run and re-reads the best time to beat. This is
	// done during render (not in an effect) so the cleared run state is committed *before* the
	// completion effect below runs. An effect-based reset leaves a window where, on a set switch, the
	// completion effect fires against the previous run's played songs but the newly-selected set —
	// which may be a subset that's already satisfied — and spuriously reports "New Record!".
	const runKey = `${mode}:${speedrunSet}`;
	const [activeRunKey, setActiveRunKey] = useState(runKey);
	if (activeRunKey !== runKey) {
		setActiveRunKey(runKey);
		resetRun(false);
	}

	const onNotePress = useCallback(() => {
		if (mode !== "speedrun") return;
		const at = performance.now();
		lastNotePressAt.current = at;
		// The first note of a run starts the clock; the first note after a finished run starts a new one.
		if (runEndTime !== null) {
			resetRun(true);
		} else if (runStartTime === null) {
			setRunStartTime(at);
		}
	}, [mode, runStartTime, runEndTime, resetRun]);

	const registerSong = useCallback((songId: SongId) => {
		setPlayedSongIds((prev) => (prev.has(songId) ? prev : new Set(prev).add(songId)));
	}, []);

	const reset = useCallback(() => resetRun(false), [resetRun]);

	// When the active set's songs are all played, freeze the timer and record the best time.
	useEffect(() => {
		if (mode !== "speedrun" || runStartTime === null || runEndTime !== null) return;
		if (isSpeedrunComplete(speedrunSet, playedSongIds)) {
			// End the run at the completing note's press time, not now (this effect runs a render
			// later), so the recorded duration matches when the player actually finished.
			const end = lastNotePressAt.current;
			const runMs = end - runStartTime;
			setRunEndTime(end);
			setIsNewBest(bestMs === null || runMs < bestMs);
			// With no prior best, show the time just set as the best straight away rather than the
			// "—" placeholder. When there *is* a best, leave it showing the time that was there to
			// beat (while `isNewBest` reports the result); the freshly saved time is then picked up
			// by `loadBestTime` when the next run starts.
			if (bestMs === null) setBestMs(runMs);
			saveBestTime(speedrunSet, runMs);
		}
	}, [mode, speedrunSet, playedSongIds, runStartTime, runEndTime, bestMs]);

	// Lock song input briefly on completion; resetting (runEndTime back to null) clears it at once.
	useEffect(() => {
		if (runEndTime === null) {
			setIsInputLocked(false);
			return;
		}
		setIsInputLocked(true);
		const timer = setTimeout(() => setIsInputLocked(false), postRunLockMs);
		return () => clearTimeout(timer);
	}, [runEndTime]);

	const activeSongIds = useMemo(
		() => (mode === "speedrun" ? speedrunSongIds(speedrunSet) : []),
		[mode, speedrunSet]
	);

	return {
		playedSongIds,
		isInputLocked,
		onNotePress,
		registerSong,
		reset,
		runResetSignal,
		timerProps: {
			startTime: runStartTime,
			endTime: runEndTime,
			bestMs,
			isNewBest,
			playedCount: activeSongIds.filter((id) => playedSongIds.has(id)).length,
			totalCount: activeSongIds.length,
		},
	};
}
