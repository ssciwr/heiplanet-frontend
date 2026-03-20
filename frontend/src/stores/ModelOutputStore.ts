import { makeAutoObservable } from "mobx";
import type {
	DataExtremes,
	ModelOutputDataPoint,
	Month,
	WorldwideGeoJSON,
} from "../component/Mapper/types";
import {
	loadNutsData,
	loadTemperatureData,
} from "../component/Mapper/utilities/mapDataUtils";
import { resolveOutputVariable } from "../services/modelCardService";
import type { Model } from "../types/model";
import { errorStore } from "./ErrorStore";
import { loadingStore } from "./LoadingStore";

const NATURAL_EARTH_URL = "/downsampled_initial.geojson";

export class ModelOutputStore {
	rawModelOutputDataPoints: ModelOutputDataPoint[] = [];
	processedDataExtremes: DataExtremes | null = null;
	countryBoundaryOverlay: WorldwideGeoJSON | null = null;
	private latestTemperatureLoadRequestId = 0;

	constructor() {
		makeAutoObservable(this);
	}

	setRawModelOutputDataPoints = (data: ModelOutputDataPoint[]) => {
		this.rawModelOutputDataPoints = data;
	};

	setProcessedDataExtremes = (extremes: DataExtremes | null) => {
		this.processedDataExtremes = extremes;
	};

	setCountryBoundaryOverlay = (data: WorldwideGeoJSON | null) => {
		this.countryBoundaryOverlay = data;
	};

	loadModelOutputData = async (
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
		const requestId = ++this.latestTemperatureLoadRequestId;
		console.log(
			`🌡️ ModelOutputStore.loadModelOutputData START - year: ${year}, month: ${month}`,
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

			const selectedModelData = models.find((m) => m.id === selectedModel);
			const requestedVariableValue = selectedModelData
				? resolveOutputVariable(selectedModelData)
				: "R0";
			const outputFormat = selectedModelData?.output;

			setCurrentVariableType(requestedVariableValue);

			const { dataPoints, extremes } = await loadTemperatureData(
				year,
				safeMonth,
				requestedVariableValue,
				outputFormat,
				viewportBounds,
				requestedGridResolution,
			);

			if (requestId !== this.latestTemperatureLoadRequestId) {
				return;
			}

			this.setRawModelOutputDataPoints(dataPoints);
			this.setProcessedDataExtremes(extremes);
			loadingStore.complete();
			setIsLoadingRawData(false);
		} catch (err: unknown) {
			const error = err as Error;
			if (requestId !== this.latestTemperatureLoadRequestId) {
				return;
			}

			loadingStore.complete();
			setIsLoadingRawData(false);

			if (error.message.includes("API_ERROR:")) {
				this.setRawModelOutputDataPoints([]);
				this.setProcessedDataExtremes(null);
				const errorMsg = error.message.replace("API_ERROR: ", "");
				setDataFetchErrorMessage(errorMsg);
				setNoDataModalVisible(true);
			} else {
				errorStore.showError(
					"Model Output Error",
					`Failed to load model output data: ${error.message}`,
				);
				setGeneralError(`Failed to load model output data: ${error.message}`);
			}
		}
	};

	loadCountryBoundaryOverlay = async () => {
		try {
			const response = await fetch(NATURAL_EARTH_URL);
			const data = await response.json();

			const allFeatures = data.features.filter((feature: GeoJSON.Feature) => {
				return (
					feature.geometry?.type === "Polygon" ||
					feature.geometry?.type === "MultiPolygon"
				);
			});

			this.setCountryBoundaryOverlay({
				type: "FeatureCollection" as const,
				features: allFeatures,
			});
		} catch (error) {
			console.error("Failed to load boundary overlay:", error);
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
			setUserRequestedYear(year);

			const selectedModelData = models.find((m) => m.id === selectedModel);
			const requestedVariableValue = selectedModelData
				? resolveOutputVariable(selectedModelData)
				: "R0";
			setCurrentVariableType(requestedVariableValue);

			const nutsData = await loadNutsData(
				year,
				safeMonth,
				requestedVariableValue,
				"NUTS3",
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
}

export const modelOutputStore = new ModelOutputStore();
