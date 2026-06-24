/// <reference types="vite/client" />
import type {Decorator, Preview} from "@storybook/react-vite";
import "../src/styles/main.css";

// Render every story top-left with a small inset, the way these widgets sit in the app. Components
// that fill the whole canvas (scenery, full-screen overlays) opt out with parameters: {fill: true}.
const withPadding: Decorator = (Story, {parameters}) =>
	parameters.fill ? (
		<Story />
	) : (
		<div className="p-[12px]">
			<Story />
		</div>
	);

const preview: Preview = {
	parameters: {
		layout: "fullscreen",
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i,
			},
			disableSaveFromUI: true,
		},
		a11y: {
			test: "error",
		},
		backgrounds: {
			options: {
				gray: {name: "Gray", value: "#808080"},
			},
		},
	},

	initialGlobals: {
		backgrounds: {value: "gray"},
	},

	decorators: [withPadding],
};

export default preview;
