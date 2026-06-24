// The single boundary to localStorage. Every persisted value goes through here, so the
// `ocarina.` namespace lives in exactly one place — which also makes `clearAll` (the `?reset`
// escape hatch) correct by construction: it can only wipe what these helpers could have written.
const PREFIX = "ocarina.";

function read(key: string): string | null {
	return localStorage.getItem(PREFIX + key);
}

function write(key: string, value: string) {
	localStorage.setItem(PREFIX + key, value);
}

// Persisted JSON value. A corrupt/incompatible stored value falls back to `fallback` rather than
// crashing on boot; callers are expected to merge defaults into the parsed shape if it's partial.
export function loadJson<T>(key: string, fallback: T): T {
	const raw = read(key);
	if (raw === null) return fallback;
	try {
		return JSON.parse(raw) as T;
	} catch {
		return fallback;
	}
}

export function saveJson(key: string, value: unknown) {
	write(key, JSON.stringify(value));
}

// A string value validated against a known set — guards against an unknown/renamed id lingering in
// storage. The single cast is owned here so callers stay cast-free.
export function loadEnum<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
	const raw = read(key);
	return raw !== null && (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback;
}

export function saveString(key: string, value: string) {
	write(key, value);
}

export function loadFlag(key: string): boolean {
	return read(key) !== null;
}

export function setFlag(key: string) {
	write(key, "1");
}

// Wipe every persisted value (the `?reset` escape hatch). Owned here so it stays in sync with the
// namespace the writers above use.
export function clearAll() {
	for (const key of Object.keys(localStorage)) {
		if (key.startsWith(PREFIX)) localStorage.removeItem(key);
	}
}
