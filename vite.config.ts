/// <reference types="vitest/config" />
import {storybookTest} from "@storybook/addon-vitest/vitest-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import {playwright} from "@vitest/browser-playwright";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {defineConfig} from "vite";
import {ViteMinifyPlugin} from "vite-plugin-minify";
import svgr from "vite-plugin-svgr";

const dirname =
	typeof __dirname !== "undefined" ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// Exposed to index.html as %VITE_BUILD_DATE% (UTC, "YYYY-MM-DD HH:MM:SS UTC").
process.env.VITE_BUILD_DATE = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		tailwindcss(),
		react(),
		svgr({
			svgrOptions: {
				// keep the gradient ids authored in the button SVGs (each is unique
				// per file) instead of minifying them to short names that would
				// collide between inline SVGs rendered on the same page
				svgoConfig: {
					plugins: [
						{
							name: "preset-default",
							params: {
								overrides: {
									cleanupIds: false,
								},
							},
						},
					],
				},
			},
		}),
		ViteMinifyPlugin(),
	],
	resolve: {
		alias: {
			"@": path.join(dirname, "src"),
		},
	},
	server: {
		host: true,
	},
	build: {
		assetsDir: "./",
	},
	base: "/",
	test: {
		projects: [
			{
				extends: true,
				plugins: [
					// The plugin will run tests for the stories defined in your Storybook config
					// See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
					storybookTest({
						configDir: path.join(dirname, ".storybook"),
					}),
				],
				test: {
					name: "storybook",
					browser: {
						enabled: true,
						headless: true,
						provider: playwright({}),
						instances: [
							{
								browser: "chromium",
							},
						],
					},
				},
			},
		],
	},
});
