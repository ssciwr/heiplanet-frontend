export interface ClimateDataPoint {
	latitude: number;
	longitude: number;
	temperature: number;
}

export interface ClimateApiResponse {
	result: {
		"latitude, longitude, var_value": [
			number | string,
			number | string,
			number | string,
		][];
	};
}

export interface ClimateApiRequest {
	requested_time_point: string;
	requested_variable_type: string;
	outputFormat?: string[];
	requested_grid_resolution?: number;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchClimateData(
	year: number,
	month: number,
	requestedVariableValue = "R0",
	_outputFormat?: string[],
	viewportBounds?: {
		north: number;
		south: number;
		east: number;
		west: number;
	} | null,
	requestedGridResolution?: number,
): Promise<ClimateDataPoint[]> {
	await delay(100 + Math.random() * 300);

	// Validate month parameter
	if (month === undefined || month === null) {
		throw new Error(
			`Month parameter is ${month}. Expected a number between 1-12.`,
		);
	}

	if (typeof month !== "number" || month < 1 || month > 12) {
		throw new Error(
			`Invalid month parameter: ${month}. Expected a number between 1-12.`,
		);
	}

	// Format date as YYYY-MM-01 (using provided month)
	const monthStr = month.toString().padStart(2, "0");
	const requestedTimePoint = `${year}-${monthStr}-01`;

	console.log(
		`Fetching climate data for year: ${year}, month: ${month}, variable: ${requestedVariableValue}, date: ${requestedTimePoint}`,
	);
	console.log(
		"📍 ViewportBounds parameter passed to fetchClimateData:",
		viewportBounds,
	);

	try {
		const apiUrl = "/api/cartesian";

		// Use viewport bounds if provided, otherwise fallback to global coordinates
		const requestedArea = viewportBounds
			? [
					viewportBounds.north,
					viewportBounds.west,
					viewportBounds.south,
					viewportBounds.east,
				] // [N, W, S, E]
			: [90, -180, -90, 180]; // global fallback

		console.log("🔍 DEBUG: Viewport bounds received:", viewportBounds);
		console.log("🔍 DEBUG: viewportBounds is null?", viewportBounds === null);
		console.log(
			"🔍 DEBUG: viewportBounds is undefined?",
			viewportBounds === undefined,
		);
		console.log("🔍 DEBUG: viewportBounds type:", typeof viewportBounds);

		if (viewportBounds) {
			console.log("🔍 DEBUG: Individual viewport bounds values:");
			console.log(
				"  - north:",
				viewportBounds.north,
				"type:",
				typeof viewportBounds.north,
			);
			console.log(
				"  - south:",
				viewportBounds.south,
				"type:",
				typeof viewportBounds.south,
			);
			console.log(
				"  - east:",
				viewportBounds.east,
				"type:",
				typeof viewportBounds.east,
			);
			console.log(
				"  - west:",
				viewportBounds.west,
				"type:",
				typeof viewportBounds.west,
			);

			// Validate coordinate bounds
			const isValidBounds =
				viewportBounds.north > viewportBounds.south &&
				viewportBounds.east > viewportBounds.west;
			console.log("🔍 DEBUG: Are bounds geometrically valid?", isValidBounds);

			if (!isValidBounds) {
				console.warn("⚠️ WARNING: Invalid viewport bounds detected!");
				console.warn(
					"  North should be > South:",
					viewportBounds.north,
					">",
					viewportBounds.south,
					"=",
					viewportBounds.north > viewportBounds.south,
				);
				console.warn(
					"  East should be > West:",
					viewportBounds.east,
					">",
					viewportBounds.west,
					"=",
					viewportBounds.east > viewportBounds.west,
				);
			}
		}

		console.log("🔍 DEBUG: Final requested area (N, W, S, E):", requestedArea);
		console.log(
			"🔍 DEBUG: Using",
			viewportBounds ? "viewport bounds" : "global fallback coordinates",
		);

		const postData = {
			requested_time_point: requestedTimePoint, // "2016-07-01"
			requested_variable_type: requestedVariableValue, // "R0"
			requested_area: requestedArea,
			requested_grid_resolution: requestedGridResolution,
		};

		console.log(`Calling API: ${apiUrl}`);

		const response = await fetch(apiUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
			},
			body: JSON.stringify(postData),
		});

		if (!response.ok) {
			let backendError = "";
			try {
				const errorPayload = (await response.json()) as { error?: unknown };
				if (typeof errorPayload?.error === "string") {
					backendError = errorPayload.error;
				}
			} catch {
				// no-op: fallback to HTTP status text below
			}
			throw new Error(
				backendError
					? `API_ERROR: ${backendError}`
					: `API request failed: ${response.status} ${response.statusText}`,
			);
		}

		const data = await response.json();

		// Check if response contains an error property
		if (data.error) {
			throw new Error(`API_ERROR: ${data.error}`);
		}

		const rawRows = data.result["latitude, longitude, var_value"] as Array<
			[number | string, number | string, number | string]
		>;
		const normalizedRows: ClimateDataPoint[] = [];

		for (const row of rawRows) {
			const latitude = Number(row[0]);
			const longitude = Number(row[1]);
			const temperature = Number(row[2]);

			if (
				Number.isFinite(latitude) &&
				Number.isFinite(longitude) &&
				Number.isFinite(temperature)
			) {
				normalizedRows.push({
					latitude, // "longitude": latitude,
					longitude, // "latitude": longitude,
					temperature,
				});
			}
		}

		return normalizedRows;
	} catch (error) {
		console.error("Error fetching climate data:", error);
		throw error;
	}
}
