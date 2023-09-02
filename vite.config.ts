import react from "@vitejs/plugin-react-swc";
import {resolve} from "path";
import {defineConfig} from "vite";
import {ViteMinifyPlugin} from "vite-plugin-minify";
import injectHtmlPlugin from "./injectHtmlPlugin";

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react(), injectHtmlPlugin(), ViteMinifyPlugin()],
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
