import {Mode, modeOrder} from "@/modes";
import clsx from "clsx";
import FanOutSwitcher from "./FanOutSwitcher";

const modeLabels: Record<Mode, string> = {
	song: "Songs",
	free: "Free",
	speedrun: "Speedrun",
};

const pillClass =
	"flex h-[36px] shrink-0 items-center justify-center rounded-full text-[15px] font-medium whitespace-nowrap text-white";

/**
 * The play-mode selector. All modes render in their fixed list order (Song, Free, Speedrun) and keep
 * that order regardless of which is selected — collapsed, the selected mode is the only pill left
 * visible and the rest shrink to zero width; hovering (or tapping, for touch) fans them out to the
 * right. The fan-out interaction lives in {@link FanOutSwitcher}; this only describes the pills.
 */
export default function ModeSwitcher({
	mode,
	onSelectMode,
}: {
	mode: Mode;
	onSelectMode: (mode: Mode) => void;
}) {
	return (
		<FanOutSwitcher
			items={modeOrder}
			isSelected={(m) => m === mode}
			onSelect={onSelectMode}
			renderItem={(m, {isCurrent, isOpen, index}) => ({
				key: m,
				ariaLabel: isCurrent ? `Mode: ${modeLabels[m]}` : modeLabels[m],
				className: clsx(
					pillClass,
					"group transition-all duration-150",
					// A pill needs a left gap whenever it follows a visible pill — i.e. it's open
					// and not the first in the row. This keeps the spacing even no matter which mode
					// is selected.
					isOpen && index > 0 && "ml-[6px]",
					isCurrent
						? "bg-black/80"
						: "cursor-pointer bg-black/45 hover:scale-105 hover:bg-black/75",
					// Non-selected pills collapse to zero width when closed so the group shrinks to
					// just the selected pill, then expand when opened. The padding is dropped while
					// collapsed so border-box sizing can shrink the pill all the way down with no
					// leftover gap.
					isCurrent || isOpen
						? "max-w-[200px] px-[16px] opacity-100"
						: "max-w-0 px-0 -translate-x-2 overflow-hidden opacity-0 pointer-events-none"
				),
				content: (
					<span
						className={clsx(
							"transition-opacity duration-150",
							!isCurrent && "opacity-70 group-hover:opacity-100"
						)}
					>
						{modeLabels[m]}
					</span>
				),
			})}
		/>
	);
}
