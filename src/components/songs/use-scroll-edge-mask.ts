import {useLayoutEffect, useRef, useState} from "react";

// Full literal class strings so Tailwind's static scanner detects them
// (interpolation would hide the class names from the scanner).
const maskUp =
	"[-webkit-mask-image:linear-gradient(180deg,rgba(0,0,0,1)_0%,rgba(0,0,0,1)_95%,rgba(0,0,0,0)_100%)] [mask-image:linear-gradient(180deg,rgba(0,0,0,1)_0%,rgba(0,0,0,1)_95%,rgba(0,0,0,0)_100%)]";
const maskDown =
	"[-webkit-mask-image:linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(0,0,0,1)_5%,rgba(0,0,0,1)_100%)] [mask-image:linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(0,0,0,1)_5%,rgba(0,0,0,1)_100%)]";
const maskBoth =
	"[-webkit-mask-image:linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(0,0,0,1)_5%,rgba(0,0,0,1)_95%,rgba(0,0,0,0)_100%)] [mask-image:linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(0,0,0,1)_5%,rgba(0,0,0,1)_95%,rgba(0,0,0,0)_100%)]";

/**
 * Tracks the scroll position of a container and returns a mask class that softens whichever edge(s)
 * have content scrolled past them. Pass a `key` that changes whenever the content height can change
 * (e.g. the visible sections) so the measurement re-runs.
 */
export function useScrollEdgeMask(key: string) {
	const ref = useRef<HTMLDivElement>(null);
	const [scrolledUp, setScrolledUp] = useState(false);
	const [scrolledDown, setScrolledDown] = useState(false);

	useLayoutEffect(() => {
		const element = ref.current;
		if (!element) return;

		const update = () => {
			if (element.scrollHeight <= element.clientHeight) {
				setScrolledUp(false);
				setScrolledDown(false);
			} else if (element.scrollTop === 0) {
				setScrolledUp(true);
				setScrolledDown(false);
			} else if (element.scrollTop + element.clientHeight >= element.scrollHeight - 1) {
				setScrolledUp(false);
				setScrolledDown(true);
			} else {
				setScrolledUp(true);
				setScrolledDown(true);
			}
		};

		// A ResizeObserver re-measures whenever the container or its content settles after mount
		// (layout/logos loading, the grow layout resizing) — the one-shot update() below can run
		// before scrollHeight is final, which left the edge mask wrong on mount.
		const resizeObserver = new ResizeObserver(update);
		resizeObserver.observe(element);
		for (const child of Array.from(element.children)) {
			resizeObserver.observe(child);
		}

		element.addEventListener("scroll", update);
		update();

		return () => {
			resizeObserver.disconnect();
			element.removeEventListener("scroll", update);
		};
	}, [key]);

	const maskClass =
		scrolledUp && scrolledDown ? maskBoth : scrolledUp ? maskUp : scrolledDown ? maskDown : "";

	return {ref, maskClass};
}
