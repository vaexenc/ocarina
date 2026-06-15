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

export function assertNever(value: never): never {
	throw new Error(`Unexpected value: ${String(value)}`);
}

export function checkIfMobileDevice() {
	// True when the device's primary pointer is coarse (finger/stylus), i.e. a
	// touch device. Unlike `"ontouchstart" in window` or a width check, this does
	// not fire for touchscreen laptops driven by a mouse, or narrow desktop windows.
	return window.matchMedia("(pointer: coarse)").matches;
}

export class FetchError extends Error {
	readonly status?: number;
	constructor(message: string, status?: number) {
		super(message);
		this.name = "FetchError";
		this.status = status;
	}
}

export type FetchAssetOptions<T> = {
	/** Turns the successful response into the desired value. Defaults to `response.arrayBuffer()`. */
	parse?: (response: Response) => Promise<T>;
	/** Total number of attempts before giving up (including the first). */
	maxAttempts?: number;
	/** Delay before the first retry, in ms. Doubles each attempt up to `maxDelay`. */
	baseDelay?: number;
	/** Upper bound for the backoff delay, in ms. */
	maxDelay?: number;
	/** Per-attempt timeout, in ms. A slower response is aborted and counts as a failed attempt. */
	timeout?: number;
	/** Aborts the whole operation (e.g. on unmount). No further retries happen once aborted. */
	signal?: AbortSignal;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** A 4xx (other than 408/429) means the request itself is wrong, so retrying is pointless. */
function isRetryableStatus(status: number) {
	if (status === 408 || status === 429) return true;
	return status < 400 || status >= 500;
}

/**
 * Fetches a single asset with bounded, exponential-backoff retries.
 *
 * Generic over the parsed result: by default it resolves to an `ArrayBuffer`, but pass a
 * `parse` callback to load JSON, text, blobs, etc. Rejects with a `FetchError` once the
 * attempts are exhausted, or with an `AbortError` if `signal` is aborted.
 */
export async function fetchAsset<T = ArrayBuffer>(
	url: string,
	options: FetchAssetOptions<T> = {}
): Promise<T> {
	const {
		parse = (response: Response) => response.arrayBuffer() as Promise<T>,
		maxAttempts = 5,
		baseDelay = 1000,
		maxDelay = 15000,
		timeout = 20000,
		signal,
	} = options;

	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

		const controller = new AbortController();
		const onExternalAbort = () => controller.abort();
		signal?.addEventListener("abort", onExternalAbort);
		const timer = setTimeout(() => controller.abort(), timeout);

		try {
			const response = await fetch(url, {signal: controller.signal});
			if (!response.ok) {
				throw new FetchError(
					`Failed to fetch ${url}: HTTP ${response.status}`,
					response.status
				);
			}
			return await parse(response);
		} catch (error) {
			// The caller asked to stop; surface it instead of retrying.
			if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

			const isLastAttempt = attempt === maxAttempts - 1;
			const nonRetryable =
				error instanceof FetchError &&
				error.status !== undefined &&
				!isRetryableStatus(error.status);
			if (isLastAttempt || nonRetryable) {
				throw error instanceof FetchError
					? error
					: new FetchError(`Failed to fetch ${url}: ${String(error)}`);
			}

			// Exponential backoff capped at maxDelay, with jitter to de-sync concurrent retries.
			const backoff = Math.min(baseDelay * 2 ** attempt, maxDelay);
			await sleep(backoff / 2 + Math.random() * (backoff / 2));
		} finally {
			clearTimeout(timer);
			signal?.removeEventListener("abort", onExternalAbort);
		}
	}

	// Unreachable: the loop either returns or throws on the last attempt.
	throw new FetchError(`Failed to fetch ${url}`);
}
