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

	await page.route("**/api/cartesian", async (route) => {
		if (route.request().method() !== "POST") {
			await route.continue();
			return;
		}

		try {
			const requestBody = route.request().postDataJSON() as {
				requested_time_point?: string;
			};
			const requestedTimePoint =
				typeof requestBody.requested_time_point === "string"
					? requestBody.requested_time_point
					: "";

			if (requestedTimePoint === `${BASE_YEAR}-07-01`) {
				await mock2026Handler(route);
				return;
			}

			if (requestedTimePoint.startsWith(`${NEXT_YEAR}-`)) {
				await mock2026Handler(route);
				return;
			}

			if (requestedTimePoint.startsWith(`${BASE_YEAR}-`)) {
				await mock2025Handler(route);
				return;
			}
		} catch (error) {
			// fall back to the baseline fixture below.
		}

		await mock2025Handler(route);
	});
}
