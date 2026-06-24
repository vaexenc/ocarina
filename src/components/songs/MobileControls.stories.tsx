import type {Meta, StoryObj} from "@storybook/react-vite";
import MobileControls from "./MobileControls";

const meta = {
	title: "Songs/MobileControls",
	component: MobileControls,
	args: {inputPress: () => {}, inputRelease: () => {}},
	argTypes: {inputPress: {control: false}, inputRelease: {control: false}},
} satisfies Meta<typeof MobileControls>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
