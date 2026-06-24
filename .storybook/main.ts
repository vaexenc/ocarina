import type {StorybookConfig} from "@storybook/react-vite";

const config: StorybookConfig = {
	stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
	addons: [
		"@chromatic-com/storybook",
		"@storybook/addon-vitest",
		"@storybook/addon-a11y",
		"@storybook/addon-docs",
		"@storybook/addon-mcp",
	],
	framework: "@storybook/react-vite",
	core: {disableTelemetry: true},
	// Hide the gamified "Get started / Level up / Become an expert" onboarding
	// checklist widget at the bottom of the sidebar.
	features: {sidebarOnboardingChecklist: false},
	// Serve the app's public/ so the Chiaro font, song-sheet images and SVG buttons
	// resolve at the same absolute "/fonts", "/images" paths they use in the app.
	staticDirs: ["../public"],
};
export default config;
