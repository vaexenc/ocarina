import {expect, test} from "@playwright/test";
import {currentMode, dismissLoadingScreen, startApp} from "./helpers";
import {
	bestTime,
	category,
	playSet,
	playSong,
	progress,
	resetButton,
	seedBestTime,
	speedrunSetSize,
	timer,
} from "./speedrun-helpers";

// `?speedrun` is a deep-link that switches to (and persists) speedrun mode; combining it with
// `?reset` gives a clean, deterministic starting state. The default set is "both" (OoT+MM, 21
// songs); completion tests cycle to "OoT" (12 songs) to keep the playthrough short.
test.beforeEach(async ({page}) => {
	await startApp(page, "?reset&speedrun");
});

test.describe("speedrun mode", () => {
	test("the deep-link starts in speedrun mode with the HUD", async ({page}) => {
		await expect(currentMode(page)).toHaveText("Speedrun");
		await expect(category(page)).toBeVisible();
	});

	test("cycles the category through the full order", async ({page}) => {
		await expect(category(page)).toHaveText("OoT+MM");
		await category(page).click();
		await expect(category(page)).toHaveText("OoT");
		await category(page).click();
		await expect(category(page)).toHaveText("MM");
		await category(page).click();
		await expect(category(page)).toHaveText("OoT+MM");
	});

	test("persists the selected category across a reload", async ({page}) => {
		await category(page).click();
		await expect(category(page)).toHaveText("OoT");

		// Reload without `?reset` so the persisted set survives.
		await page.goto("/?speedrun");
		await dismissLoadingScreen(page);

		await expect(category(page)).toHaveText("OoT");
	});

	test("shows an idle HUD before the first note", async ({page}) => {
		await expect(timer(page)).toHaveText("00:00.00");
		await expect(bestTime(page)).not.toHaveText(/\d/); // "Best: —", no time yet
		await expect(resetButton(page)).toBeDisabled();
	});

	test("starts the clock and enables reset on the first note", async ({page}) => {
		await expect(resetButton(page)).toBeDisabled();

		await page.keyboard.press("ArrowLeft");

		await expect(timer(page)).not.toHaveText("00:00.00");
		await expect(resetButton(page)).toBeEnabled();
	});

	test("increments the progress counter as songs are completed", async ({page}) => {
		const total = speedrunSetSize("both");
		await expect(progress(page)).toHaveText(`00/${total}`);

		await playSong(page, "zeldas-lullaby");
		await expect(progress(page)).toHaveText(`01/${total}`);

		await playSong(page, "eponas-song");
		await expect(progress(page)).toHaveText(`02/${total}`);
	});

	test("completing the set freezes the timer and records a first best", async ({page}) => {
		await category(page).click(); // OoT
		await expect(bestTime(page)).not.toHaveText(/\d/); // no prior best

		await playSet(page, "oot");

		await expect(page.getByText("New Record!", {exact: true})).toBeVisible();
		await expect(progress(page)).toBeHidden(); // replaced by the result text
		await expect(bestTime(page)).toHaveText(/^Best: \d\d:\d\d\.\d\d$/);

		// The timer is frozen on completion: its value no longer changes.
		const finalTime = await timer(page).textContent();
		await page.waitForTimeout(250);
		await expect(timer(page)).toHaveText(finalTime ?? "");
	});

	test("beating the stored best shows a new record", async ({page}) => {
		await seedBestTime(page, "oot", 999_999); // far slower than any real run

		await playSet(page, "oot");

		await expect(page.getByText("New Record!", {exact: true})).toBeVisible();
	});

	test("not beating the stored best shows a plain completion", async ({page}) => {
		await seedBestTime(page, "oot", 1); // impossibly fast, so the run can't beat it

		await playSet(page, "oot");

		await expect(page.getByText("Complete!", {exact: true})).toBeVisible();
		await expect(page.getByText("New Record!", {exact: true})).toBeHidden();
		// The seeded best (1ms → "00:00.00") is kept, not overwritten by the slower run.
		await expect(bestTime(page)).toHaveText("Best: 00:00.00");
	});

	test("persists the best time across a reload", async ({page}) => {
		await category(page).click(); // OoT
		await playSet(page, "oot");
		await expect(page.getByText("New Record!", {exact: true})).toBeVisible();

		await page.goto("/?speedrun");
		await dismissLoadingScreen(page);

		// Back on the persisted OoT set, the stored best is shown rather than "—".
		await expect(category(page)).toHaveText("OoT");
		await expect(bestTime(page)).toHaveText(/^Best: \d\d:\d\d\.\d\d$/);
	});

	test("starts a fresh run on the next note after completion", async ({page}) => {
		await category(page).click(); // OoT
		await playSet(page, "oot");
		await expect(page.getByText("New Record!", {exact: true})).toBeVisible();

		// Song input is briefly locked after completion; wait it out, then the next note starts a
		// brand-new run rather than lingering on the finished one.
		await page.waitForTimeout(1100);
		await playSong(page, "zeldas-lullaby");

		await expect(page.getByText("New Record!", {exact: true})).toBeHidden();
		await expect(progress(page)).toHaveText("01/12");
	});

	test("resets the run with a two-step button press", async ({page}) => {
		await playSong(page, "zeldas-lullaby");
		await expect(progress(page)).toHaveText("01/21");
		await expect(timer(page)).not.toHaveText("00:00.00");

		await resetButton(page).click(); // arm
		await expect(resetButton(page)).toHaveAttribute("aria-label", "Confirm reset run");
		await resetButton(page).click(); // confirm

		await expect(timer(page)).toHaveText("00:00.00");
		await expect(progress(page)).toHaveText("00/21");
		await expect(resetButton(page)).toBeDisabled();
	});

	test("resets the run with the Escape key", async ({page}) => {
		await playSong(page, "zeldas-lullaby");
		await expect(progress(page)).toHaveText("01/21");

		await page.keyboard.press("Escape"); // arm
		await expect(resetButton(page)).toHaveAttribute("aria-label", "Confirm reset run");
		await page.keyboard.press("Escape"); // confirm

		await expect(timer(page)).toHaveText("00:00.00");
		await expect(progress(page)).toHaveText("00/21");
		await expect(resetButton(page)).toBeDisabled();
	});

	test("abandons the run when the category changes mid-run", async ({page}) => {
		await playSong(page, "zeldas-lullaby");
		await expect(progress(page)).toHaveText("01/21");
		await expect(timer(page)).not.toHaveText("00:00.00");

		await category(page).click(); // OoT — abandons the in-progress "both" run

		await expect(category(page)).toHaveText("OoT");
		await expect(timer(page)).toHaveText("00:00.00");
		await expect(progress(page)).toHaveText("00/12");
		await expect(page.getByText("New Record!", {exact: true})).toBeHidden();
		await expect(page.getByText("Complete!", {exact: true})).toBeHidden();
	});
});
