import {RefObject, useEffect} from "react";

const FOCUSABLE_SELECTOR = [
	"a[href]",
	"button:not([disabled])",
	"input:not([disabled])",
	"select:not([disabled])",
	"textarea:not([disabled])",
	'[tabindex]:not([tabindex="-1"])',
].join(",");

// getClientRects() is empty for display:none elements, so this drops the settings fields hidden on
// touch (and anything else removed from layout) without being fooled by fixed/absolute positioning.
const isVisible = (el: HTMLElement) => el.getClientRects().length > 0;

function focusableWithin(container: HTMLElement): HTMLElement[] {
	return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
		isVisible
	);
}

/**
 * Keeps keyboard focus inside `ref` while `isOpen`: moves focus into the panel on open, wraps
 * Tab/Shift+Tab at the ends, and restores focus to whatever was focused before opening (typically
 * the trigger) on close. Pair with `inert` on the container while closed so its controls also leave
 * the tab order. Listeners attach only while open, mirroring useDismiss.
 */
export function useFocusTrap({isOpen, ref}: {isOpen: boolean; ref: RefObject<HTMLElement | null>}) {
	useEffect(() => {
		const container = ref.current;
		if (!isOpen || !container) return;

		const previouslyFocused = document.activeElement as HTMLElement | null;
		(focusableWithin(container)[0] ?? container).focus();

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "Tab") return;
			const items = focusableWithin(container);
			if (items.length === 0) {
				event.preventDefault();
				return;
			}
			const first = items[0];
			const last = items[items.length - 1];
			const active = document.activeElement;
			if (event.shiftKey && (active === first || !container.contains(active))) {
				event.preventDefault();
				last.focus();
			} else if (!event.shiftKey && (active === last || !container.contains(active))) {
				event.preventDefault();
				first.focus();
			}
		};

		window.addEventListener("keydown", onKeyDown);
		return () => {
			window.removeEventListener("keydown", onKeyDown);
			if (previouslyFocused && document.contains(previouslyFocused)) {
				previouslyFocused.focus();
			}
		};
	}, [isOpen, ref]);
}
