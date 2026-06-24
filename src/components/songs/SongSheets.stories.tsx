import {songs} from "@/data/song-data";
import {speedrunSections, speedrunSongIds} from "@/speedrun/logic";
import type {Meta, StoryObj} from "@storybook/react-vite";
import SongSheets from "./SongSheets";

const meta = {
	title: "Songs/SongSheets",
	component: SongSheets,
	parameters: {fill: true},
	args: {
		currentSongId: null,
		sections: undefined,
		songIds: undefined,
		playedSongIds: undefined,
		isSpeedrun: false,
	},
	argTypes: {
		currentSongId: {control: "select", options: [null, ...Object.keys(songs)]},
		sections: {control: "check", options: ["oot", "mm"]},
	},
	render: (args) => (
		<div className="flex h-screen flex-col">
			<SongSheets {...args} />
		</div>
	),
} satisfies Meta<typeof SongSheets>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Highlighted: Story = {args: {currentSongId: "song-of-storms"}};

export const SingleSection: Story = {args: {sections: ["oot"]}};

export const Speedrun: Story = {
	args: {
		isSpeedrun: true,
		sections: speedrunSections("both"),
		songIds: speedrunSongIds("both"),
		currentSongId: "song-of-time",
		playedSongIds: new Set(["zeldas-lullaby", "eponas-song", "sarias-song"]),
	},
};
