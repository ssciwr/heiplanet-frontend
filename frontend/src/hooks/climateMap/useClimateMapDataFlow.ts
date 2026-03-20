import { useEffect, useRef } from "react";
import type { ModelOutputDataPoint } from "../../component/Mapper/types";
import { regionProcessor } from "../../services/RegionProcessor";
import { modelOutputLoader } from "../../services/modelOutputLoader";
import { errorStore } from "../../stores/ErrorStore";
import { gridProcessingStore } from "../../stores/GridProcessingStore";
import { loadingStore } from "../../stores/LoadingStore";
import { mapDataStore } from "../../stores/MapDataStore";
import type { MapUIInteractionsStore } from "../../stores/MapUIInteractionsStore";
import { modelOutputStore } from "../../stores/ModelOutputStore";
import type { UserSelectionsForClimateQueryStore } from "../../stores/UserSelectionsForClimateQueryStore";
import type { Model } from "../../types/model";

type UseClimateMapDataFlowArgs = {
	models: Model[];
	uiStore: MapUIInteractionsStore;
	userStore: UserSelectionsForClimateQueryStore;
};

/** The options we currently read to / derive the full request from
For example, when mapMode is Grid, this then includes the viewport (max/min x-y + resolution derived from current zoom).
	For that grid scenario see UseGridMapDataArgs which includes this alongside Grid query data.

 In the future, Optimism could also be here (as that spans all grid modes)

	*/
type ClimateQueryInput = {
	mapMode: UserSelectionsForClimateQueryStore["mapMode"];
	currentYear: UserSelectionsForClimateQueryStore["currentYear"];
	currentMonth: UserSelectionsForClimateQueryStore["currentMonth"];
	selectedModel: UserSelectionsForClimateQueryStore["selectedModel"];
};

type ClimateQueryAwareArgs = {
	climateQueryInput: ClimateQueryInput; // Stored as raw data for reference for passing around as an object
	climateQueryInputKey: string;
};

type UseGridMapDataArgs = UseClimateMapDataFlowArgs &
	Pick<ClimateQueryAwareArgs, "climateQueryInput"> & {
		mapViewportBounds: typeof mapDataStore.mapViewportBounds;
		dataResolution: typeof mapDataStore.dataResolution;
		rawModelOutputDataPoints: ModelOutputDataPoint[];
	};

const startRawDataLoad = () => {
	loadingStore.start();
	mapDataStore.setIsLoadingRawData(true);
};

const completeRawDataLoad = () => {
	loadingStore.complete();
	mapDataStore.setIsLoadingRawData(false);
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

// note: grid-only data flow.
// this is only used in Grid mode, not NUTS mode.
// NUTS mode uses regional GeoJSON rather than grid-cell rendering.
const useGridModeData = ({
	models,
	uiStore,
	userStore,
	climateQueryInput,
	mapViewportBounds,
	dataResolution,
	rawModelOutputDataPoints,
}: UseGridMapDataArgs) => {
	const latestGridLoadRequestRef = useRef(0);
	const latestGridBuildRequestRef = useRef(0);
	const rawModelOutputDataPointsLength = rawModelOutputDataPoints.length;

	useEffect(() => {
		const loadData = async () => {
			if (climateQueryInput.mapMode === "grid" && !mapViewportBounds) {
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
							models,
							selectedModel: climateQueryInput.selectedModel,
							viewportBounds: mapViewportBounds,
							requestedGridResolution: dataResolution,
						});
					if (requestId !== latestGridLoadRequestRef.current) {
						return;
					}

					userStore.setCurrentVariableType(requestedVariableValue);
					uiStore.setUserRequestedYear(climateQueryInput.currentYear);
					uiStore.setUserRequestedMonth(safeMonth);
					modelOutputStore.setRawModelOutputDataPoints(dataPoints);
					modelOutputStore.setProcessedDataExtremes(extremes);

					if (!modelOutputStore.countryBoundaryOverlay) {
						await modelOutputStore.loadCountryBoundaryOverlay();
					}
				} catch (err: unknown) {
					const error = err as Error;
					if (requestId !== latestGridLoadRequestRef.current) {
						return;
					}

					if (error.message.includes("API_ERROR:")) {
						modelOutputStore.setRawModelOutputDataPoints([]);
						modelOutputStore.setProcessedDataExtremes(null);
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
		climateQueryInput.selectedModel,
		models,
		uiStore.setUserRequestedYear,
		uiStore.setUserRequestedMonth,
		uiStore.setNoDataModalVisible,
		uiStore.setDataFetchErrorMessage,
		uiStore.setGeneralError,
		mapViewportBounds,
		dataResolution,
	]);

	useEffect(() => {
		if (climateQueryInput.mapMode !== "grid") {
			latestGridBuildRequestRef.current += 1;
			gridProcessingStore.setGridCells([]);
			return;
		}

		if (uiStore.dataProcessingError) {
			return;
		}

		const processGridData = async () => {
			if (rawModelOutputDataPointsLength > 0) {
				const gridBuildRequestId = ++latestGridBuildRequestRef.current;
				const outputValues = rawModelOutputDataPoints.map(
					(point) => point.modelOutputValue,
				);
				modelOutputStore.setProcessedDataExtremes({
					min: Math.min(...outputValues),
					max: Math.max(...outputValues),
				});

				const nextGridCells =
					gridProcessingStore.generateGridCellsFromTemperatureData(
						rawModelOutputDataPoints,
						mapViewportBounds,
						dataResolution,
					);
				if (gridBuildRequestId !== latestGridBuildRequestRef.current) {
					return;
				}
				gridProcessingStore.setGridCells(nextGridCells);
				return;
			}

			latestGridBuildRequestRef.current += 1;
			gridProcessingStore.setGridCells([]);
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
	]);
};

const useEuropeNutsData = ({
	models,
	uiStore,
	userStore,
	climateQueryInput,
}: UseClimateMapDataFlowArgs &
	Pick<ClimateQueryAwareArgs, "climateQueryInput">) => {
	const latestEuropeLoadRequestRef = useRef(0);

	useEffect(() => {
		if (
			climateQueryInput.mapMode !== "europe-only" ||
			uiStore.dataProcessingError
		) {
			return;
		}

		const clearEuropeMapDataState = () => {
			mapDataStore.setProcessedEuropeNutsRegions(null);
			mapDataStore.setIsProcessingEuropeNutsData(true);
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
						models,
						selectedModel: climateQueryInput.selectedModel,
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
				// Now fill out the state we cleared...
				mapDataStore.setProcessedEuropeNutsRegions(nutsGeoJSON);
				modelOutputStore.setProcessedDataExtremes(extremes);
			} catch (error) {
				if (requestId !== latestEuropeLoadRequestRef.current) {
					return;
				}

				if (!rawDataLoadCompleted) {
					completeRawDataLoad();
					rawDataLoadCompleted = true;
				}

				console.error("Failed to load/process Europe-only NUTS data:", error);
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
					/* This error handling is a little bit convulted but serves a purpose becuase we are not really
					displaying one "homogenous" type of error */
				} else {
					uiStore.setDataProcessingError(true);
					uiStore.setGeneralError("Failed to process Europe-only NUTS data");
				}
			} finally {
				if (requestId === latestEuropeLoadRequestRef.current) {
					mapDataStore.setIsProcessingEuropeNutsData(false);
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
		climateQueryInput.selectedModel,
		uiStore.dataProcessingError,
		models,
		userStore,
		userStore.setCurrentVariableType,
		uiStore.setDataProcessingError,
		uiStore.setGeneralError,
		uiStore.setUserRequestedYear,
		uiStore.setUserRequestedMonth,
		uiStore.setDataFetchErrorMessage,
		uiStore.setNoDataModalVisible,
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

export const useClimateMapDataFlow = ({
	models,
	uiStore,
	userStore,
}: UseClimateMapDataFlowArgs) => {
	const mapViewportBounds = mapDataStore.mapViewportBounds;
	const dataResolution = mapDataStore.dataResolution;
	const rawModelOutputDataPoints = modelOutputStore.rawModelOutputDataPoints;
	const climateQueryInput = getClimateQueryInput(userStore);
	const climateQueryInputKey = getClimateQueryInputKey(climateQueryInput);

	useResetMapProcessingErrorOnQueryChange(uiStore, climateQueryInputKey);
	useGridModeData({
		models,
		uiStore,
		userStore,
		climateQueryInput,
		mapViewportBounds,
		dataResolution,
		rawModelOutputDataPoints,
	});
	useEuropeNutsData({
		models,
		uiStore,
		userStore,
		climateQueryInput,
	});
	useClearMapHoverTimeoutOnUnmount(uiStore);
};
