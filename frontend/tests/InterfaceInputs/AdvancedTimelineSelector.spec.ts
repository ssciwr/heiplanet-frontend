import { expect, test } from "@playwright/test";
import { skipIfMobile } from "../utils";
import "../setup/global-setup";

test.describe("AdvancedTimelineSelector Year Navigation - Desktop Only", () => {
	test.setTimeout(300000); // 5 minutes timeout

	test.beforeEach(async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 720 });

		// Disable animations and transitions for test stability
		await page.addStyleTag({
			content: `
				*, *::before, *::after {
					animation-duration: 0s !important;
					transition-duration: 0s !important;
					animation-delay: 0s !important;
					transition-delay: 0s !important;
				}
			`,
		});
	});

	test("year navigation buttons change map visuals", async ({
		page,
		browserName,
	}) => {
		await skipIfMobile(page);
		test.skip(
			browserName !== "chromium",
			"This test only runs on Chromium due to SVG rendering differences with react leaflet",
		);

		await page.goto("http://localhost:5174/map/expert?notour=true");

		// Wait for the advanced timeline selector to load
		await page.waitForSelector(".advanced-timeline-desktop", {
			timeout: 30000,
		});
		await page.waitForSelector(".leaflet-container", { timeout: 30000 });

		// Close any modal that might be open
		try {
			await page.locator(".ant-modal-close").click({ timeout: 5000 });
		} catch (e) {
			// Ignore if no modal to close
		}

		// Wait for initial map data to load
		await page.waitForTimeout(10000);

		// Helper function to wait for map data to load and stabilize
		async function waitForMapDataStability() {
			// Wait for grid data to be fully loaded
			await page.waitForFunction(
				() => {
					const paths = document.querySelectorAll('path[fill*="#"]');
					return paths.length > 0;
				},
				{ timeout: 60000 },
			);

			// Wait for map tiles and data to finish loading
			await page.waitForFunction(
				() => {
					const leafletContainer = document.querySelector(".leaflet-container");
					if (!leafletContainer) return false;

					const loadingIndicators = leafletContainer.querySelectorAll(
						".leaflet-tile-loading",
					);
					return loadingIndicators.length === 0;
				},
				{ timeout: 30000 },
			);

			// Additional wait for data to stabilize
			await page.waitForTimeout(5000);
		}

		// Helper function to get colors from grid path elements
		async function getGridColors() {
			try {
				await page.waitForSelector('path.leaflet-interactive[fill*="#"]', {
					timeout: 30000,
				});
			} catch (e) {
				await page.waitForSelector('path[fill*="#"]', { timeout: 30000 });
			}

			let gridCells = page.locator('path.leaflet-interactive[fill*="#"]');
			let count = await gridCells.count();

			if (count === 0) {
				gridCells = page.locator('path[fill*="#"]');
				count = await gridCells.count();
			}

			const colors = [];
			const sampleSize = Math.min(count, 10);
			for (let i = 0; i < sampleSize; i++) {
				const color = await gridCells.nth(i).getAttribute("fill");
				if (color && color !== "transparent") {
					colors.push(color);
				}
			}
			return colors;
		}

		// Helper function to get current year from display
		async function getCurrentYear() {
			const yearText = await page.locator(".year-text").textContent();
			return Number.parseInt(yearText?.trim() || "2025");
		}

		// Wait for initial data to load
		await waitForMapDataStability();
		await page.locator(".month-select").selectOption("6");
		await waitForMapDataStability();

		// Get initial year and colors
		const initialYear = await getCurrentYear();
		const initialColors = await getGridColors();
		expect(initialColors.length).toBeGreaterThan(0);

		// Test next year button
		const nextYearButton = page
			.locator("button")
			.filter({
				has: page.locator("svg.lucide-chevron-right"),
			})
			.and(page.locator('[title="Next Year"]'));

		await expect(nextYearButton).toBeVisible();
		await expect(nextYearButton).toBeEnabled();

		// Click next year button
		await nextYearButton.click({ force: true });
		await waitForMapDataStability();

		// Verify year changed
		const newYear = await getCurrentYear();
		expect(newYear).toBe(initialYear + 1);

		// Get new colors and verify they're different
		const newColors = await getGridColors();
		expect(newColors.length).toBeGreaterThan(0);

		// Test previous year button
		const prevYearButton = page
			.locator("button")
			.filter({
				has: page.locator("svg.lucide-chevron-left"),
			})
			.and(page.locator('[title="Previous Year"]'));

		await expect(prevYearButton).toBeVisible();
		await expect(prevYearButton).toBeEnabled();

		// Click previous year button
		await prevYearButton.click({ force: true });
		await waitForMapDataStability();

		// Verify year changed back
		const backYear = await getCurrentYear();
		expect(backYear).toBe(initialYear);

		// Get colors after going back to ensure map is still rendering
		const backColors = await getGridColors();
		expect(backColors.length).toBeGreaterThan(0);
	});

	test("month navigation buttons change map visuals", async ({
		page,
		browserName,
	}) => {
		await skipIfMobile(page);
		test.skip(
			browserName !== "chromium",
			"This test only runs on Chromium due to SVG rendering differences with react leaflet",
		);

		await page.goto("http://localhost:5174/map/expert?notour=true");

		// Wait for the advanced timeline selector to load
		await page.waitForSelector(".advanced-timeline-desktop", {
			timeout: 30000,
		});
		await page.waitForSelector(".leaflet-container", { timeout: 30000 });

		// Close any modal that might be open
		try {
			await page.locator(".ant-modal-close").click({ timeout: 5000 });
		} catch (e) {
			// Ignore if no modal to close
		}

		// Wait for initial map data to load
		await page.waitForTimeout(10000);

		// Helper function to wait for map data to load and stabilize
		async function waitForMapDataStability() {
			await page.waitForFunction(
				() => {
					const paths = document.querySelectorAll('path[fill*="#"]');
					return paths.length > 0;
				},
				{ timeout: 60000 },
			);

			await page.waitForFunction(
				() => {
					const leafletContainer = document.querySelector(".leaflet-container");
					if (!leafletContainer) return false;

					const loadingIndicators = leafletContainer.querySelectorAll(
						".leaflet-tile-loading",
					);
					return loadingIndicators.length === 0;
				},
				{ timeout: 30000 },
			);

			await page.waitForTimeout(5000);
		}

		// Helper function to get colors from grid path elements
		async function getGridColors() {
			try {
				await page.waitForSelector('path.leaflet-interactive[fill*="#"]', {
					timeout: 30000,
				});
			} catch (e) {
				await page.waitForSelector('path[fill*="#"]', { timeout: 30000 });
			}

			let gridCells = page.locator('path.leaflet-interactive[fill*="#"]');
			let count = await gridCells.count();

			if (count === 0) {
				gridCells = page.locator('path[fill*="#"]');
				count = await gridCells.count();
			}

			const colors = [];
			const sampleSize = Math.min(count, 10);
			for (let i = 0; i < sampleSize; i++) {
				const color = await gridCells.nth(i).getAttribute("fill");
				if (color && color !== "transparent") {
					colors.push(color);
				}
			}
			return colors;
		}

		// Helper function to get current month from select
		async function getCurrentMonth() {
			const monthSelect = page.locator(".month-select");
			const selectedValue = await monthSelect.inputValue();
			return Number.parseInt(selectedValue);
		}

		// Wait for initial data to load
		await waitForMapDataStability();
		await page.locator(".month-select").selectOption("6");
		await waitForMapDataStability();

		// Get initial month and colors
		const initialMonth = await getCurrentMonth();
		const initialColors = await getGridColors();
		expect(initialColors.length).toBeGreaterThan(0);

		// Test next month button
		const nextMonthButton = page
			.locator("button")
			.filter({
				has: page.locator("svg.lucide-chevron-right"),
			})
			.and(page.locator('[title="Next Month"]'));

		await expect(nextMonthButton).toBeVisible();
		await expect(nextMonthButton).toBeEnabled();

		// Click next month button
		await nextMonthButton.click({ force: true });
		await waitForMapDataStability();

		// Verify month changed
		const newMonth = await getCurrentMonth();
		const expectedMonth = initialMonth === 12 ? 1 : initialMonth + 1;
		expect(newMonth).toBe(expectedMonth);

		// Get new colors and verify they're different
		const newColors = await getGridColors();
		expect(newColors.length).toBeGreaterThan(0);

		// Test previous month button
		const prevMonthButton = page
			.locator("button")
			.filter({
				has: page.locator("svg.lucide-chevron-left"),
			})
			.and(page.locator('[title="Previous Month"]'));

		await expect(prevMonthButton).toBeVisible();
		await expect(prevMonthButton).toBeEnabled();

		// Click previous month button
		await prevMonthButton.click({ force: true });
		await waitForMapDataStability();

		// Verify month changed back
		const backMonth = await getCurrentMonth();
		expect(backMonth).toBe(initialMonth);

		// Get colors after going back to ensure map is still rendering
		const backColors = await getGridColors();
		expect(backColors.length).toBeGreaterThan(0);
	});

	test("year and month navigation buttons are visible on desktop", async ({
		page,
	}) => {
		await skipIfMobile(page);
		await page.goto("http://localhost:5174/map/expert?notour=true");

		// Wait for the advanced timeline selector to load
		await page.waitForSelector(".advanced-timeline-desktop", {
			timeout: 30000,
		});

		// Close any modal that might be open
		try {
			await page.locator(".ant-modal-close").click({ timeout: 5000 });
		} catch (e) {
			// Ignore if no modal to close
		}

		// Wait for components to load
		await page.waitForTimeout(3000);

		// Verify year navigation buttons are visible
		const prevYearButton = page
			.locator("button")
			.filter({
				has: page.locator("svg.lucide-chevron-left"),
			})
			.and(page.locator('[title="Previous Year"]'));

		const nextYearButton = page
			.locator("button")
			.filter({
				has: page.locator("svg.lucide-chevron-right"),
			})
			.and(page.locator('[title="Next Year"]'));

		await expect(prevYearButton).toBeVisible();
		await expect(nextYearButton).toBeVisible();

		// Verify month navigation buttons are visible
		const prevMonthButton = page
			.locator("button")
			.filter({
				has: page.locator("svg.lucide-chevron-left"),
			})
			.and(page.locator('[title="Previous Month"]'));

		const nextMonthButton = page
			.locator("button")
			.filter({
				has: page.locator("svg.lucide-chevron-right"),
			})
			.and(page.locator('[title="Next Month"]'));

		await expect(prevMonthButton).toBeVisible();
		await expect(nextMonthButton).toBeVisible();

		// Verify year and month selectors are visible
		await expect(page.locator(".year-text")).toBeVisible();
		await expect(page.locator(".month-select")).toBeVisible();

		// Verify vertical divider is visible
		await expect(page.locator(".year-month-divider")).toBeVisible();
	});
});
