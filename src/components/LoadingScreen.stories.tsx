import type {Meta, StoryObj} from "@storybook/react-vite";
import {LoadingScreenView} from "./LoadingScreen";

const meta = {
	title: "Screens/LoadingScreen",
	component: LoadingScreenView,
	parameters: {fill: true},
	args: {
		progress: 100,
		failedCount: 0,
		isTouch: false,
		showControls: true,
		keybindsAreDefault: true,
		isFadingOut: false,
		onContinue: () => {},
	},
	argTypes: {
		progress: {control: {type: "range", min: 0, max: 100, step: 1}},
		failedCount: {control: {type: "number", min: 0}},
	},
} satisfies Meta<typeof LoadingScreenView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {args: {progress: 0}};

export const Midway: Story = {args: {progress: 50}};

export const Complete: Story = {args: {progress: 100}};

export const Touch: Story = {args: {progress: 100, isTouch: true}};

export const WithoutControlHints: Story = {args: {progress: 100, showControls: false}};

export const LoadFailed: Story = {args: {progress: 40, failedCount: 3}};
