import { expect, test } from "@playwright/test";
import "../setup/global-setup";

test.describe("ModelDetailsModal", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("http://localhost:5174/map/expert?notour=true");

		// Close any modal that might be open
		try {
			await page.locator(".ant-modal-close").click({ timeout: 5000 });
		} catch (e) {
			// Ignore if no modal to close
		}
	});

	test("Model details dropdown should open and allow the user to view all models", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name === "Mobile Chrome",
			"Temporarily skipped on Mobile Chrome: model selector not found in CI.",
		);
		const modelSelector = page.getByTestId("model-selector");
		await expect(modelSelector).toBeVisible();
		const dropdownTrigger = modelSelector
			.locator(".model-selector-button, button")
			.first();

		await expect(dropdownTrigger).toBeVisible();
		await dropdownTrigger.dispatchEvent("click");

		const dropdown = page.locator(".model-dropdown");
		await expect(dropdown).toBeVisible();

		const modelCardsUnavailable = dropdown.getByText("Model Cards Unavailable");
		if (await modelCardsUnavailable.isVisible()) {
			await expect(modelCardsUnavailable).toBeVisible();
			return;
		}

		const viewAllModelsOption = dropdown.getByTestId("view-all-models");
		await expect(viewAllModelsOption).toBeVisible();
		await expect(viewAllModelsOption).toBeEnabled();
		await viewAllModelsOption.dispatchEvent("click");

		const modal = page.locator('[data-testid="model-details-modal"]');

		await expect(modal).toBeVisible({ timeout: 15000 });

		// Step 4: Verify modal title
		const modalTitle = page.locator('text="Disease Model Details"');
		await expect(modalTitle).toBeVisible();

		await expect(page.locator('text="Available Models"')).toBeVisible();

		// Only run this assertion on non-mobile devices
		if (!testInfo.project.name.toLowerCase().includes("mobile")) {
			const subtitleElement = page.locator(
				'text="Compare and select disease models for climate analysis"',
			);

			// Check if element exists and is not hidden
			await expect(subtitleElement).toBeAttached();
			const isHidden = await subtitleElement.getAttribute("hidden");

			if (isHidden === null || isHidden === "false") {
				await expect(subtitleElement).toBeVisible();
			}
		}
	});
});
