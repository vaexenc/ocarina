import {useDismiss} from "@/util/use-dismiss";
import {useRef, useState} from "react";

export type FanOutItemState = {isCurrent: boolean; isOpen: boolean; index: number};

export type FanOutItem = {
	key: string;
	className: string;
	ariaLabel: string;
	title?: string;
	content: React.ReactNode;
};

/**
 * The shared interaction shell for the top-left slide-out switchers (mode, instrument). It owns the
 * open/dismiss state, the staggered fan-out timing, and the click dispatch — clicking the current
 * item toggles the fan-out, clicking any other selects it and closes. Appearance is left entirely to
 * `renderItem`: the pills vs. icons and their collapse styling differ between switchers, so only the
 * behaviour is shared here.
 *
 * Positioning is left to the parent: this renders only the inline group, so it can be placed (and
 * stacked) without any baked-in coordinates of its own.
 */
export default function FanOutSwitcher<T>({
	items,
	isSelected,
	onSelect,
	renderItem,
}: {
	items: readonly T[];
	isSelected: (item: T) => boolean;
	onSelect: (item: T) => void;
	renderItem: (item: T, state: FanOutItemState) => FanOutItem;
}) {
	const [isOpen, setIsOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	// Close when clicking (or tapping) anywhere outside the switcher.
	useDismiss({isOpen, ref: containerRef, onDismiss: () => setIsOpen(false)});

	return (
		<div ref={containerRef} className="flex w-fit items-center rounded-full bg-black/30">
			{items.map((item, index) => {
				const isCurrent = isSelected(item);
				const rendered = renderItem(item, {isCurrent, isOpen, index});
				return (
					<button
						key={rendered.key}
						type="button"
						title={rendered.title}
						aria-label={rendered.ariaLabel}
						aria-expanded={isCurrent ? isOpen : undefined}
						style={{
							// Stagger the fan-out so the items emerge one after another.
							transitionDelay: isOpen && !isCurrent ? `${index * 30}ms` : "0ms",
						}}
						className={rendered.className}
						onClick={() => {
							if (isCurrent) {
								setIsOpen((open) => !open);
							} else {
								onSelect(item);
								setIsOpen(false);
							}
						}}
					>
						{rendered.content}
					</button>
				);
			})}
		</div>
	);
}
