import {expect, test} from "@playwright/test";
import {
	currentInstrument,
	currentMode,
	dismissLoadingScreen,
	selectInstrument,
	selectMode,
	startApp,
} from "./helpers";

test.beforeEach(async ({page}) => {
	await startApp(page);
});

test.describe("mode switcher", () => {
	test("defaults to Songs", async ({page}) => {
		await expect(currentMode(page)).toHaveText("Songs");
	});

	test("switches to another mode", async ({page}) => {
		await selectMode(page, "Free");
		await expect(currentMode(page)).toHaveText("Free");
	});

	test("persists the selected mode across a reload", async ({page}) => {
		await selectMode(page, "Speedrun");

		await page.reload();
		await dismissLoadingScreen(page);

		await expect(currentMode(page)).toHaveText("Speedrun");
	});
});

test.describe("instrument switcher", () => {
	test("defaults to the Ocarina", async ({page}) => {
		await expect(currentInstrument(page)).toHaveAttribute("aria-label", "Instrument: Ocarina");
	});

	test("switches to another instrument", async ({page}) => {
		await selectInstrument(page, "Goron Drum");
		await expect(currentInstrument(page)).toHaveAttribute(
			"aria-label",
			"Instrument: Goron Drum"
		);
	});
});
