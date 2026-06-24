import type {Meta, StoryObj} from "@storybook/react-vite";
import Background from "./Background";

const meta = {
	title: "Scenery/Background",
	component: Background,
	parameters: {fill: true},
	args: {isParallaxOn: true},
} satisfies Meta<typeof Background>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ParallaxOn: Story = {args: {isParallaxOn: true}};

export const ParallaxOff: Story = {args: {isParallaxOn: false}};
