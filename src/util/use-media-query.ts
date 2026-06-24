import {useEffect, useState} from "react";

/**
 * Subscribes to a CSS media query and returns whether it currently matches, re-rendering whenever
 * that changes. Pass a static query string (e.g. `"(pointer: coarse)"` for touch devices).
 */
export function useMediaQuery(query: string): boolean {
	const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

	useEffect(() => {
		const mql = window.matchMedia(query);
		const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
		// Re-sync in case the query (or the match state) changed between render and effect.
		setMatches(mql.matches);
		mql.addEventListener("change", onChange);
		return () => mql.removeEventListener("change", onChange);
	}, [query]);

	return matches;
}

export const useIsTouch = (): boolean => useMediaQuery("(pointer: coarse)");
