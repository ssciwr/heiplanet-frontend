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
	const expertiseModal = page.getByRole("dialog", {
		name: /choose your experience/i,
	});
	await expect(expertiseModal).toBeVisible({
		timeout: 120000,
	});
	await expect(page.locator("body")).toContainText("Guided Mode");
	await expect(page.locator("body")).toContainText("Expert Mode");

	await page.getByTestId("expert-mode-card").dispatchEvent("click");

	// Wait for modal to close
	await expect(expertiseModal).toBeHidden({ timeout: 15000 });

	// Verify expert mode is active
	await expect(
		page.locator("small").filter({ hasText: /^Expert Mode$/ }),
	).toBeVisible({
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
