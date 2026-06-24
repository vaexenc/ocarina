import {defaultSettingValues, SettingValues} from "@/settings/setting-fields";
import type {Meta, StoryObj} from "@storybook/react-vite";
import {useState} from "react";
import MetaModal from "./MetaModal";

const meta = {
	title: "Overlays/MetaModal",
	component: MetaModal,
	parameters: {fill: true},
	args: {
		isOpen: true,
		isSwitcherOpen: false,
		isTouch: false,
		onOpen: () => {},
		onClose: () => {},
		settings: defaultSettingValues,
		setSettings: () => {},
	},
	argTypes: {
		isOpen: {control: false},
		onOpen: {control: false},
		onClose: {control: false},
		settings: {control: false},
		setSettings: {control: false},
	},
	render: function Render(args) {
		const [isOpen, setIsOpen] = useState(args.isOpen);
		const [settings, setSettings] = useState<SettingValues>(defaultSettingValues);
		return (
			<MetaModal
				{...args}
				isOpen={isOpen}
				onOpen={() => setIsOpen(true)}
				onClose={() => setIsOpen(false)}
				settings={settings}
				setSettings={setSettings}
			/>
		);
	},
} satisfies Meta<typeof MetaModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {};

export const Closed: Story = {args: {isOpen: false}};

export const Touch: Story = {args: {isTouch: true}};
