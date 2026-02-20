/* eslint-disable react-refresh/only-export-components */
import * as turf from "@turf/turf";
import * as L from "leaflet";
import { isMobile } from "react-device-detect";
import { fetchClimateData } from "../../../services/climateDataService.ts";
import { nutsApiUrl } from "../../../services/nutsApi.ts";
import type { DataExtremes, TemperatureDataPoint } from "../types.ts";

export const MIN_ZOOM = 0;
export const MAX_ZOOM = 10;

export const TEMP_COLORS = [
	"#4c1d4b", // Deep purple
	"#663399", // Purple
	"#7b4397", // Purple-blue
	"#2e86ab", // Blue
	"#39a97e", // Teal-green
	"#56c579", // Light green
	"#a7d88f", // Pale green
	"#e2fba2", // Very light green/yellow
];

// Generate whole number intervals every 10 degrees
const generateIntervals = (
	min: number,
	max: number,
	maxIntervals: number,
): number[] => {
	const practicalMin = min + 3;
	const practicalMax = max - 3; // 3 degree padding so that it doesn't overlap on the scale.
	const intervals: number[] = [];
	const startTemp = Math.ceil(practicalMin / 10) * 10;

	for (
		let temp = startTemp;
		temp < practicalMax && intervals.length < maxIntervals;
		temp += 5
	) {
		intervals.push(temp);
	}

	return intervals;
};

export const Legend = ({
	extremes,
	unit = "R0",
}: { extremes: DataExtremes; unit?: string }) => {
	if (!extremes) return null;

	const intervals = generateIntervals(
		extremes.min,
		extremes.max,
		isMobile ? 6 : 10,
	);
	const totalRange = extremes.max - extremes.min;

	// Mobile timeline styles - full width, integrated with timeline
	if (isMobile) {
		const containerStyle: React.CSSProperties = {
			width: "100%",
			padding: "12px 16px",
			backgroundColor: "transparent",
			display: "flex",
			flexDirection: "column",
			gap: "8px",
			margin: 0,
		};

		const barStyle: React.CSSProperties = {
			height: "24px",
			width: "100%",
			borderRadius: "12px",
			position: "relative",
			display: "flex",
			flexDirection: "row",
			overflow: "hidden",
		};

		const labelsStyle: React.CSSProperties = {
			display: "flex",
			justifyContent: "space-between",
			alignItems: "center",
			width: "100%",
			position: "relative",
			marginTop: "6px",
		};

		const renderMobileColorBlocks = () =>
			TEMP_COLORS.map((color, i) => {
				const isFirst = i === 0;
				const isLast = i === TEMP_COLORS.length - 1;
				const borderRadius = isFirst
					? "12px 0 0 12px"
					: isLast
						? "0 12px 12px 0"
						: "0";

				return (
					<div
						key={color}
						style={{
							width: `${100 / TEMP_COLORS.length}%`,
							height: "100%",
							backgroundColor: color,
							borderRadius,
						}}
					/>
				);
			});

		const renderMobileLabels = () => {
			const labelStyle = {
				fontSize: "10px",
				fontWeight: "600",
				color: "rgb(60,60,60)",
			};

			return (
				<>
					<span style={labelStyle}>
						{Math.round(extremes.min)}&nbsp;
						{unit}
					</span>
					{intervals.map((temp) => {
						const position = ((temp - extremes.min) / totalRange) * 100;
						return (
							<span
								key={temp}
								style={{
									position: "absolute",
									left: `${position}%`,
									transform: "translateX(-50%)",
									...labelStyle,
									fontSize: "9px",
									fontWeight: "500",
								}}
							>
								{temp}
								{unit}
							</span>
						);
					})}
					<span style={labelStyle}>
						{Math.round(extremes.max)}&nbsp;
						{unit}
					</span>
				</>
			);
		};

		return (
			<div style={containerStyle}>
				<div style={barStyle}>{renderMobileColorBlocks()}</div>
				<div style={labelsStyle}>{renderMobileLabels()}</div>
			</div>
		);
	}

	// Desktop vertical legend styles (unchanged)
	if (!isMobile) {
		const wrapperStyle: React.CSSProperties = {
			position: "fixed",
			top: "20%",
			bottom: "20%",
			left: "32px",
			zIndex: 700,
		};

		const containerStyle: React.CSSProperties = {
			backgroundColor: "white",
			borderRadius: "12px",
			padding: "16px",
			boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
			display: "flex",
			flexDirection: "row",
			alignItems: "center",
			gap: "15px",
			height: "100%",
		};

		const barStyle: React.CSSProperties = {
			borderRadius: "8px",
			position: "relative",
			display: "flex",
			flexDirection: "column",
			width: "40px",
			height: "100%",
		};

		const labelsStyle: React.CSSProperties = {
			display: "flex",
			flexDirection: "column",
			justifyContent: "space-between",
			alignItems: "flex-start",
			position: "relative",
			height: "100%",
		};

		const renderColorBlocks = () => {
			const colors = [...TEMP_COLORS].reverse();
			return colors.map((color, i) => {
				const isFirst = i === 0;
				const isLast = i === colors.length - 1;
				const borderRadius = isFirst
					? "8px 8px 0 0"
					: isLast
						? "0 0 8px 8px"
						: "0";

				return (
					<div
						key={color}
						style={{
							height: `${100 / colors.length}%`,
							width: "100%",
							backgroundColor: color,
							borderRadius,
						}}
					/>
				);
			});
		};

		const renderIntervalMarkers = () =>
			intervals.map((temp) => {
				const position = ((temp - extremes.min) / totalRange) * 100;
				return (
					<div
						key={temp}
						style={{
							position: "absolute",
							bottom: `${position}%`,
							right: "100%",
							width: "12px",
							height: "2px",
							backgroundColor: "#f8f9fa",
							transform: "translateY(50%)",
						}}
					/>
				);
			});

		const renderLabels = () => {
			const labelStyle = (size: "small" | "large") => ({
				fontSize: size === "small" ? "11px" : "13px",
				fontWeight: size === "small" ? "500" : "bold",
				color: "rgb(80,80,80)",
			});

			const sortedIntervals = [...intervals].reverse();

			return (
				<>
					<span style={labelStyle("large")}>
						{Math.round(extremes.max)}&nbsp;
						<small className="text-gray-800">{unit}</small>
					</span>

					{sortedIntervals.map((temp) => {
						const position = ((temp - extremes.min) / totalRange) * 100;
						return (
							<span
								key={temp}
								style={{
									position: "absolute",
									bottom: `${position}%`,
									transform: "translateY(50%)",
									...labelStyle("small"),
								}}
							>
								{temp}
								{unit}
							</span>
						);
					})}

					<span
						style={{
							...labelStyle("large"),
							position: "absolute",
							bottom: 0,
						}}
					>
						{Math.round(extremes.min)}&nbsp;
						<small className="text-gray-800">{unit}</small>
					</span>
				</>
			);
		};

		return (
			<div style={wrapperStyle}>
				<div style={containerStyle}>
					<div style={barStyle}>
						{renderColorBlocks()}
						{renderIntervalMarkers()}
					</div>
					<div style={labelsStyle}>{renderLabels()}</div>
				</div>
			</div>
		);
	}
};

export const calculateExtremes = (
	data: TemperatureDataPoint[],
	calculatePercentiles = true,
): DataExtremes => {
	if (!data || data.length === 0) return { min: 0, max: 0 };

	const temperatures = data
		.map((point) => point.temperature)
		.filter((temp) => !Number.isNaN(temp));

	if (temperatures.length === 0) return { min: 0, max: 0 };

	if (calculatePercentiles) {
		const sortedTemps = [...temperatures].sort((a, b) => a - b);
		const p5Index = Math.floor((25 / 100) * (sortedTemps.length - 1));
		const p95Index = Math.floor((75 / 100) * (sortedTemps.length - 1));

		return {
			min: sortedTemps[p5Index],
			max: sortedTemps[p95Index],
		};
	}

	return {
		min: Math.min(...temperatures),
		max: Math.max(...temperatures),
	};
};

// Load NUTS data directly from API for Europe-only mode
export const loadNutsData = async (
	year: number,
	month: number,
	requestedVariableValue = "R0",
	requestedGridResolution: "NUTS2" | "NUTS3" = "NUTS2",
): Promise<{ [nutsId: string]: number }> => {
	console.log(
		"Loading NUTS data for year:",
		year,
		"month:",
		month,
		"variable:",
		requestedVariableValue,
		"resolution:",
		requestedGridResolution,
	);

	// Format the month with leading zero
	const monthStr = month.toString().padStart(2, "0");
	const requestedTimePoint = `${year}-${monthStr}-01`;

	try {
		const nutsDataUrl = nutsApiUrl("/nuts_data", {
			requested_time_point: requestedTimePoint,
			requested_variable_type: requestedVariableValue,
			requested_grid_resolution: requestedGridResolution,
		});

		console.log(
			`Requesting NUTS values from backend: ${nutsDataUrl} (time=${requestedTimePoint}, variable=${requestedVariableValue}, resolution=${requestedGridResolution})`,
		);

		const response = await fetch(nutsDataUrl, {
			headers: {
				accept: "application/json",
			},
		});

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

		const normalized = normalizeNutsApiResponse(data);

		console.log(
			`Loaded NUTS data for ${Object.keys(normalized).length} regions`,
		);
		return normalized;
	} catch (error) {
		console.error("Failed to load NUTS data:", error);
		throw error;
	}
};

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

	if (typeof result === "object") {
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
	}

	throw new Error("API_ERROR: Invalid response format");
};

export const loadTemperatureData = async (
	year: number,
	month: number,
	requestedVariableValue = "R0",
	outputFormat?: string[],
	viewportBounds?: {
		north: number;
		south: number;
		east: number;
		west: number;
	} | null,
	requestedGridResolution?: number,
): Promise<{
	dataPoints: TemperatureDataPoint[];
	extremes: DataExtremes;
	bounds: L.LatLngBounds | null;
}> => {
	const funcStart = performance.now();
	console.log(
		"🌍 loadTemperatureData START - year:",
		year,
		"month:",
		month,
		"variable:",
		requestedVariableValue,
	);

	// Additional validation here too
	if (month === undefined || month === null) {
		throw new Error(
			`loadTemperatureData: Month parameter is ${month}. Expected a number between 1-12.`,
		);
	}

	try {
		const fetchStart = performance.now();
		const apiData = await fetchClimateData(
			year,
			month,
			requestedVariableValue,
			outputFormat,
			viewportBounds,
			requestedGridResolution,
		);
		console.log(
			`🌐 fetchClimateData took ${(performance.now() - fetchStart).toFixed(2)}ms - received ${apiData.length} raw points`,
		);

		const processStart = performance.now();
		const dataPoints: TemperatureDataPoint[] = [];

		for (let i = 0; i < apiData.length; i++) {
			const { latitude: lat, longitude: lng, temperature } = apiData[i];

			if (i % 100000 === 0) {
				console.log(
					`🔄 Processing point ${i}/${apiData.length} - Lat: ${lat}, Long: ${lng}, Temp: ${temperature}`,
				);
			}

			if (
				Number.isFinite(lat) &&
				Number.isFinite(lng) &&
				Number.isFinite(temperature)
			) {
				dataPoints.push({
					point: turf.point([lng, lat]),
					temperature: temperature,
					lat: lat,
					lng: lng,
				});
			}
		}
		console.log(
			`⚙️ Data processing took ${(performance.now() - processStart).toFixed(2)}ms - processed ${dataPoints.length} valid points`,
		);

		const extremesStart = performance.now();
		const extremes = calculateExtremes(dataPoints);
		console.log(
			`📊 calculateExtremes took ${(performance.now() - extremesStart).toFixed(2)}ms`,
		);

		const boundsStart = performance.now();
		let bounds: L.LatLngBounds | null = null;
		if (dataPoints.length > 0) {
			const lats = dataPoints.map((p) => p.lat);
			const lngs = dataPoints.map((p) => p.lng);
			bounds = L.latLngBounds([
				[Math.min(...lats) - 15, Math.min(...lngs) - 15],
				[Math.max(...lats) + 15, Math.max(...lngs) + 15],
			]);
		}
		console.log(
			`🗺️ Bounds calculation took ${(performance.now() - boundsStart).toFixed(2)}ms`,
		);

		const totalTime = performance.now() - funcStart;
		console.log(
			`✅ loadTemperatureData COMPLETE in ${totalTime.toFixed(2)}ms - ${dataPoints.length} points`,
		);

		return { dataPoints, extremes, bounds };
	} catch (error) {
		console.error(
			`❌ loadTemperatureData FAILED in ${(performance.now() - funcStart).toFixed(2)}ms:`,
			error,
		);
		throw error;
	}
};
