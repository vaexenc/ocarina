import {InstrumentId, instrumentList} from "@/data/instrument-data";
import IconClose from "@/images/icons/close.svg?react";
import {Mode, modeOrder} from "@/modes";
import {useDismiss} from "@/util/use-dismiss";
import {useFocusTrap} from "@/util/use-focus-trap";
import clsx from "clsx";
import {useRef} from "react";
import InstrumentSwitcher from "./InstrumentSwitcher";
import ModeSwitcher from "./ModeSwitcher";

/**
 * Small-screen replacement for the top-left switcher stack. When the viewport is narrow the fan-out
 * switchers crowd the corner, so they're tucked behind a single tap target: a pill showing the
 * current instrument and mode that, when tapped, opens a compact popover (anchored where the pill
 * sits, not a full-screen modal) holding both switchers. App renders this alongside the inline
 * switcher stack and lets the `tablet` breakpoint show exactly one: this below it, the stack above.
 */
export default function MobileSwitcherModal({
	isOpen,
	onOpenChange,
	mode,
	onSelectMode,
	instrumentId,
	onSelectInstrument,
}: {
	isOpen: boolean;
	onOpenChange: (isOpen: boolean) => void;
	mode: Mode;
	onSelectMode: (mode: Mode) => void;
	instrumentId: InstrumentId;
	onSelectInstrument: (id: InstrumentId) => void;
}) {
	const setIsOpen = onOpenChange;
	const panelRef = useRef<HTMLDivElement>(null);

	// While open, close on Escape or on a tap/click anywhere outside the popover. The listeners are
	// only attached once open, so the opening tap (already finished) can't immediately re-close it.
	useDismiss({isOpen, ref: panelRef, onDismiss: () => setIsOpen(false), withEscape: true});
	useFocusTrap({isOpen, ref: panelRef});

	// Top-left anchoring for the popover, inset to line up with the trigger's visible circle.
	// Mirrors the inline stack's padding plus safe-area insets.
	const anchorClass =
		"fixed top-0 left-0 z-[101] m-[12px] mt-[calc(env(safe-area-inset-top)+12px)] ml-[calc(env(safe-area-inset-left)+12px)] select-none";

	return (
		<>
			{/* Trigger. Hugs the top-left corner so its tap target runs to the screen edges (mirroring
			    the settings button in the opposite corner); the visible circle is inset, via padding, to
			    line up with the popover. Fades out as the popover opens. */}
			<button
				type="button"
				aria-label="Open mode and instrument switcher"
				aria-expanded={isOpen}
				onClick={() => setIsOpen(true)}
				className={clsx(
					"fixed top-0 left-0 z-[101] flex pt-[calc(env(safe-area-inset-top)+14px)] pr-[12px] pb-[20px] pl-[calc(env(safe-area-inset-left)+12px)] transition-opacity duration-200 select-none",
					isOpen && "pointer-events-none opacity-0"
				)}
			>
				{/* A row of dots per switcher (modes, then instruments); the selected dot in each row
				    is filled, the rest dimmed — showing both what's available and what's chosen. */}
				<span className="flex flex-col items-start gap-[5px] rounded-full bg-black/30 px-[9px] py-[8px]">
					<span className="flex gap-[5px]">
						{modeOrder.map((m) => (
							<span
								key={m}
								className={clsx(
									"h-[5px] w-[5px] rounded-full",
									m === mode ? "bg-white" : "bg-white/30"
								)}
							/>
						))}
					</span>
					<span className="flex gap-[5px]">
						{instrumentList.map((i) => (
							<span
								key={i.id}
								className={clsx(
									"h-[5px] w-[5px] rounded-full",
									i.id === instrumentId ? "bg-white" : "bg-white/30"
								)}
							/>
						))}
					</span>
				</span>
			</button>

			<div
				ref={panelRef}
				role="dialog"
				aria-modal="true"
				aria-label="Mode and instrument"
				inert={!isOpen}
				className={clsx(
					anchorClass,
					// A min-width holds enough room for the fully fanned-out switchers, so opening one
					// doesn't grow the panel and closing it doesn't shrink it; the max-width keeps the
					// panel within the viewport on narrow screens. Fade only — no transform — so it
					// doesn't visibly shrink while closing.
					"relative flex min-w-[300px] max-w-[calc(100vw-24px)] flex-col gap-[12px] rounded-[16px] bg-black/50 p-[16px] text-white backdrop-blur-[2vmax] transition-opacity duration-200",
					isOpen ? "opacity-100" : "pointer-events-none opacity-0"
				)}
			>
				<button
					type="button"
					aria-label="Close"
					onClick={() => setIsOpen(false)}
					className="absolute top-[10px] right-[10px] z-[1] flex h-[28px] w-[28px] items-center justify-center text-white/70 transition-colors hover:text-white"
				>
					<IconClose className="h-[16px] w-[16px]" />
				</button>
				<div>
					<div className="mb-[8px] text-[15px] text-white/70">Mode</div>
					<ModeSwitcher
						mode={mode}
						onSelectMode={(m) => {
							onSelectMode(m);
							setIsOpen(false);
						}}
					/>
				</div>
				<div>
					<div className="mb-[8px] text-[15px] text-white/70">Instrument</div>
					<InstrumentSwitcher
						currentInstrumentId={instrumentId}
						onSelect={(id) => {
							onSelectInstrument(id);
							setIsOpen(false);
						}}
					/>
				</div>
			</div>
		</>
	);
}
