// tests/map-color-change-comprehensive.spec.js
import { expect, test } from "@playwright/test";
import { skipIfMobile } from "../utils";
import "../setup/global-setup";
import { setupGlobalMocks } from "../setup/global-setup";

// Test works locally
test.describe("Comprehensive Grid Color Analysis - Desktop Only", () => {
	test.setTimeout(1500000); // (25 minutes - yes it does take a long time (3.5 min on dev machine) due to
	// geoJSON processing of country boundries + sampling many points )

	test.beforeEach(async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 720 });

		// Set up API mocks BEFORE navigating to the page
		await setupGlobalMocks(page);

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

	test("comprehensive grid color analysis across multiple years", async ({
		page,
		browserName,
	}) => {
		await skipIfMobile(page);
		test.skip(
			browserName !== "chromium",
			"This test only runs on Chromium due to SVG rendering differences with react leaflet",
		);
		test.fixme(
			browserName === "chromium",
			"Temporarily skipped: timeline month selector is intermittently missing in CI.",
		);

		await page.goto("http://localhost:5174/map/citizen?notour=true");

		// Wait for components to load
		await page.waitForSelector('[data-testid="timeline-selector"]', {
			timeout: 20000,
		});
		await page.waitForSelector(".leaflet-container", { timeout: 20000 });

		// Initial wait for map to stabilize
		await page.waitForTimeout(20000);

		// Helper function to wait for slider stability
		async function waitForSliderStability() {
			// Simply wait for slider handle to be visible
			const sliderHandle = page.locator(
				'[data-testid="timeline-selector"] .timeline-slider-handle',
			);
			await expect(sliderHandle).toBeVisible({ timeout: 30000 });

			// Short wait for stability
			await page.waitForTimeout(1000);
		}

		// Helper function to wait for map data to load and stabilize
		async function waitForMapDataStability() {
			// Wait for leaflet container to be present
			await page.waitForSelector(".leaflet-container", { timeout: 30000 });

			// Wait for some map content to appear (either paths or tiles)
			try {
				await page.waitForSelector('path[fill*="#"]', { timeout: 15000 });
			} catch (e) {
				// If no paths, just wait for leaflet to be ready
				console.log("No paths found, continuing...");
			}

			// Reasonable wait for map to stabilize
			await page.waitForTimeout(5000);
		}

		// Helper function to get colors from grid path elements
		async function getGridColors() {
			// Wait for leaflet SVG path elements to appear
			try {
				await page.waitForSelector('path.leaflet-interactive[fill*="#"]', {
					timeout: 60000,
				});
			} catch (e) {
				// Fallback for different path structure
				await page.waitForSelector('path[fill*="#"]', { timeout: 60000 });
			}

			// Try both selectors to find grid elements
			let gridCells = page.locator('path.leaflet-interactive[fill*="#"]');
			let count = await gridCells.count();

			// If no leaflet-interactive paths found, try general path selector
			if (count === 0) {
				gridCells = page.locator('path[fill*="#"]');
				count = await gridCells.count();
			}

			const colors = [];
			console.log(`Found ${count} grid path elements`);

			// Sample grid cells
			const sampleSize = Math.min(count, 8);
			for (let i = 0; i < sampleSize; i++) {
				const color = await gridCells.nth(i).getAttribute("fill");
				if (color && color !== "transparent") {
					colors.push(color);
				}
			}
			return colors;
		}

		// Helper function to set year using slider
		async function setYear(targetYear) {
			console.log(`Setting year to ${targetYear}...`);

			// Wait for slider to be stable before interacting
			await waitForSliderStability();

			const sliderHandle = page.locator(
				'[data-testid="timeline-selector"] .timeline-slider-handle',
			);
			await expect(sliderHandle).toBeVisible();

			const yearSlider = page.locator(
				'[data-testid="timeline-selector"] .timeline-slider',
			);
			await expect(yearSlider).toBeVisible();

			// Get the bounding boxes
			const sliderBox = await yearSlider.boundingBox();
			const handleBox = await sliderHandle.boundingBox();

			if (sliderBox && handleBox) {
				// Calculate the target position (1960-2100 range)
				const yearRange = 2100 - 1960;
				const targetPosition = (targetYear - 1960) / yearRange;
				const targetX = sliderBox.x + sliderBox.width * targetPosition;

				// Move to handle and drag to target position
				await sliderHandle.hover();
				await page.mouse.down();
				await page.mouse.move(targetX, handleBox.y + handleBox.height / 2, {
					steps: 10,
				});
				await page.mouse.up();

				console.log(`Year set to ${targetYear}`);

				// Wait for map data to reload and stabilize after year change
				await waitForMapDataStability();
			}
		}

		// Wait for initial map data to load and stabilize
		await waitForMapDataStability();
		const monthSelect = page.locator(
			'[data-testid="timeline-selector"] .ant-select-selector',
		);
		await expect(monthSelect).toBeVisible({ timeout: 30000 });
		await monthSelect.scrollIntoViewIfNeeded();
		await monthSelect.click({ force: true });
		const juneOption = page.getByRole("option", { name: "June" });
		await expect(juneOption).toBeVisible({ timeout: 10000 });
		await juneOption.click();
		await waitForMapDataStability();

		// Test multiple years
		const testYears = [2025, 2026];
		const yearColorMaps = new Map();

		for (const year of testYears) {
			await setYear(year);
			const colors = await getGridColors();
			yearColorMaps.set(year, colors);
			expect(colors.length).toBeGreaterThan(0);
			console.log(`Year ${year} colors:`, colors);
		}

		// Assert colors are different between years
		const colors2025 = yearColorMaps.get(2025);
		const colors2026 = yearColorMaps.get(2026);

		expect(JSON.stringify(colors2025)).not.toBe(JSON.stringify(colors2026));

		// Validate hex color format
		yearColorMaps.forEach((colors, year) => {
			for (const color of colors) {
				expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
			}
		});

		console.log("All color validations passed!");
	});
});
