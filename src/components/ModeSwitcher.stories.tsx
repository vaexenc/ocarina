import {Mode} from "@/modes";
import type {Meta, StoryObj} from "@storybook/react-vite";
import {useState} from "react";
import ModeSwitcher from "./ModeSwitcher";

const meta = {
	title: "Navigation/ModeSwitcher",
	component: ModeSwitcher,
	args: {mode: "song", onSelectMode: () => {}},
	render: function Render(args) {
		const [mode, setMode] = useState<Mode>(args.mode);
		return <ModeSwitcher {...args} mode={mode} onSelectMode={setMode} />;
	},
} satisfies Meta<typeof ModeSwitcher>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SongSelected: Story = {args: {mode: "song"}};
export const FreeSelected: Story = {args: {mode: "free"}};
export const SpeedrunSelected: Story = {args: {mode: "speedrun"}};
