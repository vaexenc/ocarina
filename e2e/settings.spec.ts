import {expect, test} from "@playwright/test";
import {openSettings, settingsModal, startApp} from "./helpers";

test.beforeEach(async ({page}) => {
	await startApp(page);
});

test.describe("settings modal", () => {
	test("opens from the ocarina button", async ({page}) => {
		await expect(settingsModal(page)).toHaveCSS("opacity", "0");
		await openSettings(page);
	});

	test("closes with the close button", async ({page}) => {
		await openSettings(page);
		await page.getByRole("button", {name: "Close"}).click();
		await expect(settingsModal(page)).toHaveCSS("opacity", "0");
	});

	test("closes with the Escape key", async ({page}) => {
		await openSettings(page);
		await page.keyboard.press("Escape");
		await expect(settingsModal(page)).toHaveCSS("opacity", "0");
	});
});
