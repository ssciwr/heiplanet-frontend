import * as turf from "@turf/turf";
import type {
	NutsGeoJSON,
	TemperatureDataPoint,
} from "../component/Mapper/types";
import { nutsConverter } from "../component/Mapper/utilities/NutsConverter";

export interface RegionTemperatureResult {
	temperature: number | null;
	isFallback: boolean;
	currentPosition: { lat: number; lng: number };
	nearestDataPoint: { lat: number; lng: number } | null;
	dataPoints: TemperatureDataPoint[];
}

export class RegionProcessor {
	// Sample temperature data to reduce processing load
	public sampleTemperatureData(
		temperatureData: TemperatureDataPoint[],
		sampleRate = 0.5,
	): TemperatureDataPoint[] {
		const sampleSize = Math.max(
			1,
			Math.floor(temperatureData.length * sampleRate),
		);
		const step = Math.floor(temperatureData.length / sampleSize);

		const sampledData = [];
		for (let i = 0; i < temperatureData.length; i += step) {
			sampledData.push(temperatureData[i]);
			if (sampledData.length >= sampleSize) break;
		}

		console.log(
			`Sampled ${sampledData.length} points from ${temperatureData.length} total (${(
				sampleRate * 100
			).toFixed(1)}%)`,
		);
		return sampledData;
	}

	// Calculate temperature and coordinate info for a region
	public calculateRegionTemperatureWithCoords(
		regionFeature: GeoJSON.Feature,
		temperatureData: TemperatureDataPoint[],
	): RegionTemperatureResult {
		const regionName =
			regionFeature.properties?.name ||
			regionFeature.properties?.name_en ||
			regionFeature.properties?.admin ||
			"Unknown";

		const pointsInRegion = temperatureData.filter((point) => {
			// Use turf.js for accurate point-in-polygon checking
			const isInside = this.isPointInRegion(
				point.lat,
				point.lng,
				regionFeature.geometry,
			);
			return isInside;
		});

		// Get centroid of the region using turf.js
		const polygon = turf.feature(regionFeature.geometry);
		const centroid = turf.centroid(polygon);
		const currentPosition = {
			lat: centroid.geometry.coordinates[1],
			lng: centroid.geometry.coordinates[0],
		};

		console.log(
			`Region ${regionName}: found ${pointsInRegion.length} points within region`,
		);

		if (pointsInRegion.length === 0) {
			// Fallback: find nearest point
			const nearestPoint = this.findNearestPoint(
				regionFeature,
				temperatureData,
			);
			console.log(
				`Region ${regionName}: using nearest point fallback, temp: ${
					nearestPoint ? nearestPoint.temperature : "null"
				}`,
			);
			return {
				temperature: nearestPoint ? nearestPoint.temperature : null,
				isFallback: true,
				currentPosition,
				nearestDataPoint: nearestPoint
					? {
							lat: nearestPoint.lat,
							lng: nearestPoint.lng,
						}
					: null,
				dataPoints: nearestPoint ? [nearestPoint] : [],
			};
		}

		// Calculate average temperature
		const avgTemp =
			pointsInRegion.reduce((sum, point) => sum + point.temperature, 0) /
			pointsInRegion.length;
		console.log(
			`Region ${regionName}: calculated average temp: ${avgTemp} from ${pointsInRegion.length} points`,
		);
		return {
			temperature: avgTemp,
			isFallback: false,
			currentPosition,
			nearestDataPoint: null,
			dataPoints: pointsInRegion.slice(0, 3),
		};
	}

	// Use turf.js for accurate point-in-polygon checking
	public isPointInRegion(
		lat: number,
		lon: number,
		geometry: GeoJSON.Geometry,
	): boolean {
		try {
			// Reduced debug logging (only log first few calls to avoid spam)
			if (Math.random() < 0.001) {
				// Only log 0.1% of calls
				console.log("isPointInRegion sample call:", {
					lat,
					lon,
					latType: typeof lat,
					lonType: typeof lon,
					geometryType: geometry?.type,
				});
			}

			// Validate inputs with more detailed checks
			if (
				typeof lat !== "number" ||
				typeof lon !== "number" ||
				Number.isNaN(lat) ||
				Number.isNaN(lon) ||
				!Number.isFinite(lat) ||
				!Number.isFinite(lon)
			) {
				console.error("Invalid lat/lon values:", {
					lat,
					lon,
					latType: typeof lat,
					lonType: typeof lon,
					latIsNaN: Number.isNaN(lat),
					lonIsNaN: Number.isNaN(lon),
					latIsFinite: Number.isFinite(lat),
					lonIsFinite: Number.isFinite(lon),
				});
				return false;
			}

			if (!geometry || !geometry.type || !("coordinates" in geometry)) {
				console.error("Invalid geometry:", geometry);
				return false;
			}

			// Additional validation for coordinate values
			if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
				console.error("Lat/lon values out of valid range:", { lat, lon });
				return false;
			}

			// Create a turf point from lat/lon coordinates
			const point = turf.point([lon, lat]);

			// Create a turf polygon/multipolygon from the geometry
			const polygon = turf.feature(geometry);

			// Use turf's booleanPointInPolygon for accurate checking
			const result = turf.booleanPointInPolygon(
				point,
				polygon as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>,
			);

			return result;
		} catch (error) {
			console.error("Error in point-in-polygon check:", error);
			console.error("Error details:", {
				lat,
				lon,
				latType: typeof lat,
				lonType: typeof lon,
				latRaw: lat,
				lonRaw: lon,
				geometryType: geometry?.type,
				geometryCoordinates: "coordinates" in geometry ? "present" : "missing",
				errorMessage: error instanceof Error ? error.message : String(error),
				errorStack: error instanceof Error ? error.stack : undefined,
			});
			return false;
		}
	}

	// Find nearest temperature point to a region using turf.js
	public findNearestPoint(
		regionFeature: GeoJSON.Feature,
		temperatureData: TemperatureDataPoint[],
	): TemperatureDataPoint | null {
		try {
			// Get centroid of the region using turf.js
			const polygon = turf.feature(regionFeature.geometry);
			const centroid = turf.centroid(polygon);

			let nearestPoint = null;
			let minDistance = Number.POSITIVE_INFINITY;

			for (const point of temperatureData) {
				// Use turf.js distance calculation
				const tempPoint = turf.point([point.lng, point.lat]);
				const distance = turf.distance(centroid, tempPoint, {
					units: "kilometers",
				});

				if (distance < minDistance) {
					minDistance = distance;
					nearestPoint = point;
				}
			}

			return nearestPoint;
		} catch (error) {
			console.error("Error finding nearest point:", error);
			return null;
		}
	}

	// Process Europe-only regions using direct API data (no lat/lon conversion needed)
	public async processEuropeOnlyRegionsFromApi(
		apiData: { [nutsId: string]: number },
		currentYear: number,
	): Promise<{
		nutsGeoJSON: NutsGeoJSON;
		extremes: { min: number; max: number };
	}> {
		console.log(
			`Processing Europe-only NUTS regions from API data for year ${currentYear}...`,
		);
		console.log(
			`API data contains ${Object.keys(apiData).length} NUTS regions`,
		);

		// Use NutsConverter to create GeoJSON directly from API data
		const { nutsGeoJSON, extremes } =
			await nutsConverter.createNutsFromApiData(apiData);

		console.log(`NUTS processing complete for year ${currentYear}`);
		console.log(`NUTS features count: ${nutsGeoJSON.features.length}`);
		console.log("NUTS extremes:", extremes);

		return { nutsGeoJSON, extremes };
	}

	// Process Europe-only regions (legacy method - kept for backward compatibility)
	public async processEuropeOnlyRegions(
		temperatureData: TemperatureDataPoint[],
		currentYear: number,
	): Promise<{
		nutsGeoJSON: NutsGeoJSON;
		extremes: { min: number; max: number };
	}> {
		console.log(
			`DEBUGYEARCHANGE: Converting data to Europe-only NUTS regions for year ${currentYear}...`,
		);
		console.log(
			`DEBUGYEARCHANGE: Temperature data length: ${temperatureData.length}`,
		);
		console.log(
			"DEBUGYEARCHANGE: First temperature point:",
			temperatureData[0],
		);

		// Use NutsConverter to process temperature data into NUTS regions
		const { nutsGeoJSON, extremes } =
			await nutsConverter.convertDataToNuts(temperatureData);

		console.log(
			`DEBUGYEARCHANGE: NUTS conversion complete for year ${currentYear}`,
		);
		console.log(
			`DEBUGYEARCHANGE: NUTS features count: ${nutsGeoJSON.features.length}`,
		);
		console.log("DEBUGYEARCHANGE: NUTS extremes:", extremes);
		console.log(
			"DEBUGYEARCHANGE: First NUTS feature:",
			nutsGeoJSON.features[0],
		);

		return { nutsGeoJSON, extremes };
	}
}

// Export a singleton instance
export const regionProcessor = new RegionProcessor();
