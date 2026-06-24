import {defaultSettingValues} from "@/settings/setting-fields";
import type {Meta, StoryObj} from "@storybook/react-vite";
import {useEffect, useState} from "react";
import RangeInput from "./RangeInput";

const meta = {
	title: "UI/RangeInput",
	component: RangeInput,
	args: {
		className: "w-[300px]",
		ariaLabel: "Volume",
		min: 0,
		max: 1,
		step: 0.01,
		value: defaultSettingValues.volume,
		onChange: () => {},
	},
	argTypes: {
		className: {control: false},
		ariaLabel: {control: false},
		onChange: {control: false},
		value: {control: {type: "range", min: 0, max: 1, step: 0.01}},
	},
	render: function Render(args) {
		const [value, setValue] = useState(args.value);
		// Local state drives the controlled input as the user drags, but it must also re-sync when the
		// Storybook "value" control is changed externally — otherwise the slider ignores the control.
		useEffect(() => setValue(args.value), [args.value]);
		return (
			<RangeInput
				{...args}
				value={value}
				onChange={(e) => setValue(Number(e.target.value))}
			/>
		);
	},
} satisfies Meta<typeof RangeInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {args: {value: 0}};

export const Full: Story = {args: {value: 1}};
