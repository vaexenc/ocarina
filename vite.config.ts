import {defineConfig} from "vite";
import react from "@vitejs/plugin-react-swc";
import injectHtmlPlugin from "./injectHtmlPlugin";
import {ViteMinifyPlugin} from "vite-plugin-minify";

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react(), injectHtmlPlugin(), ViteMinifyPlugin()]
});
