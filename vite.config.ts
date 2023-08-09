import {defineConfig} from "vite";
import react from "@vitejs/plugin-react-swc";
import injectHtmlPlugin from "./injectHtmlPlugin";
import {ViteMinifyPlugin} from "vite-plugin-minify";
import {resolve} from "path";

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react(), injectHtmlPlugin(), ViteMinifyPlugin()],
	resolve: {
		alias: {
			"/": resolve(__dirname),
		},
	},
});
