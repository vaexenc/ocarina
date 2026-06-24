(async () => {
	const NOTE_DELAY_MS = 10;

	// note letter -> the keybind setting whose key triggers it (keybindsToNotes, inverted)
	const NOTE_TO_KEYBIND = {
		a: "keybindA",
		u: "keybindCUp",
		d: "keybindCDown",
		l: "keybindCLeft",
		r: "keybindCRight",
	};

	// Fallbacks if a key isn't found in stored settings (defaultSettingValues).
	const DEFAULT_KEYS = {
		keybindA: "a",
		keybindCUp: "ArrowUp",
		keybindCDown: "ArrowDown",
		keybindCLeft: "ArrowLeft",
		keybindCRight: "ArrowRight",
	};

	// id -> {name, notes} (song-data.ts: songs)
	const SONGS = {
		"zeldas-lullaby": {name: "Zelda's Lullaby", notes: ["l", "u", "r", "l", "u", "r"]},
		"eponas-song": {name: "Epona's Song", notes: ["u", "l", "r", "u", "l", "r"]},
		"sarias-song": {name: "Saria's Song", notes: ["d", "r", "l", "d", "r", "l"]},
		"suns-song": {name: "Sun's Song", notes: ["r", "d", "u", "r", "d", "u"]},
		"song-of-time": {name: "Song of Time", notes: ["r", "a", "d", "r", "a", "d"]},
		"song-of-storms": {name: "Song of Storms", notes: ["a", "d", "u", "a", "d", "u"]},
		"minuet-of-forest": {name: "Minuet of Forest", notes: ["a", "u", "l", "r", "l", "r"]},
		"bolero-of-fire": {name: "Bolero of Fire", notes: ["d", "a", "d", "a", "r", "d", "r", "d"]},
		"serenade-of-water": {name: "Serenade of Water", notes: ["a", "d", "r", "r", "l"]},
		"nocturne-of-shadow": {
			name: "Nocturne of Shadow",
			notes: ["l", "r", "r", "a", "l", "r", "d"],
		},
		"requiem-of-spirit": {name: "Requiem of Spirit", notes: ["a", "d", "a", "r", "d", "a"]},
		"prelude-of-light": {name: "Prelude of Light", notes: ["u", "r", "u", "r", "l", "u"]},
		"song-of-time-inverted": {
			name: "Inverted Song of Time",
			notes: ["d", "a", "r", "d", "a", "r"],
		},
		"song-of-time-double": {name: "Song of Double Time", notes: ["r", "r", "a", "a", "d", "d"]},
		"song-of-healing": {name: "Song of Healing", notes: ["l", "r", "d", "l", "r", "d"]},
		"song-of-soaring": {name: "Song of Soaring", notes: ["d", "l", "u", "d", "l", "u"]},
		"sonata-of-awakening": {
			name: "Sonata of Awakening",
			notes: ["u", "l", "u", "l", "a", "r", "a"],
		},
		"goron-lullaby": {name: "Goron Lullaby", notes: ["a", "r", "l", "a", "r", "l", "r", "a"]},
		"new-wave-bossa-nova": {
			name: "New Wave Bossa Nova",
			notes: ["l", "u", "l", "r", "d", "l", "r"],
		},
		"elegy-of-emptiness": {
			name: "Elegy of Emptiness",
			notes: ["r", "l", "r", "d", "r", "u", "l"],
		},
		"oath-to-order": {name: "Oath to Order", notes: ["r", "d", "a", "d", "r", "u"]},
	};

	// section -> ordered song ids (song-data.ts: songSlots)
	const SONG_SLOTS = {
		oot: [
			"zeldas-lullaby",
			"eponas-song",
			"sarias-song",
			"suns-song",
			"song-of-time",
			"song-of-storms",
			"minuet-of-forest",
			"bolero-of-fire",
			"serenade-of-water",
			"nocturne-of-shadow",
			"requiem-of-spirit",
			"prelude-of-light",
		],
		mm: [
			"song-of-time",
			"song-of-time-inverted",
			"song-of-time-double",
			"song-of-healing",
			"eponas-song",
			"song-of-soaring",
			"song-of-storms",
			"sonata-of-awakening",
			"goron-lullaby",
			"new-wave-bossa-nova",
			"elegy-of-emptiness",
			"oath-to-order",
		],
	};

	// set -> sections it covers, and a human label (logic.ts: setSections)
	const SET_SECTIONS = {oot: ["oot"], mm: ["mm"], both: ["oot", "mm"]};
	const SET_LABELS = {oot: "Ocarina of Time", mm: "Majora's Mask", both: "Both"};

	// The unique song ids to play for a set, deduped in section order (logic.ts: speedrunSongIds).
	const songIdsForSet = (set) => {
		const ids = [];
		const seen = new Set();
		for (const section of SET_SECTIONS[set]) {
			for (const id of SONG_SLOTS[section]) {
				if (!seen.has(id)) {
					seen.add(id);
					ids.push(id);
				}
			}
		}
		return ids;
	};

	const mode = localStorage.getItem("ocarina.mode");
	// settings.ts: loadSpeedrunSet falls back to "both" when nothing is stored.
	const set = localStorage.getItem("ocarina.speedrunSet") ?? "both";
	if (mode !== "speedrun") {
		console.error(
			`[sr-bot] Not in Speedrun mode. Select Speedrun (top-left), then run again. (mode=${mode ?? "song"})`
		);
		return;
	}
	if (!SET_SECTIONS[set]) {
		console.error(`[sr-bot] Unknown speedrun set "${set}".`);
		return;
	}

	if (document.querySelector('[class*="z-[10000]"]')) {
		console.error("[sr-bot] Loading screen still up — click to continue, then run again.");
		return;
	}

	let settings = {};
	try {
		settings = JSON.parse(localStorage.getItem("ocarina.userSettings") ?? "{}");
	} catch {
		// corrupt/missing settings — fall through to the defaults below
	}
	const keyFor = (letter) => {
		const id = NOTE_TO_KEYBIND[letter];
		return settings[id] ?? DEFAULT_KEYS[id];
	};

	const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
	const press = (key) => {
		window.dispatchEvent(new KeyboardEvent("keydown", {key, bubbles: true}));
		window.dispatchEvent(new KeyboardEvent("keyup", {key, bubbles: true}));
	};

	const songIds = songIdsForSet(set);
	console.log(
		`[sr-bot] Starting ${SET_LABELS[set]} run — ${songIds.length} songs (NOTE_DELAY_MS=${NOTE_DELAY_MS})…`
	);
	const startedAt = performance.now();
	for (const id of songIds) {
		const song = SONGS[id];
		for (const letter of song.notes) {
			press(keyFor(letter));
			await sleep(NOTE_DELAY_MS);
		}
		console.log(`[sr-bot] ✓ ${song.name}`);
	}
	const seconds = ((performance.now() - startedAt) / 1000).toFixed(2);
	console.log(`[sr-bot] Done — ${songIds.length} songs played (${seconds}s wall time).`);
})();
