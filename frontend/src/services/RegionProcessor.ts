import * as turf from "@turf/turf";
import type {
	NutsGeoJSON,
	TemperatureDataPoint,
	WorldwideGeoJSON,
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

	// Process worldwide regions
	public async processWorldwideRegions(
		temperatureData: TemperatureDataPoint[],
		worldwideRegionsGeoJSON: WorldwideGeoJSON,
	): Promise<{
		processedGeoJSON: WorldwideGeoJSON;
		extremes: { min: number; max: number } | null;
	}> {
		console.log("Converting grid data to global administrative regions...");
		console.log(
			`Processing ${worldwideRegionsGeoJSON.features.length} global regions`,
		);

		// Sample temperature data to 0.5% for better performance
		const sampledTemperatureData = this.sampleTemperatureData(
			temperatureData,
			0.005,
		);
		console.log(
			"Temperature data sample: first few points:",
			sampledTemperatureData.slice(0, 5),
		);

		// Debug: Show bounds of temperature data
		if (sampledTemperatureData.length > 0) {
			const tempBounds = {
				minLat: Math.min(...sampledTemperatureData.map((p) => p.lat)),
				maxLat: Math.max(...sampledTemperatureData.map((p) => p.lat)),
				minLon: Math.min(...sampledTemperatureData.map((p) => p.lng)),
				maxLon: Math.max(...sampledTemperatureData.map((p) => p.lng)),
			};
			console.log(
				`Temperature data bounds: lat(${tempBounds.minLat} to ${tempBounds.maxLat}), lon(${tempBounds.minLon} to ${tempBounds.maxLon})`,
			);
		}

		// Process each global region and calculate temperature
		const processedFeatures = [];

		for (
			let index = 0;
			index < worldwideRegionsGeoJSON.features.length;
			index++
		) {
			const feature = worldwideRegionsGeoJSON.features[index];
			const regionName =
				feature.properties?.name ||
				feature.properties?.name_en ||
				feature.properties?.admin ||
				`Region-${index}`;

			try {
				console.log(`Processing region ${index + 1}: ${regionName}`);

				const tempResult = this.calculateRegionTemperatureWithCoords(
					feature as GeoJSON.Feature,
					sampledTemperatureData,
				);
				const result = {
					...feature,
					properties: {
						...feature.properties,
						intensity: tempResult.temperature, // this label should be in some kind of mobx store or passed as prop.
						// todo: Check this again. This relates to Ingas suggested changes today
						// Cruically, the label here in this concept may become the yaml "model output yaml" or so
						// Created Forntend issue #77 for this.
						WORLDWIDE_ID:
							feature.properties?.name ||
							feature.properties?.NAM_0 ||
							feature.properties?.name_en ||
							"Unknown",
						countryName:
							feature.properties?.NAM_0 ||
							feature.properties?.admin ||
							feature.properties?.name ||
							feature.properties?.name_en ||
							"Unknown Country",
						pointCount: sampledTemperatureData.filter((point) =>
							this.isPointInRegion(
								point.lat,
								point.lng,
								feature.geometry as GeoJSON.Geometry,
							),
						).length,
						isFallback: tempResult.isFallback,
						currentPosition: tempResult.currentPosition,
						nearestDataPoint: tempResult.nearestDataPoint,
						dataPoints: tempResult.dataPoints,
					},
				};

				if (result.properties.intensity !== null) {
					processedFeatures.push(result);
					console.log(
						`Region ${regionName} processed successfully: intensity=${result.properties.intensity}`,
					);
				} else {
					console.log(`Region ${regionName} has null intensity, skipping`);
				}
			} catch (regionError) {
				console.error(`Error processing region ${regionName}:`, regionError);
				throw regionError;
			}
		}

		console.log(
			`Processed ${processedFeatures.length} regions with valid temperature data`,
		);

		const processedGeoJSON = {
			type: "FeatureCollection" as const,
			features: processedFeatures,
		};

		// Calculate extremes from processed data
		const temperatures = processedFeatures
			.map((f) => f.properties.intensity)
			.filter((t) => t !== null);
		console.log("Temperature values for extremes calculation:", temperatures);

		let extremes = null;
		if (temperatures.length > 0) {
			extremes = {
				min: Math.min(...temperatures),
				max: Math.max(...temperatures),
			};
			console.log("Set worldwide regions extremes:", extremes);
			console.log(
				`Total regions with temperature data: ${temperatures.length}`,
			);
		} else {
			console.warn("No temperature data found for any region!");
		}

		return {
			processedGeoJSON: processedGeoJSON as WorldwideGeoJSON,
			extremes,
		};
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
