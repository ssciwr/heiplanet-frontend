import { makeAutoObservable } from "mobx";
import type {
	DataExtremes,
	Month,
	TemperatureDataPoint,
	ViewportBounds,
	WorldwideGeoJSON,
} from "../component/Mapper/types";
import {
	loadNutsData,
	loadTemperatureData,
} from "../component/Mapper/utilities/mapDataUtils";
import type { Model } from "../types/model";
import { errorStore } from "./ErrorStore";
import { loadingStore } from "./LoadingStore";

const NATURAL_EARTH_URL =
	"https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson";

export class TemperatureDataStore {
	rawRegionTemperatureData: TemperatureDataPoint[] = [];
	processedDataExtremes: DataExtremes | null = null;
	mapDataBounds: ViewportBounds | null = null;
	baseWorldGeoJSON: GeoJSON.FeatureCollection | null = null;
	worldwideRegionBoundaries: WorldwideGeoJSON | null = null;

	constructor() {
		makeAutoObservable(this);
		this.loadWorldData();
	}

	setRawRegionTemperatureData = (data: TemperatureDataPoint[]) => {
		this.rawRegionTemperatureData = data;
	};

	setProcessedDataExtremes = (extremes: DataExtremes | null) => {
		this.processedDataExtremes = extremes;
	};

	setMapDataBounds = (bounds: ViewportBounds | null) => {
		this.mapDataBounds = bounds;
	};

	setBaseWorldGeoJSON = (data: GeoJSON.FeatureCollection | null) => {
		this.baseWorldGeoJSON = data;
	};

	setWorldwideRegionBoundaries = (data: WorldwideGeoJSON | null) => {
		this.worldwideRegionBoundaries = data;
	};

	loadTemperatureData = async (
		year: number,
		month: Month,
		models: Model[],
		selectedModel: string,
		setCurrentVariableType: (value: string) => void,
		setUserRequestedYear: (year: number) => void,
		setUserRequestedMonth: (month: number) => void,
		setNoDataModalVisible: (visible: boolean) => void,
		setDataFetchErrorMessage: (message: string) => void,
		setIsLoadingRawData: (loading: boolean) => void,
		setGeneralError: (error: string | null) => void,
		viewportBounds?: {
			north: number;
			south: number;
			east: number;
			west: number;
		} | null,
		requestedGridResolution?: number,
	) => {
		const loadStart = performance.now();
		console.log(
			`🌡️ TemperatureDataStore.loadTemperatureData START - year: ${year}, month: ${month}`,
		);

		try {
			loadingStore.start();
			setIsLoadingRawData(true);

			const safeMonth = month || 7;
			console.log(
				`🚀 Starting to load data for year ${year}, month ${safeMonth}`,
				"Original month:",
				month,
				"Types:",
				typeof year,
				typeof month,
			);
			setUserRequestedYear(year);
			setUserRequestedMonth(safeMonth);

			const modelFindStart = performance.now();
			const selectedModelData = models.find((m) => m.id === selectedModel);
			const requestedVariableValue = selectedModelData?.output?.[0] || "R0";
			const outputFormat = selectedModelData?.output;
			console.log(
				`🔍 Model selection took ${(performance.now() - modelFindStart).toFixed(2)}ms`,
			);

			setCurrentVariableType(requestedVariableValue);

			const dataLoadStart = performance.now();
			const { dataPoints, extremes, bounds } = await loadTemperatureData(
				year,
				safeMonth,
				requestedVariableValue,
				outputFormat,
				viewportBounds,
				requestedGridResolution,
			);
			console.log(
				`📊 loadTemperatureData utility took ${(performance.now() - dataLoadStart).toFixed(2)}ms`,
			);

			console.log(
				`📈 Loaded ${dataPoints.length} data points for year ${year}, month ${safeMonth}`,
			);
			console.log(
				`🔬 Sample point for year ${year}, month ${safeMonth}:`,
				dataPoints[0],
			);
			console.log(
				`📏 Data extremes for year ${year}, month ${safeMonth}:`,
				extremes,
			);

			const storeUpdateStart = performance.now();
			this.setRawRegionTemperatureData(dataPoints);
			this.setProcessedDataExtremes(extremes);

			if (bounds) {
				const viewportBounds: ViewportBounds = {
					north: bounds.getNorth(),
					south: bounds.getSouth(),
					east: bounds.getEast(),
					west: bounds.getWest(),
					zoom: 10,
				};
				this.setMapDataBounds(viewportBounds);
			}
			console.log(
				`💾 Store updates took ${(performance.now() - storeUpdateStart).toFixed(2)}ms`,
			);

			const totalTime = performance.now() - loadStart;
			console.log(
				`✅ TemperatureDataStore.loadTemperatureData COMPLETE for year ${year}, month ${safeMonth} in ${totalTime.toFixed(2)}ms`,
			);
			loadingStore.complete();
			setIsLoadingRawData(false);
		} catch (err: unknown) {
			const error = err as Error;
			console.log(
				`❌ TemperatureDataStore.loadTemperatureData FAILED in ${(performance.now() - loadStart).toFixed(2)}ms: ${error.message}`,
			);
			loadingStore.complete();
			setIsLoadingRawData(false);

			if (error.message.includes("API_ERROR:")) {
				this.setRawRegionTemperatureData([]);
				this.setProcessedDataExtremes(null);
				this.setMapDataBounds(null);
				const errorMsg = error.message.replace("API_ERROR: ", "");
				setDataFetchErrorMessage(errorMsg);
				setNoDataModalVisible(true);
			} else {
				errorStore.showError(
					"Temperature Data Error",
					`Failed to load temperature data: ${error.message}`,
				);
				setGeneralError(`Failed to load temperature data: ${error.message}`);
			}
		}
	};

	loadWorldwideRegions = async () => {
		try {
			console.log("Loading global administrative regions...");
			const response = await fetch(NATURAL_EARTH_URL);
			const data = await response.json();

			const allFeatures = data.features.filter((feature: GeoJSON.Feature) => {
				return (
					feature.geometry?.type === "Polygon" ||
					feature.geometry?.type === "MultiPolygon"
				);
			});

			const globalRegions: WorldwideGeoJSON = {
				type: "FeatureCollection" as const,
				features: allFeatures,
			};

			this.setWorldwideRegionBoundaries(globalRegions);
			console.log(
				`Loaded ${allFeatures.length} global administrative regions from all countries`,
			);
		} catch (error) {
			console.error("Failed to load worldwide administrative regions:", error);
		}
	};

	loadNutsData = async (
		year: number,
		month: Month,
		models: Model[],
		selectedModel: string,
		setCurrentVariableType: (value: string) => void,
		setUserRequestedYear: (year: number) => void,
		setNoDataModalVisible: (visible: boolean) => void,
		setDataFetchErrorMessage: (message: string) => void,
		setIsLoadingRawData: (loading: boolean) => void,
		setGeneralError: (error: string | null) => void,
	) => {
		try {
			loadingStore.start();
			setIsLoadingRawData(true);

			const safeMonth = month || 7;
			console.log(`Loading NUTS data for year ${year}, month ${safeMonth}`);
			setUserRequestedYear(year);

			const selectedModelData = models.find((m) => m.id === selectedModel);
			const requestedVariableValue = selectedModelData?.output?.[0] || "R0";
			setCurrentVariableType(requestedVariableValue);

			const nutsData = await loadNutsData(
				year,
				safeMonth,
				requestedVariableValue,
				"NUTS3",
			);

			console.log(
				`Loaded NUTS data for ${Object.keys(nutsData).length} regions`,
			);
			loadingStore.complete();
			setIsLoadingRawData(false);
			return nutsData;
		} catch (err: unknown) {
			const error = err as Error;
			loadingStore.complete();
			setIsLoadingRawData(false);

			if (error.message.includes("API_ERROR:")) {
				const errorMsg = error.message.replace("API_ERROR: ", "");
				setDataFetchErrorMessage(errorMsg);
				setNoDataModalVisible(true);
			} else {
				errorStore.showError(
					"NUTS Data Error",
					`Failed to load NUTS data: ${error.message}`,
				);
				setGeneralError(`Failed to load NUTS data: ${error.message}`);
			}
			throw error;
		}
	};

	private loadWorldData = async () => {
		try {
			const response = await fetch(
				"https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson",
			);
			const worldData = await response.json();
			this.setBaseWorldGeoJSON(worldData);
		} catch (error) {
			console.warn("Failed to load world GeoJSON:", error);
		}
	};
}

export const temperatureDataStore = new TemperatureDataStore();
