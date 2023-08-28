export function lerp(value: number, min: number, max: number) {
	return (max - min) * value + min;
}

export function norm(value: number, min: number, max: number) {
	return (value - min) / (max - min);
}

export function map(
	value: number,
	sourceMin: number,
	sourceMax: number,
	destMin: number,
	destMax: number
) {
	return lerp(norm(value, sourceMin, sourceMax), destMin, destMax);
}

export function clamp(value: number, min: number, max: number) {
	return Math.min(Math.max(value, min), max);
}

export function checkIfMobileDevice() {
	return (
		/Mobile|Android|iOS|iPhone|iPad|Windows Phone/i.test(navigator.userAgent) ||
		"ontouchstart" in window ||
		// navigator.maxTouchPoints > 0 || // returns true in desktop chrome?
		window.innerWidth <= 768
	);
}

export function fetchSoundWithRetry(
	url: string,
	onfulfilled: (arrayBuffer: ArrayBuffer) => void,
	retryDelay?: number
) {
	const delay = retryDelay ? retryDelay * 1.5 : 1000;

	fetch(url)
		.then((response) => {
			response
				.arrayBuffer()
				.then((arrayBuffer) => {
					onfulfilled(arrayBuffer);
				})
				.catch(() => {
					setTimeout(() => {
						fetchSoundWithRetry(url, onfulfilled, delay);
					}, delay);
				});
		})
		.catch(() => {
			setTimeout(() => {
				fetchSoundWithRetry(url, onfulfilled, delay);
			}, delay);
		});
}
