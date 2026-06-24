import {SpeedrunSet} from "@/modes";
import type {Meta, StoryObj} from "@storybook/react-vite";
import {useMemo, useState} from "react";
import SpeedrunTimer from "./SpeedrunTimer";

const meta = {
	title: "Speedrun/SpeedrunTimer",
	component: SpeedrunTimer,
	args: {
		bestMs: null,
		isNewBest: false,
		playedCount: 0,
		totalCount: 12,
		speedrunSet: "both",
		isInputEnabled: true,
		resetKey: " ",
		onReset: () => {},
		onSelectSpeedrunSet: () => {},
	},
	render: function Render(args) {
		const [set, setSet] = useState<SpeedrunSet>(args.speedrunSet);
		// A negative startTime is interpreted as an offset from "now", so the timer renders mid-run
		// and keeps ticking live (e.g. -73_200 => started 73.2s ago). Positive/null values pass through
		// as absolute timestamps, which is what the running app supplies.
		const startTime = useMemo(
			() =>
				args.startTime !== null && args.startTime < 0
					? performance.now() + args.startTime
					: args.startTime,
			[args.startTime]
		);
		return (
			<SpeedrunTimer
				{...args}
				startTime={startTime}
				speedrunSet={set}
				onSelectSpeedrunSet={setSet}
			/>
		);
	},
} satisfies Meta<typeof SpeedrunTimer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {
	args: {startTime: null, endTime: null},
};

export const Running: Story = {
	args: {
		startTime: -73_200,
		endTime: null,
		playedCount: 5,
		bestMs: 142_530,
	},
};

export const Complete: Story = {
	args: {
		startTime: 0,
		endTime: 98_640,
		playedCount: 12,
		bestMs: 102_530,
		isNewBest: true,
	},
};

export const CompleteNoRecord: Story = {
	args: {
		startTime: 0,
		endTime: 105_320,
		playedCount: 12,
		bestMs: 98_640,
		isNewBest: false,
	},
};

export const WithBestTime: Story = {
	args: {startTime: null, endTime: null, bestMs: 124_910},
};
