const NUTS_DATA_API_URL = "/api/nuts_data";

const normalizeNutsApiResponse = (
	data: unknown,
): { [nutsId: string]: number } => {
	const result = (data as { result?: unknown })?.result ?? data;

	if (!result) {
		throw new Error("API_ERROR: Invalid response format");
	}

	if (Array.isArray(result)) {
		if (result.length === 0) return {};

		if (Array.isArray(result[0])) {
			const mapped: { [nutsId: string]: number } = {};
			for (const row of result as unknown[]) {
				if (!Array.isArray(row) || row.length < 2) continue;
				const [nutsId, value] = row as [unknown, unknown];
				if (typeof nutsId === "string" && typeof value === "number") {
					mapped[nutsId] = value;
				}
			}
			if (Object.keys(mapped).length > 0) return mapped;
		}

		if (typeof result[0] === "object" && result[0] !== null) {
			const mapped: { [nutsId: string]: number } = {};
			for (const row of result as Record<string, unknown>[]) {
				const nutsId =
					(row.NUTS_ID as string | undefined) ??
					(row.nuts_id as string | undefined) ??
					(row.id as string | undefined);
				const value =
					(row.var_value as number | undefined) ??
					(row.value as number | undefined) ??
					(row.temperature as number | undefined);
				if (typeof nutsId === "string" && typeof value === "number") {
					mapped[nutsId] = value;
				}
			}
			if (Object.keys(mapped).length > 0) return mapped;
		}
	}

	if (typeof result !== "object") {
		throw new Error("API_ERROR: Invalid response format");
	}

	const obj = result as Record<string, unknown>;

	if (Array.isArray(obj.nuts_id) && Array.isArray(obj.var_value)) {
		const mapped: { [nutsId: string]: number } = {};
		const ids = obj.nuts_id as unknown[];
		const values = obj.var_value as unknown[];
		for (let i = 0; i < Math.min(ids.length, values.length); i += 1) {
			const nutsId = ids[i];
			const value = values[i];
			if (typeof nutsId === "string" && typeof value === "number") {
				mapped[nutsId] = value;
			}
		}
		if (Object.keys(mapped).length > 0) return mapped;
	}

	const entries = Object.entries(obj);
	if (
		entries.length > 0 &&
		entries.every(([, value]) => typeof value === "number")
	) {
		return obj as { [nutsId: string]: number };
	}

	throw new Error("API_ERROR: Invalid response format");
};

export const fetchNutsData = async (
	year: number,
	month: number,
	requestedVariableValue = "R0",
	requestedGridResolution: "NUTS2" | "NUTS3" = "NUTS2",
): Promise<{ [nutsId: string]: number }> => {
	const monthStr = month.toString().padStart(2, "0");
	const requestedTimePoint = `${year}-${monthStr}-01`;
	const nutsDataParams = new URLSearchParams({
		requested_time_point: requestedTimePoint,
		requested_variable_type: requestedVariableValue,
		requested_grid_resolution: requestedGridResolution,
	});
	const nutsDataUrl = `${NUTS_DATA_API_URL}?${nutsDataParams.toString()}`;
	const response = await fetch(nutsDataUrl, {
		headers: {
			accept: "application/json",
		},
	}); // todo: COnsider using OpenAPI typs or something to do better than this haphazard query params + fetch + headers
	// especially for future projects... especially given the hardcoded BASE_URL env issues... it should be more fluid.

	let data: unknown = null;
	try {
		data = await response.json();
	} catch {
		// no-op; handled below
	}

	if (!response.ok) {
		const backendError =
			typeof (data as { error?: unknown })?.error === "string"
				? ((data as { error: string }).error ?? "")
				: "";
		throw new Error(
			backendError
				? `API_ERROR: ${backendError}`
				: `API_ERROR: HTTP ${response.status} - ${response.statusText}`,
		);
	}

	if (typeof (data as { error?: unknown })?.error === "string") {
		throw new Error(`API_ERROR: ${(data as { error: string }).error}`);
	}

	return normalizeNutsApiResponse(data);
};
