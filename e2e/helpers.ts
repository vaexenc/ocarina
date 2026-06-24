import {expect, type Page} from "@playwright/test";

// Shared building blocks for the e2e specs. Every test boots through `startApp`, which lands on the
// ready main UI, and then drives the same top-left switchers and settings modal via the helpers
// below — so the selectors live in exactly one place.

/** Boots the app fresh (`?reset` wipes any persisted state) and dismisses the loading screen. */
export async function startApp(page: Page, query = "?reset"): Promise<void> {
	await page.goto(query.startsWith("/") ? query : `/${query}`);
	await dismissLoadingScreen(page);
	await expect(currentMode(page)).toBeVisible();
}

/** Waits for assets to finish loading, then clicks through the loading screen. */
export async function dismissLoadingScreen(page: Page): Promise<void> {
	// The continue affordance is animated in only once progress reaches 100%, so its presence is
	// the signal that every asset has loaded and the screen is ready to be dismissed.
	const continuePrompt = page.locator(".animate-continue");
	await expect(continuePrompt).toBeVisible({timeout: 30_000});
	await continuePrompt.click();
}

/** The mode switcher pill for the currently-selected mode (aria-label "Mode: <label>"). */
export function currentMode(page: Page) {
	return page.getByRole("button", {name: /^Mode: /});
}

/** The instrument switcher button for the currently-selected instrument. */
export function currentInstrument(page: Page) {
	return page.getByRole("button", {name: /^Instrument: /});
}

/** Fans out the mode switcher and selects the mode with the given label. */
export async function selectMode(page: Page, label: string): Promise<void> {
	await currentMode(page).click();
	await page.getByRole("button", {name: label, exact: true}).click();
}

/** Fans out the instrument switcher and selects the instrument with the given name. */
export async function selectInstrument(page: Page, name: string): Promise<void> {
	await currentInstrument(page).click();
	await page.getByRole("button", {name, exact: true}).click();
}

/** Opens the settings modal and waits for it to fade in. */
export async function openSettings(page: Page): Promise<void> {
	await page.getByTitle("Settings & More").click();
	await expect(settingsModal(page)).toHaveCSS("opacity", "1");
}

/**
 * The settings modal overlay. It stays mounted and toggles opacity rather than unmounting, so
 * open/closed is asserted via its computed opacity rather than visibility.
 */
export function settingsModal(page: Page) {
	return page.locator(".fixed.inset-0", {has: page.getByRole("heading", {name: "Settings"})});
}

/** Expands the collapsible "Keybinds" group in the settings modal so its rows are interactable. */
export async function openKeybinds(page: Page): Promise<void> {
	const toggle = page.getByRole("button", {name: "Keybinds"});
	await toggle.click();
	await expect(toggle).toHaveAttribute("aria-expanded", "true");
}

/** A keybind row, located by its setting name (e.g. "A", "C-Left") regardless of its bound key. */
export function keybindRow(page: Page, name: string) {
	return page.getByRole("button", {name: new RegExp(`^${name}: `)});
}

/**
 * Rebinds the keybind row named `name` to `key`: clicks the row to arm it ("press a key"), then
 * dispatches the key. The settings modal must be open with the Keybinds group expanded.
 */
export async function rebindKey(page: Page, name: string, key: string): Promise<void> {
	const row = keybindRow(page, name);
	await row.click();
	await expect(row).toHaveAttribute("aria-label", `${name}: press a key`);
	await page.keyboard.press(key);
	// The row's label echoes the new binding, with Space spelled out (mirroring the modal's display).
	await expect(row).toHaveAttribute("aria-label", `${name}: ${key === " " ? "Space" : key}`);
}
