import {expect, test} from "@playwright/test";
import {currentMode} from "./helpers";

test("loading screen reveals the app once dismissed", async ({page}) => {
	await page.goto("/?reset");

	const continuePrompt = page.locator(".animate-continue");
	await expect(continuePrompt).toBeVisible({timeout: 30_000});

	await continuePrompt.click();

	await expect(continuePrompt).toBeHidden();
	await expect(currentMode(page)).toBeVisible();
});
