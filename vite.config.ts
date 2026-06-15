import react from "@vitejs/plugin-react-swc";
import {defineConfig} from "vite";
import {ViteMinifyPlugin} from "vite-plugin-minify";
import svgr from "vite-plugin-svgr";

// Exposed to index.html as %VITE_BUILD_DATE% (UTC, "YYYY-MM-DD HH:MM:SS UTC").
process.env.VITE_BUILD_DATE =
	new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";

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
		ViteMinifyPlugin(),
	],
	build: {
		assetsDir: "./",
	},
	base: "/",
});
