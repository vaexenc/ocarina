import {InstrumentId} from "@/data/instrument-data";
import type {Meta, StoryObj} from "@storybook/react-vite";
import {useState} from "react";
import InstrumentSwitcher from "./InstrumentSwitcher";

const meta = {
	title: "Navigation/InstrumentSwitcher",
	component: InstrumentSwitcher,
	args: {currentInstrumentId: "ocarina", onSelect: () => {}},
	argTypes: {
		currentInstrumentId: {
			control: "inline-radio",
			options: ["ocarina", "deku-trumpet", "goron-drum", "zora-guitar"],
		},
	},
	render: function Render(args) {
		const [id, setId] = useState<InstrumentId>(args.currentInstrumentId);
		return <InstrumentSwitcher {...args} currentInstrumentId={id} onSelect={setId} />;
	},
} satisfies Meta<typeof InstrumentSwitcher>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ocarina: Story = {args: {currentInstrumentId: "ocarina"}};
export const DekuTrumpet: Story = {args: {currentInstrumentId: "deku-trumpet"}};
export const GoronDrum: Story = {args: {currentInstrumentId: "goron-drum"}};
export const ZoraGuitar: Story = {args: {currentInstrumentId: "zora-guitar"}};
