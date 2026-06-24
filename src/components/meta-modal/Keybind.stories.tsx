import type {Meta, StoryObj} from "@storybook/react-vite";
import Keybind from "./Keybind";

const meta = {
	title: "UI/Keybind",
	component: Keybind,
	args: {keyboardKey: "a", awaitingInput: false},
	render: (args) => (
		<div className="group w-fit">
			<Keybind {...args} />
		</div>
	),
} satisfies Meta<typeof Keybind>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Space: Story = {args: {keyboardKey: " "}};

export const AwaitingInput: Story = {args: {awaitingInput: true}};

export const Truncated: Story = {args: {keyboardKey: "VeryLongKeyName"}};
