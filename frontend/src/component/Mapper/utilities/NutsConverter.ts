import * as turf from "@turf/turf";
import type {
	FeatureCollection,
	Feature as GeoJSONFeature,
	MultiPolygon,
	Polygon,
} from "geojson";
import { nutsApiUrl } from "../../../services/nutsApi.ts";
import type {
	DataExtremes,
	NutsFeature,
	NutsGeoJSON,
	NutsGeometry,
	TemperatureDataPoint,
} from "../types";

export class NutsConverter {
	private nutsGeoJSON: FeatureCollection | null = null;
	private nutsGeoJSONLevel: 2 | 3 | null = null;

	async loadNutsGeoJSON(level: 2 | 3 = 3): Promise<void> {
		if (this.nutsGeoJSON && this.nutsGeoJSONLevel === level) {
			return;
		}

		const gridResolution = `NUTS${level}`;
		const nutsRegionsUrl = nutsApiUrl("/nuts_regions", {
			grid_resolution: gridResolution,
		});

		const response = await fetch(nutsRegionsUrl, {
			headers: {
				//	accept: "application/geo+json,application/json",
				accept: "application/json",
			},
		});

		if (!response.ok) {
			throw new Error(
				`Failed to load NUTS regions (${response.status} ${response.statusText})`,
			);
		}

		this.nutsGeoJSON = (await response.json()) as FeatureCollection;
		this.nutsGeoJSONLevel = level;
	}

	private createSpatialIndex(
		temperatureData: TemperatureDataPoint[],
		bucketSize: number,
	): { [key: string]: TemperatureDataPoint[] } {
		const index: { [key: string]: TemperatureDataPoint[] } = {};

		for (const dataPoint of temperatureData) {
			if (
				!dataPoint ||
				typeof dataPoint.lat !== "number" ||
				typeof dataPoint.lng !== "number" ||
				!dataPoint.point
			) {
				console.warn(
					"Skipping invalid dataPoint in spatial index creation:",
					dataPoint,
				);
				continue;
			}
			const lat = dataPoint.lat;
			const lng = dataPoint.lng;

			// Create bucket key based on rounded coordinates
			const latBucket = Math.floor(lat / bucketSize) * bucketSize;
			const lngBucket = Math.floor(lng / bucketSize) * bucketSize;
			const bucketKey = `${latBucket},${lngBucket}`;

			if (!index[bucketKey]) {
				index[bucketKey] = [];
			}
			index[bucketKey].push(dataPoint);
		}

		return index;
	}

	private getPolygonBounds(polygon: GeoJSONFeature<Polygon | MultiPolygon>): {
		minLat: number;
		maxLat: number;
		minLng: number;
		maxLng: number;
	} {
		const bbox = turf.bbox(polygon);
		return {
			minLng: bbox[0],
			minLat: bbox[1],
			maxLng: bbox[2],
			maxLat: bbox[3],
		};
	}

	private getRelevantBuckets(
		polygonBounds: {
			minLat: number;
			maxLat: number;
			minLng: number;
			maxLng: number;
		},
		bucketSize: number,
	): string[] {
		const buckets: string[] = [];

		// Expand bounds slightly to catch edge cases
		const buffer = bucketSize * 0.1;
		const minLat = polygonBounds.minLat - buffer;
		const maxLat = polygonBounds.maxLat + buffer;
		const minLng = polygonBounds.minLng - buffer;
		const maxLng = polygonBounds.maxLng + buffer;

		// Find all buckets that intersect with the polygon bounds
		for (
			let lat = Math.floor(minLat / bucketSize) * bucketSize;
			lat <= maxLat;
			lat += bucketSize
		) {
			for (
				let lng = Math.floor(minLng / bucketSize) * bucketSize;
				lng <= maxLng;
				lng += bucketSize
			) {
				buckets.push(`${lat},${lng}`);
			}
		}

		return buckets;
	}

	private findNearestDataPoint(
		centroidCoords: [number, number],
		spatialIndex: { [key: string]: TemperatureDataPoint[] },
		bucketSize: number,
	): TemperatureDataPoint | null {
		const [lng, lat] = centroidCoords;
		let nearestPoint: TemperatureDataPoint | null = null;
		let minDistance = Number.POSITIVE_INFINITY;

		// Start with the bucket containing the centroid
		const centroidBucket = `${Math.floor(lat / bucketSize) * bucketSize},${Math.floor(lng / bucketSize) * bucketSize}`;

		// Expand search radius until we find a point
		for (let radius = 0; radius <= 3; radius++) {
			const searchBuckets: string[] = [];

			if (radius === 0) {
				searchBuckets.push(centroidBucket);
			} else {
				// Add surrounding buckets in expanding rings
				for (let latOffset = -radius; latOffset <= radius; latOffset++) {
					for (let lngOffset = -radius; lngOffset <= radius; lngOffset++) {
						if (
							Math.abs(latOffset) === radius ||
							Math.abs(lngOffset) === radius
						) {
							const searchLat =
								Math.floor(lat / bucketSize) * bucketSize +
								latOffset * bucketSize;
							const searchLng =
								Math.floor(lng / bucketSize) * bucketSize +
								lngOffset * bucketSize;
							searchBuckets.push(`${searchLat},${searchLng}`);
						}
					}
				}
			}

			// Check all points in current search buckets
			for (const bucketKey of searchBuckets) {
				const bucketPoints = spatialIndex[bucketKey];
				if (!bucketPoints) continue;

				for (const dataPoint of bucketPoints) {
					const distance = Math.sqrt(
						(dataPoint.lat - lat) ** 2 + (dataPoint.lng - lng) ** 2,
					);

					if (distance < minDistance) {
						minDistance = distance;
						nearestPoint = dataPoint;
					}
				}
			}

			// If we found a point, return it
			if (nearestPoint) {
				return nearestPoint;
			}
		}

		return nearestPoint;
	}

	private createPolygonFromFeature(
		feature: GeoJSONFeature,
	): GeoJSONFeature<Polygon | MultiPolygon> | null {
		try {
			if (feature.geometry?.type === "Polygon") {
				return turf.polygon((feature.geometry as Polygon).coordinates);
			}
			if (feature.geometry?.type === "MultiPolygon") {
				return turf.multiPolygon(
					(feature.geometry as MultiPolygon).coordinates,
				);
			}
			return null;
		} catch (error) {
			console.warn("Failed to create polygon for feature:", error);
			return null;
		}
	}

	async convertDataToNuts(
		temperatureData: TemperatureDataPoint[],
	): Promise<{ nutsGeoJSON: NutsGeoJSON; extremes: DataExtremes }> {
		try {
			console.log("Starting Europe-only NUTS conversion...");
			await this.loadNutsGeoJSON(); // Only load NUTS data, not countries

			console.log("NUTS GeoJSON loaded successfully, starting processing...");
			console.log(
				`Processing all ${temperatureData.length} temperature points for Europe-only NUTS conversion with spatial indexing...`,
			);

			// Validate temperature data structure
			if (temperatureData.length > 0) {
				const samplePoint = temperatureData[0];
				console.log("Sample temperature data point:", samplePoint);
				if (!samplePoint.point) {
					console.error("Temperature data points missing 'point' property");
				}
			}

			// Create spatial index using 5-degree buckets
			const spatialIndex = this.createSpatialIndex(temperatureData, 5);
			console.log(
				`Created spatial index with ${Object.keys(spatialIndex).length} buckets`,
			);

			const nutsFeatures: NutsFeature[] = [];
			const temperatures: number[] = [];

			// Process NUTS 2 regions for EU countries ONLY
			console.log("Processing NUTS regions for Europe-only mode...");
			if (this.nutsGeoJSON && this.nutsGeoJSON.features.length > 0) {
				console.log(
					`Processing ${this.nutsGeoJSON.features.length} NUTS 2 regions...`,
				);

				for (const nutsFeature of this.nutsGeoJSON.features) {
					const polygon = this.createPolygonFromFeature(nutsFeature);
					if (!polygon) continue;

					const nutsId =
						nutsFeature.properties?.NUTS_ID || nutsFeature.properties?.nuts_id;

					if (!nutsId) {
						console.warn("NUTS feature missing NUTS_ID:", nutsFeature);
						continue;
					}

					// Get polygon bounds and relevant buckets
					const polygonBounds = this.getPolygonBounds(polygon);
					const relevantBuckets = this.getRelevantBuckets(polygonBounds, 5);

					const pointsInRegion: TemperatureDataPoint[] = [];
					let totalCandidatePoints = 0;

					// Only check points in relevant buckets
					for (const bucketKey of relevantBuckets) {
						const bucketPoints = spatialIndex[bucketKey];
						if (!bucketPoints) continue;

						totalCandidatePoints += bucketPoints.length;

						for (const dataPoint of bucketPoints) {
							try {
								if (!dataPoint || !dataPoint.point) {
									console.warn(
										"Invalid data point in NUTS bucketPoints:",
										dataPoint,
									);
									continue;
								}
								if (turf.booleanPointInPolygon(dataPoint.point, polygon)) {
									pointsInRegion.push(dataPoint);
								}
							} catch (error) {
								console.warn(
									"Error in NUTS point-in-polygon check:",
									error,
									dataPoint,
								);
								// Skip points that cause errors
							}
						}
					}

					// Calculate average temperature if we have points
					if (pointsInRegion.length > 0) {
						const temperatureSum = pointsInRegion.reduce(
							(sum, point) => sum + point.temperature,
							0,
						);
						const avgTemperature = temperatureSum / pointsInRegion.length;

						console.log(
							`NUTS ${nutsId}: ${pointsInRegion.length} points, avg temp: ${avgTemperature.toFixed(2)}°C`,
						);

						temperatures.push(avgTemperature);

						// Get centroid for current position
						const centroid = turf.centroid(polygon);
						const currentPosition = {
							lat: centroid.geometry.coordinates[1],
							lng: centroid.geometry.coordinates[0],
						};

						const nutsFeatureResult: NutsFeature = {
							type: "Feature",
							properties: {
								NUTS_ID: nutsId,
								intensity: avgTemperature,
								countryName: this.getNutsDisplayName(nutsId),
								pointCount: pointsInRegion.length,
								nutsLevel: 2,
								currentPosition,
								dataPoints: pointsInRegion.slice(0, 3).map((point) => ({
									lat: point.lat,
									lng: point.lng,
									temperature: point.temperature,
								})),
							},
							geometry: nutsFeature.geometry as NutsGeometry,
						};

						nutsFeatures.push(nutsFeatureResult);
					} else {
						// Fallback: find nearest point to region centroid
						const centroid = turf.centroid(polygon);
						const centroidCoords = centroid.geometry.coordinates as [
							number,
							number,
						];
						const currentPosition = {
							lat: centroidCoords[1],
							lng: centroidCoords[0],
						};
						const nearestPoint = this.findNearestDataPoint(
							centroidCoords,
							spatialIndex,
							5,
						);

						if (nearestPoint) {
							console.log(
								`NUTS region ${nutsId}: no points inside, using nearest point (${nearestPoint.temperature.toFixed(1)}°C)`,
							);
							temperatures.push(nearestPoint.temperature);

							const nutsFeatureResult: NutsFeature = {
								type: "Feature",
								properties: {
									NUTS_ID: nutsId,
									intensity: nearestPoint.temperature,
									countryName: this.getNutsDisplayName(nutsId),
									pointCount: 0, // Mark as fallback
									nutsLevel: 2,
									isFallback: true,
									currentPosition,
									nearestDataPoint: {
										lat: nearestPoint.lat,
										lng: nearestPoint.lng,
									},
									dataPoints: [
										{
											lat: nearestPoint.lat,
											lng: nearestPoint.lng,
											temperature: nearestPoint.temperature,
										},
									],
								},
								geometry: nutsFeature.geometry as NutsGeometry,
							};

							nutsFeatures.push(nutsFeatureResult);
						} else {
							console.log(
								`NUTS region ${nutsId}: no points found (checked ${totalCandidatePoints} candidates)`,
							);
						}
					}
				}
			}

			// Calculate extremes
			console.log("Calculating extremes...");
			console.log(
				`Temperature values: [${temperatures
					.slice(0, 10)
					.map((t) => t.toFixed(2))
					.join(", ")}${temperatures.length > 10 ? "..." : ""}]`,
			);
			const extremes: DataExtremes =
				temperatures.length > 0
					? {
							min: Math.min(...temperatures),
							max: Math.max(...temperatures),
						}
					: {
							min: 0,
							max: 0,
						};
			console.log(
				`Final extremes: min=${extremes.min.toFixed(2)}°C, max=${extremes.max.toFixed(2)}°C`,
			);

			const nutsGeoJSON: NutsGeoJSON = {
				type: "FeatureCollection",
				features: nutsFeatures,
			};

			console.log(
				`Europe-only NUTS conversion complete: ${nutsFeatures.length} regions with temperature data`,
			);
			console.log(
				`Temperature range: ${extremes.min.toFixed(1)}°C to ${extremes.max.toFixed(1)}°C`,
			);

			return { nutsGeoJSON, extremes };
		} catch (error) {
			console.error("Error in convertDataToNuts:", error);
			// Return a fallback result to prevent the function from returning undefined
			return {
				nutsGeoJSON: { type: "FeatureCollection", features: [] },
				extremes: { min: 0, max: 0 },
			};
		}
	}

	private getNutsDisplayName(nutsId: string): string {
		// Map NUTS IDs to more readable names for European countries
		const nutsNames: { [key: string]: string } = {
			AT: "Austria",
			BE: "Belgium",
			BG: "Bulgaria",
			CH: "Switzerland",
			CY: "Cyprus",
			CZ: "Czech Republic",
			DE: "Germany",
			DK: "Denmark",
			EE: "Estonia",
			EL: "Greece",
			ES: "Spain",
			FI: "Finland",
			FR: "France",
			HR: "Croatia",
			HU: "Hungary",
			IE: "Ireland",
			IS: "Iceland",
			IT: "Italy",
			LI: "Liechtenstein",
			LT: "Lithuania",
			LU: "Luxembourg",
			LV: "Latvia",
			MT: "Malta",
			NL: "Netherlands",
			NO: "Norway",
			PL: "Poland",
			PT: "Portugal",
			RO: "Romania",
			SE: "Sweden",
			SI: "Slovenia",
			SK: "Slovakia",
			TR: "Turkey",
			UK: "United Kingdom",
			GB: "United Kingdom",
			// Balkan countries
			AL: "Albania",
			BA: "Bosnia and Herzegovina",
			ME: "Montenegro",
			MK: "North Macedonia",
			RS: "Serbia",
			XK: "Kosovo",
		};

		const countryCode = nutsId.substring(0, 2);
		const baseCountry = nutsNames[countryCode] || countryCode;

		if (nutsId.length > 2) {
			return `${baseCountry} - ${nutsId}`;
		}

		return baseCountry;
	}

	// Create NUTS GeoJSON directly from API data (bypasses lat/lon processing)
	/*
	The way this goes about this is longwinded/antiquated given how this could work now. For each NUTS region in our
	local list of regions, it make a polygon object ready to draw, and then
	 tries to see if the API data has a region with the same ID. When it does, it assigns the intensity value.
	 That works and the full NUTS-API path will work like that too (backend will provide a GeoJSON of countries and
	 NUTS regions as polygons), but the code is a bit convulted and function names should change to nolonger read like
	 it creates the Nuts regions based on processing points into their relevant regions.
	 */
	async createNutsFromApiData(apiData: { [nutsId: string]: number }): Promise<{
		nutsGeoJSON: NutsGeoJSON;
		extremes: DataExtremes;
	}> {
		await this.loadNutsGeoJSON(3);

		const sourceGeoJSON = this.nutsGeoJSON;

		if (!sourceGeoJSON) {
			throw new Error("NUTS GeoJSON not loaded");
		}

		const nutsFeatures: NutsFeature[] = [];
		const temperatures: number[] = [];

		// Process each NUTS region in the API data
		for (const nutsFeature of sourceGeoJSON.features) {
			const nutsId =
				nutsFeature.properties?.NUTS_ID || nutsFeature.properties?.nuts_id;

			if (!nutsId) {
				console.warn("NUTS feature missing NUTS_ID:", nutsFeature);
				continue;
			}

			const apiValue = apiData[nutsId]; // look up in the hashtable of known NUTS IDs --> Intesity values from last API call.

			if (apiValue !== undefined && typeof apiValue === "number") {
				temperatures.push(apiValue);

				// Get centroid for current position
				const polygon = this.createPolygonFromFeature(nutsFeature);
				if (!polygon) continue;

				const centroid = turf.centroid(polygon);
				const currentPosition = {
					lat: centroid.geometry.coordinates[1],
					lng: centroid.geometry.coordinates[0],
				};

				const nutsFeatureResult: NutsFeature = {
					type: "Feature",
					properties: {
						NUTS_ID: nutsId,
						intensity: apiValue,
						countryName: this.getNutsDisplayName(nutsId),
						pointCount: 1, // API data is pre-processed
						nutsLevel: 3,
						isApiData: true,
						currentPosition,
						dataPoints: [
							{
								lat: currentPosition.lat,
								lng: currentPosition.lng,
								temperature: apiValue,
							},
						],
					},
					geometry: nutsFeature.geometry as NutsGeometry,
				};

				nutsFeatures.push(nutsFeatureResult);
			}
		}

		// Calculate extremes
		const extremes: DataExtremes =
			temperatures.length > 0
				? {
						min: Math.min(...temperatures),
						max: Math.max(...temperatures),
					}
				: {
						min: 0,
						max: 0,
					};

		const nutsGeoJSON: NutsGeoJSON = {
			type: "FeatureCollection",
			features: nutsFeatures,
		};

		return { nutsGeoJSON, extremes };
	}

	// Method to overlay actual model NUTS 3 data over calculated data
	async overlayModelData(modelData: { [nutsId: string]: number }): Promise<{
		nutsGeoJSON: NutsGeoJSON;
		extremes: DataExtremes;
	}> {
		if (!this.nutsGeoJSON) {
			throw new Error("NUTS GeoJSON not loaded. Call loadNutsGeoJSON() first.");
		}

		const updatedFeatures: NutsFeature[] = [];
		const temperatures: number[] = [];

		// Update features with model data where available
		for (const feature of this.nutsGeoJSON.features) {
			const nutsId = feature.properties?.NUTS_ID;
			const modelTemperature = modelData[nutsId];

			if (modelTemperature !== undefined) {
				// Use model data
				temperatures.push(modelTemperature);
				updatedFeatures.push({
					...feature,
					properties: {
						...feature.properties,
						NUTS_ID: feature.properties?.NUTS_ID || "",
						intensity: modelTemperature,
						isModelData: true,
					},
					geometry: feature.geometry as NutsGeometry,
				});
			} else {
				// Keep calculated data
				if (feature.properties?.intensity !== undefined) {
					temperatures.push(feature.properties.intensity);
					updatedFeatures.push({
						...feature,
						properties: {
							...feature.properties,
							NUTS_ID: feature.properties?.NUTS_ID || "",
							intensity: feature.properties.intensity,
							isModelData: false,
						},
						geometry: feature.geometry as NutsGeometry,
					});
				}
			}
		}

		const extremes: DataExtremes = {
			min: Math.min(...temperatures),
			max: Math.max(...temperatures),
		};

		const nutsGeoJSON: NutsGeoJSON = {
			type: "FeatureCollection",
			features: updatedFeatures,
		};

		console.log(
			`Model data overlay complete: ${Object.keys(modelData).length} regions updated with model data`,
		);
		return { nutsGeoJSON, extremes };
	}

	// Method to reset to calculated data only
	async resetToCalculatedData(
		temperatureData: TemperatureDataPoint[],
	): Promise<{ nutsGeoJSON: NutsGeoJSON; extremes: DataExtremes }> {
		return this.convertDataToNuts(temperatureData);
	}
}

export const nutsConverter = new NutsConverter();
