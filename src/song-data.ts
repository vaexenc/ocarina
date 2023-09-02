import {Songs} from "/src/types";

const songs: Songs = {
	"zeldas-lullaby": {
		name: "Zelda's Lullaby",
		color: "#6972ff",
		notes: ["l", "u", "r", "l", "u", "r"],
		omitThe: true,
	},

	"eponas-song": {
		name: "Epona's Song",
		color: "#f13a39",
		notes: ["u", "l", "r", "u", "l", "r"],
		omitThe: true,
	},

	"sarias-song": {
		name: "Saria's Song",
		color: "#41ee4b",
		notes: ["d", "r", "l", "d", "r", "l"],
		omitThe: true,
	},

	"suns-song": {
		name: "Sun's Song",
		color: "#daf730",
		notes: ["r", "d", "u", "r", "d", "u"],
	},

	"song-of-time": {
		name: "Song of Time",
		color: "#61aef6",
		notes: ["r", "a", "d", "r", "a", "d"],
	},

	"song-of-storms": {
		name: "Song of Storms",
		color: "#f590ad",
		notes: ["a", "d", "u", "a", "d", "u"],
	},

	"minuet-of-forest": {
		name: "Minuet of Forest",
		color: "#43f04c",
		notes: ["a", "u", "l", "r", "l", "r"],
	},

	"bolero-of-fire": {
		name: "Bolero of Fire",
		color: "#f13a39",
		notes: ["d", "a", "d", "a", "r", "d", "r", "d"],
	},

	"serenade-of-water": {
		name: "Serenade of Water",
		color: "#6972ff",
		notes: ["a", "d", "r", "r", "l"],
	},

	"requiem-of-spirit": {
		name: "Requiem of Spirit",
		color: "#daf730",
		notes: ["a", "d", "a", "r", "d", "a"],
	},

	"nocturne-of-shadow": {
		name: "Nocturne of Shadow",
		color: "#f590ad",
		notes: ["l", "r", "r", "a", "l", "r", "d"],
	},

	"prelude-of-light": {
		name: "Prelude of Light",
		color: "#61aef6",
		notes: ["u", "r", "u", "r", "l", "u"],
	},

	"song-of-time-inverted": {
		name: "Inverted Song of Time",
		color: "#61aef6",
		notes: ["d", "a", "r", "d", "a", "r"],
	},

	"song-of-time-double": {
		name: "Song of Double Time",
		color: "#61aef6",
		notes: ["r", "r", "a", "a", "d", "d"],
	},

	"song-of-healing": {
		name: "Song of Healing",
		color: "#f590ad",
		notes: ["l", "r", "d", "l", "r", "d"],
	},

	"song-of-soaring": {
		name: "Song of Soaring",
		color: "#e1e1e1",
		notes: ["d", "l", "u", "d", "l", "u"],
	},

	"sonata-of-awakening": {
		name: "Sonata of Awakening",
		color: "#43f04c",
		notes: ["u", "l", "u", "l", "a", "r", "a"],
	},

	"goron-lullaby": {
		name: "Goron Lullaby",
		color: "#f13a39",
		notes: ["a", "r", "l", "a", "r", "l", "r", "a"],
	},

	"new-wave-bossa-nova": {
		name: "New Wave Bossa Nova",
		color: "#6972ff",
		notes: ["l", "u", "l", "r", "d", "l", "r"],
	},

	"elegy-of-emptiness": {
		name: "Elegy of Emptiness",
		color: "#daf730",
		notes: ["r", "l", "r", "d", "r", "u", "l"],
	},

	"oath-to-order": {
		name: "Oath to Order",
		color: "#f590ad",
		notes: ["r", "d", "a", "d", "r", "u"],
	},
};

const songSlots = {
	"oot": {
		image: "images/oot.webp",
		songIds: [
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
	},

	"mm": {
		image: "images/mm.webp",
		songIds: [
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
	},
};

const noteMap = {
	u: {class: "note-up", image: "images/buttons/c-up.svg"},
	d: {class: "note-down", image: "images/buttons/c-down.svg"},
	l: {class: "note-left", image: "images/buttons/c-left.svg"},
	r: {class: "note-right", image: "images/buttons/c-right.svg"},
	a: {class: "note-a", image: "images/buttons/a.svg"},
};

export {noteMap, songSlots, songs};
