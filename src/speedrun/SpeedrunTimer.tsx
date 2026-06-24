import IconReset from "@/images/icons/reset.svg?react";
import {nextInOrder, SpeedrunSet, speedrunSetOrder} from "@/modes";
import {normalizeKey} from "@/settings/setting-fields";
import clsx from "clsx";
import {useCallback, useEffect, useRef, useState} from "react";
import {formatSpeedrunTime} from "./logic";

const setLabels: Record<SpeedrunSet, string> = {
	oot: "OoT",
	mm: "MM",
	both: "OoT+MM",
};

// How long the reset button stays "armed" after the first press before disarming itself.
const RESET_ARM_MS = 2500;

/**
 * The speedrun HUD shown at the top-center: a live (centisecond) timer at the very top, the
 * completion progress / best time with a reset button, and the song-set selector beneath. The
 * timer ticks via requestAnimationFrame while a run is in progress (a start time with no end
 * time yet) and freezes on completion.
 *
 * Resetting is two-step to avoid accidental wipes: the first press (the configured reset key, or
 * Escape) arms the button and shows confirm feedback; a second press within {@link RESET_ARM_MS}
 * performs the reset, otherwise it disarms.
 */
export default function SpeedrunTimer({
	startTime,
	endTime,
	bestMs,
	isNewBest,
	playedCount,
	totalCount,
	onReset,
	resetKey,
	speedrunSet,
	onSelectSpeedrunSet,
	isInputEnabled,
}: {
	startTime: number | null;
	endTime: number | null;
	bestMs: number | null;
	isNewBest: boolean;
	playedCount: number;
	totalCount: number;
	onReset: () => void;
	resetKey: string;
	speedrunSet: SpeedrunSet;
	onSelectSpeedrunSet: (set: SpeedrunSet) => void;
	isInputEnabled: boolean;
}) {
	const isRunning = startTime !== null && endTime === null;
	const [now, setNow] = useState(() => performance.now());

	useEffect(() => {
		if (!isRunning) return;
		let frame: number;
		const tick = () => {
			setNow(performance.now());
			frame = requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	}, [isRunning]);

	// Clamp at 0: `now` is seeded at mount, so the first render after a run starts can briefly have
	// `now` < `startTime`, which would otherwise flash a negative time before the first rAF tick.
	const elapsed = startTime === null ? 0 : Math.max(0, (endTime ?? now) - startTime);
	const isComplete = endTime !== null;

	const canReset = startTime !== null;

	// Two-step reset: first press arms (shows confirm feedback), second press resets.
	const [isResetArmed, setIsResetArmed] = useState(false);
	const disarmTimer = useRef<number | null>(null);

	const clearDisarmTimer = useCallback(() => {
		if (disarmTimer.current !== null) {
			clearTimeout(disarmTimer.current);
			disarmTimer.current = null;
		}
	}, []);

	const requestReset = useCallback(() => {
		if (!canReset) return;
		clearDisarmTimer();
		if (isResetArmed) {
			setIsResetArmed(false);
			onReset();
		} else {
			setIsResetArmed(true);
			disarmTimer.current = window.setTimeout(() => {
				disarmTimer.current = null;
				setIsResetArmed(false);
			}, RESET_ARM_MS);
		}
	}, [canReset, isResetArmed, onReset, clearDisarmTimer]);

	// Disarm if there's nothing left to reset (e.g. after the reset itself).
	useEffect(() => {
		if (!canReset) setIsResetArmed(false);
	}, [canReset]);

	useEffect(() => clearDisarmTimer, [clearDisarmTimer]);

	// The configured reset key (Escape always works too) triggers the same arm-then-confirm flow as
	// the button.
	useEffect(() => {
		if (!isInputEnabled) return;
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "Escape" && normalizeKey(event.key) !== resetKey) return;
			// The default reset key is Space, which would otherwise scroll the page or re-activate a
			// focused button (double-triggering the reset).
			event.preventDefault();
			requestReset();
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [isInputEnabled, resetKey, requestReset]);

	return (
		<div className="relative z-[90] flex w-fit min-w-52 flex-col items-center gap-2 rounded-[16px] bg-black/55 px-4 py-2 text-white select-none">
			<span className="text-xl leading-none font-bold tracking-[0.06em] tabular-nums">
				{formatSpeedrunTime(elapsed)}
			</span>
			<div className="flex w-full items-center justify-between gap-[10px] text-[12px] tabular-nums">
				<span className="font-medium">
					{isComplete ? (
						isNewBest ? (
							<span className="new-record-text">New Record!</span>
						) : (
							<span className="text-[#41ee4b]">Complete!</span>
						)
					) : (
						<span className="opacity-75">
							{String(playedCount).padStart(String(totalCount).length, "0")}/
							{totalCount}
						</span>
					)}
				</span>
				<span className="opacity-75">
					Best: {bestMs === null ? "—" : formatSpeedrunTime(bestMs)}
				</span>
			</div>
			<button
				type="button"
				aria-label={`Category: ${setLabels[speedrunSet]}. Click to change.`}
				title="Click to change category"
				onClick={() => onSelectSpeedrunSet(nextInOrder(speedrunSetOrder, speedrunSet))}
				className="flex h-[22px] items-center justify-center rounded-full bg-black/30 px-[12px] text-[11px] font-medium text-white transition hover:bg-black/45"
			>
				{setLabels[speedrunSet]}
			</button>
			<button
				type="button"
				aria-label={isResetArmed ? "Confirm reset run" : "Reset run"}
				title={isResetArmed ? "Press again (or Esc) to confirm reset" : "Reset run (Esc)"}
				disabled={!canReset}
				onClick={requestReset}
				className={clsx(
					"absolute right-[10px] bottom-[10px] flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full transition",
					// Fade out (rather than unmount) when there's no run to reset.
					!canReset && "pointer-events-none opacity-0",
					isResetArmed
						? "bg-[#e0533d] text-white hover:bg-[#e0533d]"
						: "bg-black/30 hover:bg-black/45"
				)}
			>
				<IconReset className="h-[12px] w-[12px]" aria-hidden="true" />
			</button>
		</div>
	);
}
