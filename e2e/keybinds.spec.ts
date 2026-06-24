import {expect, test, type Page} from "@playwright/test";
import {
	dismissLoadingScreen,
	keybindRow,
	openKeybinds,
	openSettings,
	rebindKey,
	settingsModal,
	startApp,
} from "./helpers";

test.beforeEach(async ({page}) => {
	await startApp(page);
});

/** Presses a sequence of keyboard keys in order, mimicking a player tapping out a song. */
async function pressKeys(page: Page, keys: string[]): Promise<void> {
	for (const key of keys) await page.keyboard.press(key);
}

/** The live region whose text announces the song just matched (empty when nothing is matched). */
function matchStatus(page: Page) {
	return page.getByRole("status");
}

async function closeSettings(page: Page): Promise<void> {
	await page.getByRole("button", {name: "Close"}).click();
	await expect(settingsModal(page)).toHaveCSS("opacity", "0");
}

test.describe("keybind settings", () => {
	test("rebinding a note key updates its displayed binding", async ({page}) => {
		await openSettings(page);
		await openKeybinds(page);

		await expect(keybindRow(page, "A")).toHaveAttribute("aria-label", "A: a");
		await rebindKey(page, "A", "z"); // asserts the row now reads "A: z"
	});

	test("matches a song played with the rebound keys", async ({page}) => {
		await openSettings(page);
		await openKeybinds(page);

		// Zelda's Lullaby is C-Left, C-Up, C-Right twice over; rebind those notes to letter keys.
		await rebindKey(page, "C-Left", "f");
		await rebindKey(page, "C-Up", "j");
		await rebindKey(page, "C-Right", "k");
		await closeSettings(page);

		// The default arrow keys are now unbound, so the old sequence registers no notes and matches
		// nothing — proving the rebind replaced the binding rather than adding a second one.
		await pressKeys(page, [
			"ArrowLeft",
			"ArrowUp",
			"ArrowRight",
			"ArrowLeft",
			"ArrowUp",
			"ArrowRight",
		]);
		await expect(matchStatus(page)).toBeEmpty();

		// The new keys complete the song and trigger the match.
		await pressKeys(page, ["f", "j", "k", "f", "j", "k"]);
		await expect(matchStatus(page)).toHaveText("You played Zelda's Lullaby.");
	});

	test("matches a song played with Shift held (uppercase keys)", async ({page}) => {
		await openSettings(page);
		await openKeybinds(page);

		await rebindKey(page, "C-Left", "f");
		await rebindKey(page, "C-Up", "j");
		await rebindKey(page, "C-Right", "k");
		await closeSettings(page);

		// Holding Shift makes the browser report the keys as uppercase ("F"/"J"/"K") — the same
		// event.key the binding sees under CapsLock. The note lookup normalizes case, so the song
		// still matches rather than the press being dropped.
		await pressKeys(page, ["Shift+f", "Shift+j", "Shift+k", "Shift+f", "Shift+j", "Shift+k"]);
		await expect(matchStatus(page)).toHaveText("You played Zelda's Lullaby.");
	});

	test("persists a rebound key across a reload", async ({page}) => {
		await openSettings(page);
		await openKeybinds(page);
		await rebindKey(page, "A", "z");
		await closeSettings(page);

		// Settings save on a 200ms debounce; let it flush, then reload without `?reset` so the
		// stored binding survives.
		await page.waitForTimeout(300);
		await page.goto("/");
		await dismissLoadingScreen(page);

		await openSettings(page);
		await openKeybinds(page);
		await expect(keybindRow(page, "A")).toHaveAttribute("aria-label", "A: z");
	});
});
