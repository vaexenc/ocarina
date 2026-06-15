import react from "@vitejs/plugin-react-swc";
import {resolve} from "path";
import {defineConfig} from "vite";
import {ViteMinifyPlugin} from "vite-plugin-minify";
import svgr from "vite-plugin-svgr";
import injectHtmlPlugin from "./inject-html-plugin";

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
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
							params: {overrides: {cleanupIds: false}},
						},
					],
				},
			},
		}),
		injectHtmlPlugin(),
		ViteMinifyPlugin(),
	],
	resolve: {
		alias: {
			"/": resolve(__dirname),
		},
	},
	build: {
		assetsDir: "./",
	},
	base: "./",
});
