import { useEffect, useRef, useState } from "react";
import type {
	DataExtremes,
	ModelOutputDataPoint,
} from "../../component/Mapper/types";
import { regionProcessor } from "../../services/RegionProcessor";
import { modelOutputLoader } from "../../services/modelOutputLoader";
import { errorStore } from "../../stores/ErrorStore";
import { gridProcessingStore } from "../../stores/GridProcessingStore";
import { loadingStore } from "../../stores/LoadingStore";
import { mapDisplayedDataStore } from "../../stores/MapDisplayedDataStore";
import type { MapUIInteractionsStore } from "../../stores/MapUIInteractionsStore";
import { mapViewportInputsStore } from "../../stores/MapViewportInputsStore";
import type { UserSelectionsForClimateQueryStore } from "../../stores/UserSelectionsForClimateQueryStore";
import type { Model } from "../../types/model";

type UseClimateDataLoaderArgs = {
	selectedModelData?: Model;
	setProcessedDataExtremes: (extremes: DataExtremes | null) => void;
	uiStore: MapUIInteractionsStore;
	userStore: UserSelectionsForClimateQueryStore;
};

type ClimateQueryInput = {
	mapMode: UserSelectionsForClimateQueryStore["mapMode"];
	currentYear: UserSelectionsForClimateQueryStore["currentYear"];
	currentMonth: UserSelectionsForClimateQueryStore["currentMonth"];
	selectedModel: UserSelectionsForClimateQueryStore["selectedModel"];
};

type ClimateQueryAwareArgs = {
	climateQueryInput: ClimateQueryInput;
	climateQueryInputKey: string;
};

type UseGridDataArgs = UseClimateDataLoaderArgs &
	Pick<ClimateQueryAwareArgs, "climateQueryInput"> & {
		mapViewportBounds: typeof mapViewportInputsStore.mapViewportBounds;
		dataResolution: typeof mapViewportInputsStore.dataResolution;
		rawModelOutputDataPoints: ModelOutputDataPoint[];
		setRawModelOutputDataPoints: (data: ModelOutputDataPoint[]) => void;
	};

const startRawDataLoad = () => {
	loadingStore.start();
	mapDisplayedDataStore.setIsLoadingRawData(true);
};

const completeRawDataLoad = () => {
	loadingStore.complete();
	mapDisplayedDataStore.setIsLoadingRawData(false);
};

const getClimateQueryInput = (
	userStore: UserSelectionsForClimateQueryStore,
): ClimateQueryInput => ({
	mapMode: userStore.mapMode,
	currentYear: userStore.currentYear,
	currentMonth: userStore.currentMonth,
	selectedModel: userStore.selectedModel,
});

const getClimateQueryInputKey = ({
	mapMode,
	currentYear,
	currentMonth,
	selectedModel,
}: ClimateQueryInput) =>
	[mapMode, currentYear, currentMonth, selectedModel].join("|");

const useResetMapProcessingErrorOnQueryChange = (
	uiStore: MapUIInteractionsStore,
	climateQueryInputKey: string,
) => {
	const lastInputKeyRef = useRef<string | null>(null);

	useEffect(() => {
		if (!uiStore.dataProcessingError) {
			lastInputKeyRef.current = climateQueryInputKey;
			return;
		}

		if (lastInputKeyRef.current === null) {
			lastInputKeyRef.current = climateQueryInputKey;
			return;
		}

		if (lastInputKeyRef.current === climateQueryInputKey) return;

		uiStore.setDataProcessingError(false);
		uiStore.setGeneralError(null);
		lastInputKeyRef.current = climateQueryInputKey;
	}, [
		uiStore,
		climateQueryInputKey,
		uiStore.dataProcessingError,
		uiStore.setDataProcessingError,
		uiStore.setGeneralError,
	]);
};

const useGridDataFlow = ({
	selectedModelData,
	setProcessedDataExtremes,
	uiStore,
	userStore,
	climateQueryInput,
	mapViewportBounds,
	dataResolution,
	rawModelOutputDataPoints,
	setRawModelOutputDataPoints,
}: UseGridDataArgs) => {
	const latestGridLoadRequestRef = useRef(0);
	const latestGridBuildRequestRef = useRef(0);
	const rawModelOutputDataPointsLength = rawModelOutputDataPoints.length;

	useEffect(() => {
		if (!selectedModelData) {
			return;
		}

		const loadData = async () => {
			if (climateQueryInput.mapMode === "grid" && !mapViewportBounds) {
				setProcessedDataExtremes(null);
				console.log("Skipping grid data load until viewport is available");
				return;
			}

			if (climateQueryInput.mapMode === "grid") {
				const requestId = ++latestGridLoadRequestRef.current;

				try {
					startRawDataLoad();

					const { dataPoints, extremes, requestedVariableValue, safeMonth } =
						await modelOutputLoader.loadGridData({
							year: climateQueryInput.currentYear,
							month: climateQueryInput.currentMonth,
							selectedModelData,
							viewportBounds: mapViewportBounds,
							requestedGridResolution: dataResolution,
						});
					if (requestId !== latestGridLoadRequestRef.current) {
						return;
					}

					userStore.setCurrentVariableType(requestedVariableValue);
					uiStore.setUserRequestedYear(climateQueryInput.currentYear);
					uiStore.setUserRequestedMonth(safeMonth);
					setRawModelOutputDataPoints(dataPoints);
					setProcessedDataExtremes(extremes);

					if (!mapDisplayedDataStore.countryBoundaryOverlay) {
						await mapDisplayedDataStore.loadCountryBoundaryOverlay();
					}
				} catch (err: unknown) {
					const error = err as Error;
					if (requestId !== latestGridLoadRequestRef.current) {
						return;
					}

					setProcessedDataExtremes(null);

					if (error.message.includes("API_ERROR:")) {
						setRawModelOutputDataPoints([]);
						uiStore.setUserRequestedYear(climateQueryInput.currentYear);
						uiStore.setUserRequestedMonth(climateQueryInput.currentMonth);
						uiStore.setDataFetchErrorMessage(
							error.message.replace("API_ERROR: ", ""),
						);
						uiStore.setNoDataModalVisible(true);
						uiStore.setGeneralError(null);
					} else {
						errorStore.showError(
							"Model Output Error",
							`Failed to load model output data: ${error.message}`,
						);
						uiStore.setGeneralError(
							`Failed to load model output data: ${error.message}`,
						);
					}
				} finally {
					if (requestId === latestGridLoadRequestRef.current) {
						completeRawDataLoad();
					}
				}
			}
		};

		loadData();
	}, [
		uiStore,
		userStore,
		climateQueryInput.mapMode,
		climateQueryInput.currentYear,
		climateQueryInput.currentMonth,
		selectedModelData,
		uiStore.setUserRequestedYear,
		uiStore.setUserRequestedMonth,
		uiStore.setNoDataModalVisible,
		uiStore.setDataFetchErrorMessage,
		uiStore.setGeneralError,
		mapViewportBounds,
		dataResolution,
		setRawModelOutputDataPoints,
		setProcessedDataExtremes,
	]);

	useEffect(() => {
		if (climateQueryInput.mapMode !== "grid") {
			latestGridBuildRequestRef.current += 1;
			setRawModelOutputDataPoints([]);
			mapDisplayedDataStore.setGridCells([]);
			return;
		}

		if (uiStore.dataProcessingError) {
			return;
		}

		const processGridData = async () => {
			if (rawModelOutputDataPointsLength > 0) {
				const gridBuildRequestId = ++latestGridBuildRequestRef.current;
				const nextGridCells =
					gridProcessingStore.generateGridCellsFromTemperatureData(
						rawModelOutputDataPoints,
						mapViewportBounds,
						dataResolution,
					);
				if (gridBuildRequestId !== latestGridBuildRequestRef.current) {
					return;
				}
				mapDisplayedDataStore.setGridCells(nextGridCells);
				return;
			}

			latestGridBuildRequestRef.current += 1;
			mapDisplayedDataStore.setGridCells([]);
		};

		processGridData();
	}, [
		uiStore,
		climateQueryInput.mapMode,
		uiStore.dataProcessingError,
		rawModelOutputDataPoints,
		rawModelOutputDataPointsLength,
		mapViewportBounds,
		dataResolution,
		setRawModelOutputDataPoints,
	]);
};

const useEuropeNutsFlow = ({
	selectedModelData,
	setProcessedDataExtremes,
	uiStore,
	userStore,
	climateQueryInput,
}: UseClimateDataLoaderArgs &
	Pick<ClimateQueryAwareArgs, "climateQueryInput">) => {
	const latestEuropeLoadRequestRef = useRef(0);

	useEffect(() => {
		if (
			climateQueryInput.mapMode !== "europe-only" ||
			uiStore.dataProcessingError ||
			!selectedModelData
		) {
			return;
		}

		const clearEuropeMapDataState = () => {
			mapDisplayedDataStore.setProcessedEuropeNutsRegions(null);
			mapDisplayedDataStore.setIsProcessingEuropeNutsData(true);
			setProcessedDataExtremes(null);
		};

		const processEuropeData = async () => {
			const requestId = ++latestEuropeLoadRequestRef.current;
			let rawDataLoadCompleted = false;

			try {
				clearEuropeMapDataState();
				startRawDataLoad();

				const { nutsApiData, requestedVariableValue, safeMonth } =
					await modelOutputLoader.loadEuropeNutsData({
						year: climateQueryInput.currentYear,
						month: climateQueryInput.currentMonth,
						selectedModelData,
					});
				if (requestId !== latestEuropeLoadRequestRef.current) {
					return;
				}

				userStore.setCurrentVariableType(requestedVariableValue);
				uiStore.setUserRequestedYear(climateQueryInput.currentYear);
				uiStore.setUserRequestedMonth(safeMonth);
				if (Object.keys(nutsApiData).length === 0) {
					throw new Error("NO_DATA");
				}
				completeRawDataLoad();
				rawDataLoadCompleted = true;

				const { nutsGeoJSON, extremes } =
					await regionProcessor.processEuropeOnlyRegionsFromApi(
						nutsApiData,
						climateQueryInput.currentYear,
					);
				if (requestId !== latestEuropeLoadRequestRef.current) {
					return;
				}
				mapDisplayedDataStore.setProcessedEuropeNutsRegions(nutsGeoJSON);
				setProcessedDataExtremes(extremes);
			} catch (error) {
				if (requestId !== latestEuropeLoadRequestRef.current) {
					return;
				}

				if (!rawDataLoadCompleted) {
					completeRawDataLoad();
					rawDataLoadCompleted = true;
				}

				console.error("Failed to load/process Europe-only NUTS data:", error);
				setProcessedDataExtremes(null);
				if (
					error instanceof Error &&
					(error.message === "NO_DATA" || error.message.includes("API_ERROR:"))
				) {
					uiStore.setUserRequestedYear(climateQueryInput.currentYear);
					uiStore.setUserRequestedMonth(climateQueryInput.currentMonth);
					uiStore.setDataFetchErrorMessage(
						error.message === "NO_DATA"
							? "No data found for this request."
							: error.message.replace("API_ERROR: ", ""),
					);
					uiStore.setNoDataModalVisible(true);
					uiStore.setDataProcessingError(false);
					uiStore.setGeneralError(null);
				} else {
					uiStore.setDataProcessingError(true);
					uiStore.setGeneralError("Failed to process Europe-only NUTS data");
				}
			} finally {
				if (requestId === latestEuropeLoadRequestRef.current) {
					mapDisplayedDataStore.setIsProcessingEuropeNutsData(false);
					if (!rawDataLoadCompleted) {
						completeRawDataLoad();
					}
				}
			}
		};

		processEuropeData();
	}, [
		uiStore,
		climateQueryInput.mapMode,
		climateQueryInput.currentYear,
		climateQueryInput.currentMonth,
		uiStore.dataProcessingError,
		selectedModelData,
		userStore,
		userStore.setCurrentVariableType,
		uiStore.setDataProcessingError,
		uiStore.setGeneralError,
		uiStore.setUserRequestedYear,
		uiStore.setUserRequestedMonth,
		uiStore.setDataFetchErrorMessage,
		uiStore.setNoDataModalVisible,
		setProcessedDataExtremes,
	]);
};

const useClearMapHoverTimeoutOnUnmount = (uiStore: MapUIInteractionsStore) => {
	useEffect(() => {
		return () => {
			if (uiStore.mapHoverTimeout) {
				clearTimeout(uiStore.mapHoverTimeout);
			}
		};
	}, [uiStore, uiStore.mapHoverTimeout]);
};

export const useClimateDataLoader = ({
	selectedModelData,
	setProcessedDataExtremes,
	uiStore,
	userStore,
}: UseClimateDataLoaderArgs) => {
	const mapViewportBounds = mapViewportInputsStore.mapViewportBounds;
	const dataResolution = mapViewportInputsStore.dataResolution;
	const [rawModelOutputDataPoints, setRawModelOutputDataPoints] = useState<
		ModelOutputDataPoint[]
	>([]);
	const climateQueryInput = getClimateQueryInput(userStore);
	const climateQueryInputKey = getClimateQueryInputKey(climateQueryInput);

	useResetMapProcessingErrorOnQueryChange(uiStore, climateQueryInputKey);
	useGridDataFlow({
		selectedModelData,
		setProcessedDataExtremes,
		uiStore,
		userStore,
		climateQueryInput,
		mapViewportBounds,
		dataResolution,
		rawModelOutputDataPoints,
		setRawModelOutputDataPoints,
	});
	useEuropeNutsFlow({
		selectedModelData,
		setProcessedDataExtremes,
		uiStore,
		userStore,
		climateQueryInput,
	});
	useClearMapHoverTimeoutOnUnmount(uiStore);
};
