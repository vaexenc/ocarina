import type {Meta, StoryObj} from "@storybook/react-vite";
import Toggle from "./Toggle";

const meta = {
	title: "UI/Toggle",
	component: Toggle,
	args: {isChecked: true},
} satisfies Meta<typeof Toggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const On: Story = {args: {isChecked: true}};

export const Off: Story = {args: {isChecked: false}};
