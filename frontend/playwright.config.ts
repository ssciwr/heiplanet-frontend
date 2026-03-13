import { defineConfig, devices } from "@playwright/test";

const includeFirefox =
	!!process.env.CI || process.env.PLAYWRIGHT_INCLUDE_FIREFOX === "1";

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
	testDir: "./tests",
	/* Run tests in files in parallel */
	fullyParallel: true,
	/* Fail the build on CI if you accidentally left test.only in the source code. */
	forbidOnly: !!process.env.CI,
	/* Retry on CI only */
	retries: process.env.CI ? 2 : 0, // basically CI can be low powered so allow it more time...
	/* Opt out of parallel tests on CI. */
	workers: process.env.CI ? 1 : undefined,
	/* Reporter to use. See https://playwright.dev/docs/test-reporters */
	reporter: "html",
	/* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
	use: {
		/* Base URL to use in actions like `await page.goto('/')`. */
		// baseURL: 'http://localhost:3000',

		/* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
		trace: "on-first-retry",

		/* Extended timeouts for mapping software with slow loading */
		actionTimeout: 60000, // 60 seconds for individual actions
		navigationTimeout: 60000, // 60 seconds for page navigation
	},

	/* Global timeout for all tests - 5 minutes for mapping software with slow loading */
	timeout: 300000, // 300 seconds (5 minutes)

	/* Configure projects for major browsers */
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
		...(includeFirefox
			? [
					{
						name: "firefox",
						use: { ...devices["Desktop Firefox"] },
					},
				]
			: []),
		{
			name: "webkit",
			use: { ...devices["Desktop Safari"] },
		},
		{
			name: "Mobile Chrome",
			use: { ...devices["Pixel 5"] },
		},
	],

	webServer: {
		command: "pnpm run dev --port 5174",
		url: "http://localhost:5174",
		reuseExistingServer: !process.env.CI,
		timeout: 300000, // 5 minutes for dev server to start
	},
});
