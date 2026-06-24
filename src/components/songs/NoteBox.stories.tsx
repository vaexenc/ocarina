import {NoteName, NoteObject, Song, SongId, songs} from "@/data/song-data";
import type {Meta, StoryObj} from "@storybook/react-vite";
import NoteBox from "./NoteBox";

const sampleNotes: NoteName[] = ["l", "u", "r", "l", "u", "r"];
// NoteBox keys notes by id, so a repeated note (e.g. "l" twice) still needs a unique id — use the index.
const toNotes = (notes: readonly NoteName[]): NoteObject[] => notes.map((note, id) => ({note, id}));

const playedText = (songId: SongId) => {
	const song: Song = songs[songId];
	return (
		<span>
			{/* omitThe drops the article for names that read wrong with it (e.g. "You played Bolero of Fire"). */}
			You played {song.omitThe ? "" : "the"}{" "}
			<span style={{color: song.color}}>{song.name}</span>.
		</span>
	);
};

const meta = {
	title: "Songs/NoteBox",
	component: NoteBox,
	args: {
		variant: "sheet",
		className: "max-w-[410px]",
		text: <span style={{color: "#41a7ee"}}>Zelda's Lullaby</span>,
		notes: toNotes(sampleNotes),
	},
	argTypes: {
		variant: {control: "inline-radio", options: ["sheet", "player", "speedrun"]},
		text: {control: false},
		notes: {control: false},
	},
} satisfies Meta<typeof NoteBox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Sheet: Story = {};

export const Highlighted: Story = {
	args: {isHighlighted: true},
};

export const FlashingAndBentNotes: Story = {
	args: {
		notes: [
			{note: "l", id: 0},
			{note: "u", id: 1, isBent: true},
			{note: "r", id: 2},
			{note: "a", id: 3, isFlashing: true},
		],
	},
};

export const Player: Story = {
	args: {
		variant: "player",
		className: "w-[500px]",
		text: playedText("song-of-storms"),
		notes: toNotes(songs["song-of-storms"].notes),
	},
};

export const PlayerOmitThe: Story = {
	args: {
		variant: "player",
		className: "w-[500px]",
		text: playedText("zeldas-lullaby"),
		notes: toNotes(songs["zeldas-lullaby"].notes),
	},
};

export const Speedrun: Story = {
	args: {variant: "speedrun", className: "max-w-[350px]"},
};

export const SpeedrunPlayed: Story = {
	args: {variant: "speedrun", className: "max-w-[350px]", isPlayed: true},
};
