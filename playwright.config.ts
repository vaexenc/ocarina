import {defineConfig} from "@playwright/test";

// E2E tests run against the Vite dev server. Playwright starts it automatically (reusing an
// already-running one locally) so `npm run test:e2e` works from a clean checkout.
const PORT = 5173;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	reporter: "html",
	use: {
		baseURL,
		trace: "on-first-retry",
	},
	projects: [{name: "chromium", use: {browserName: "chromium"}}],
	webServer: {
		command: "npm run dev",
		url: baseURL,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
	},
});
