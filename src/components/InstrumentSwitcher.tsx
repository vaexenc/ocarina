import {Instrument, InstrumentId, instrumentList} from "@/data/instrument-data";
import clsx from "clsx";
import FanOutSwitcher from "./FanOutSwitcher";

const buttonClass =
	"group flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full transition-all duration-150";

function InstrumentIcon({instrument, dimmed}: {instrument: Instrument; dimmed?: boolean}) {
	return (
		<img
			className={clsx(
				"h-[20px] w-auto transition-opacity duration-150",
				dimmed && "opacity-80 group-hover:opacity-100"
			)}
			src={instrument.iconSrc}
			draggable={false}
			alt=""
		/>
	);
}

/**
 * The instrument selector. Collapsed it's a single circle showing the current instrument; hovering
 * (or tapping, for touch) fans the other instruments out to the right. All instruments render in
 * their fixed list order (ocarina, trumpet, drums, guitar) and keep that order regardless of which
 * is selected — the rest simply shrink to zero width when collapsed. The fan-out interaction lives
 * in {@link FanOutSwitcher}; this only describes the icon buttons.
 */
export default function InstrumentSwitcher({
	currentInstrumentId,
	onSelect,
}: {
	currentInstrumentId: InstrumentId;
	onSelect: (id: InstrumentId) => void;
}) {
	return (
		<FanOutSwitcher
			items={instrumentList}
			isSelected={(instrument) => instrument.id === currentInstrumentId}
			onSelect={(instrument) => onSelect(instrument.id)}
			renderItem={(instrument, {isCurrent, isOpen}) => ({
				key: instrument.id,
				title: instrument.name,
				ariaLabel: isCurrent ? `Instrument: ${instrument.name}` : instrument.name,
				className: clsx(
					buttonClass,
					isCurrent
						? "bg-black/80"
						: "cursor-pointer bg-black/45 hover:scale-105 hover:bg-black/75",
					// Non-selected buttons collapse to nothing when closed so the group shrinks to
					// just the selected circle, then slide out when opened.
					!isCurrent &&
						(isOpen
							? "ml-[2px] max-w-[36px] translate-x-0 overflow-hidden opacity-100"
							: "max-w-0 -translate-x-2 overflow-hidden opacity-0 pointer-events-none")
				),
				content: <InstrumentIcon instrument={instrument} dimmed={!isCurrent} />,
			})}
		/>
	);
}
