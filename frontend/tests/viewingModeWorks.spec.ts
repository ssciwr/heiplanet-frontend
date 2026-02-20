import { expect, test } from "@playwright/test";
import "./setup/global-setup";

test("Expert mode can be selected from modal on /map", async ({ page }) => {
	const userAgent = await page.evaluate(() => navigator.userAgent);
	test.skip(
		userAgent.includes("Mobile") ||
			userAgent.includes("Android") ||
			userAgent.includes("iPhone"),
		"Skipping on mobile devices",
	);

	await page.goto("http://localhost:5174/map?notour=true");

	// Wait for modal to appear
	await expect(page.locator("text=Choose Your Experience")).toBeVisible({
		timeout: 120000,
	});
	const expertiseModal = page
		.locator(".ant-modal")
		.filter({ hasText: "Choose Your Experience" });
	await expect(page.locator("body")).toContainText("Guided Mode");
	await expect(page.locator("body")).toContainText("Expert Mode");

	// Click the expert mode card using data-testid
	// Use force click to bypass modal interference
	await page.waitForTimeout(1000) // clickability was iffy
	await page.getByTestId("expert-mode-card").click({ force: true });

	// Wait for modal to close
	await expect(expertiseModal).toBeHidden({ timeout: 15000 });

	// Verify expert mode is active
	await expect(page.locator("text=Choose Your Experience")).not.toBeVisible();
	await expect(page.locator("body")).toContainText("Expert Mode", {
		timeout: 10000,
	});
});

test("Expert mode appears when viewing /map/expert", async ({ page }) => {
	const userAgent = await page.evaluate(() => navigator.userAgent);
	test.skip(
		userAgent.includes("Mobile") ||
			userAgent.includes("Android") ||
			userAgent.includes("iPhone"),
		"Skipping on mobile devices",
	);

	await page.goto("http://localhost:5174/map/expert?notour=true");

	// Check that expert mode content is present
	await expect(page.locator("body")).toContainText("Expert Mode", {
		timeout: 10000,
	});
});
