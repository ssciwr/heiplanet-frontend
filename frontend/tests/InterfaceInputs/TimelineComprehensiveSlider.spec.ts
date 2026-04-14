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
		await page.route("**/api/nuts_data**", async (route) => {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ TEST001: 0.1 }),
			});
		});

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

		await page.goto("http://localhost:5174/map/citizen?notour=true");

		// Wait for components to load
		await page.waitForSelector('[data-testid="timeline-selector"]', {
			timeout: 20000,
		});
		await page.waitForSelector(".leaflet-container", { timeout: 20000 });

		const mapModeSelect = page.locator(".map-header .ant-select-selector");
		const mapModeValue = page.locator(".map-header .ant-select-selection-item");
		await expect(mapModeSelect).toBeVisible({ timeout: 30000 });
		// switch to Grid mode - this makes it more resilient to future model meta data changes(e.g. default to Europe mode) breaking tests.
		if ((await mapModeValue.textContent())?.trim() !== "Grid") {
			await mapModeSelect.dispatchEvent("mousedown");
			const gridOption = page
				.locator(".ant-select-dropdown .ant-select-item-option")
				.filter({ hasText: "Grid" })
				.last();
			await expect(gridOption).toBeVisible();
			await gridOption.click();
		}
		await expect(mapModeValue).toContainText("Grid");

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
			const gridCanvas = page.locator(".leaflet-overlay-pane canvas").last();
			await page.waitForSelector(".leaflet-container", { timeout: 30000 });
			await expect(gridCanvas).toBeVisible({ timeout: 30000 });
			await expect
				.poll(async () => (await getGridColors()).length, { timeout: 30000 })
				.toBeGreaterThan(0);
			await page.waitForTimeout(1000);
		}

		// Helper function to get colors from grid path elements
		async function getGridColors() {
			return page.evaluate(() => {
				const canvas = document.querySelector(".leaflet-overlay-pane canvas");
				if (!(canvas instanceof HTMLCanvasElement)) {
					return [];
				}
				const context = canvas.getContext("2d");
				if (!context) {
					return [];
				}

				const colors = new Set<string>();

				try {
					const imageData = context.getImageData(
						0,
						0,
						canvas.width,
						canvas.height,
					).data;
					for (let index = 0; index < imageData.length; index += 4) {
						const red = imageData[index];
						const green = imageData[index + 1];
						const blue = imageData[index + 2];
						const alpha = imageData[index + 3];

						if (alpha < 150) {
							continue;
						}

						if (red < 16 && green < 16 && blue < 16) {
							continue;
						}

						const hex = `#${[red, green, blue]
							.map((value) => value.toString(16).padStart(2, "0"))
							.join("")
							.toUpperCase()}`;
						colors.add(hex);

						if (colors.size >= 8) {
							break;
						}
					}
				} catch (error) {
					return [];
				}

				return Array.from(colors);
			});
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
				try {
					await page.locator(".ant-modal-close").last().click({
						force: true,
						timeout: 1000,
					});
				} catch (e) {
					// Ignore if no modal is open
				}
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
		const monthSelect = page.locator(".month-select");
		await expect(monthSelect).toBeVisible({ timeout: 30000 });
		await monthSelect.selectOption("6");
		await waitForMapDataStability();

		// Test multiple years
		const testYears = [2025, 2026];
		const yearColorMaps = new Map();
		const yearSnapshots = new Map();

		for (const year of testYears) {
			await setYear(year);
			const colors = await getGridColors();
			const gridCanvas = page.locator(".leaflet-overlay-pane canvas").last();
			await expect(gridCanvas).toBeVisible({ timeout: 30000 });
			const snapshot = await gridCanvas.screenshot();
			yearColorMaps.set(year, colors);
			yearSnapshots.set(year, snapshot);
			expect(colors.length).toBeGreaterThan(0);
			console.log(`Year ${year} colors:`, colors);
		}

		const snapshot2025 = yearSnapshots.get(2025);
		const snapshot2026 = yearSnapshots.get(2026);
		expect(Buffer.compare(snapshot2025, snapshot2026)).not.toBe(0);

		// Validate hex color format
		yearColorMaps.forEach((colors, year) => {
			for (const color of colors) {
				expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
			}
		});

		console.log("All color validations passed!");
	});
});
