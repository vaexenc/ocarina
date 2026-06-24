import {RefObject, useEffect, useRef} from "react";

/**
 * Dismisses a transient UI element (popover, switcher) on a pointer-down outside `ref`, and
 * optionally on Escape. Listeners are attached only while `isOpen`, so the same gesture that opened
 * it can't immediately re-close it. `onDismiss` is read through a ref, so passing an inline
 * `() => setOpen(false)` doesn't re-subscribe the listeners on every render.
 */
export function useDismiss({
	isOpen,
	ref,
	onDismiss,
	withEscape = false,
}: {
	isOpen: boolean;
	ref: RefObject<HTMLElement | null>;
	onDismiss: () => void;
	withEscape?: boolean;
}) {
	const onDismissRef = useRef(onDismiss);
	onDismissRef.current = onDismiss;

	useEffect(() => {
		if (!isOpen) return;
		const dismiss = () => onDismissRef.current();
		const onPointerDown = (event: PointerEvent) => {
			if (!ref.current?.contains(event.target as Node)) dismiss();
		};
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") dismiss();
		};
		window.addEventListener("pointerdown", onPointerDown);
		if (withEscape) window.addEventListener("keydown", onKeyDown);
		return () => {
			window.removeEventListener("pointerdown", onPointerDown);
			if (withEscape) window.removeEventListener("keydown", onKeyDown);
		};
	}, [isOpen, ref, withEscape]);
}
