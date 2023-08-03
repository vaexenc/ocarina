import {defineConfig} from "vite";
import react from "@vitejs/plugin-react-swc";
import injectHtmlPlugin from "./injectHtmlPlugin";

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react(), injectHtmlPlugin()]
});
