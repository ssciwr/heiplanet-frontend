import fs from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";

const MOCK_2025_FILE_PATH = "/tests/setup/MockResponse2258.json";
const MOCK_2026_FILE_PATH = "/tests/setup/MockResponse4823.json";
const BASE_YEAR = 2025;
const NEXT_YEAR = BASE_YEAR + 1;

// Helper function to create route handler that loads mock data
async function createMockHandlerForYear(mockFilePath: string) {
	return async (route) => {
		try {
			const filePath = path.join(process.cwd(), mockFilePath.substring(1));

			// Check if file exists first
			const fileExists = fs.existsSync(filePath);

			if (!fileExists) {
				await route.continue();
				return;
			}

			const mockData = JSON.parse(fs.readFileSync(filePath, "utf-8"));

			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(mockData),
			});
		} catch (error) {
			await route.continue();
		}
	};
}

// Sets up mocks for all routes
export async function setupApiMocksWithFs(page: Page) {
	const mock2025Handler = await createMockHandlerForYear(MOCK_2025_FILE_PATH);
	const mock2026Handler = await createMockHandlerForYear(MOCK_2026_FILE_PATH);

	// Mock the 2025-06 API endpoint (baseline)
	await page.route(
		`**/api/cartesian?requested_time_point=${BASE_YEAR}-06-01&requested_variable_type=R0`,
		mock2025Handler,
	);

	// Mock the 2025-07 API endpoint (month navigation test)
	await page.route(
		`**/api/cartesian?requested_time_point=${BASE_YEAR}-07-01&requested_variable_type=R0`,
		mock2026Handler,
	);

	// Mock the 2026-06 API endpoint (year navigation test)
	await page.route(
		`**/api/cartesian?requested_time_point=${NEXT_YEAR}-06-01&requested_variable_type=R0`,
		mock2026Handler,
	);
}
