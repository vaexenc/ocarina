import AxeBuilder from "@axe-core/playwright";
import {expect, test} from "@playwright/test";
import {openSettings, startApp} from "./helpers";

// A smoke check that the two primary surfaces stay free of the high-impact axe violations. We gate
// on critical/serious only: lower-impact best-practice findings and the contrast results axe can't
// resolve over the parallax scenery (reported as `incomplete`, not `violations`) would make this
// flaky without catching real regressions.
function blockingViolations(violations: Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"]) {
	return violations
		.filter((v) => v.impact === "critical" || v.impact === "serious")
		.map((v) => v.id);
}

test.describe("accessibility (axe)", () => {
	test("main view has no critical or serious violations", async ({page}) => {
		await startApp(page);
		const {violations} = await new AxeBuilder({page}).analyze();
		expect(blockingViolations(violations)).toEqual([]);
	});

	test("settings modal has no critical or serious violations", async ({page}) => {
		await startApp(page);
		await openSettings(page);
		const {violations} = await new AxeBuilder({page}).analyze();
		expect(blockingViolations(violations)).toEqual([]);
	});
});
