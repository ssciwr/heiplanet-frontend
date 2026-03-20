import { useEffect, useRef } from "react";
import type { ModelOutputDataPoint } from "../../component/Mapper/types";
import { loadNutsData } from "../../component/Mapper/utilities/mapDataUtils";
import { regionProcessor } from "../../services/RegionProcessor";
import { resolveOutputVariable } from "../../services/modelCardService";
import { gridProcessingStore } from "../../stores/GridProcessingStore";
import { mapDataStore } from "../../stores/MapDataStore";
import type { MapUIInteractionsStore } from "../../stores/MapUIInteractionsStore";
import { modelOutputStore } from "../../stores/ModelOutputStore";
import type { UserSelectionsForClimateQueryStore } from "../../stores/UserSelectionsForClimateQueryStore";
import type { Model } from "../../types/model";

type UseLoadAndProcessVisibleMapDataFromClimateQueryAndViewportArgs = {
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

type UseGridMapDataArgs =
	UseLoadAndProcessVisibleMapDataFromClimateQueryAndViewportArgs &
		Pick<ClimateQueryAwareArgs, "climateQueryInput"> & {
			mapViewportBounds: typeof mapDataStore.mapViewportBounds;
			dataResolution: typeof mapDataStore.dataResolution;
			rawModelOutputDataPoints: ModelOutputDataPoint[];
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

const useResetMapProcessingErrorOnClimateQueryChange = (
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

const useLoadAndProcessVisibleGridMapDataFromClimateQueryAndViewport = ({
	models,
	uiStore,
	userStore,
	climateQueryInput,
	mapViewportBounds,
	dataResolution,
	rawModelOutputDataPoints,
}: UseGridMapDataArgs) => {
	const latestGridBuildRequestRef = useRef(0);
	const rawModelOutputDataPointsLength = rawModelOutputDataPoints.length;

	useEffect(() => {
		const loadData = async () => {
			if (climateQueryInput.mapMode === "grid" && !mapViewportBounds) {
				console.log("Skipping grid data load until viewport is available");
				return;
			}

			if (climateQueryInput.mapMode === "grid") {
				await modelOutputStore.loadModelOutputData(
					climateQueryInput.currentYear,
					climateQueryInput.currentMonth,
					models,
					climateQueryInput.selectedModel,
					userStore.setCurrentVariableType,
					uiStore.setUserRequestedYear,
					uiStore.setUserRequestedMonth,
					uiStore.setNoDataModalVisible,
					uiStore.setDataFetchErrorMessage,
					mapDataStore.setIsLoadingRawData,
					uiStore.setGeneralError,
					mapViewportBounds,
					dataResolution,
				);
				if (!modelOutputStore.countryBoundaryOverlay) {
					await modelOutputStore.loadCountryBoundaryOverlay();
				}
			}
		};

		loadData();
	}, [
		uiStore,
		climateQueryInput.mapMode,
		climateQueryInput.currentYear,
		climateQueryInput.currentMonth,
		climateQueryInput.selectedModel,
		models,
		userStore.setCurrentVariableType,
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

const useLoadAndProcessVisibleEuropeNutsMapDataFromClimateQuery = ({
	models,
	uiStore,
	userStore,
	climateQueryInput,
}: UseLoadAndProcessVisibleMapDataFromClimateQueryAndViewportArgs &
	Pick<ClimateQueryAwareArgs, "climateQueryInput">) => {
	useEffect(() => {
		// Safeguard against competing/race condition runs that could form an infinite cycle, but this code should never
		// be called in these scenarios anyway
		if (
			climateQueryInput.mapMode !== "europe-only" ||
			uiStore.dataProcessingError
		) {
			return;
		}

		let isProcessing = false;

		const clearEuropeMapDataState = () => {
			mapDataStore.setProcessedEuropeNutsRegions(null);
			mapDataStore.setIsProcessingEuropeNutsData(true);
			mapDataStore.setIsLoadingRawData(true);
		};

		const processEuropeData = async () => {
			if (isProcessing) return;
			isProcessing = true;

			try {
				clearEuropeMapDataState();

				const selectedModelData = models.find(
					(model) => model.id === climateQueryInput.selectedModel,
				);
				const requestedVariableValue = selectedModelData
					? resolveOutputVariable(selectedModelData)
					: "R0";
				userStore.setCurrentVariableType(requestedVariableValue);

				const nutsApiData = await loadNutsData(
					climateQueryInput.currentYear,
					climateQueryInput.currentMonth,
					requestedVariableValue,
					"NUTS3",
				);
				if (Object.keys(nutsApiData).length === 0) {
					throw new Error("NO_DATA");
				}
				mapDataStore.setIsLoadingRawData(false);

				const { nutsGeoJSON, extremes } =
					await regionProcessor.processEuropeOnlyRegionsFromApi(
						nutsApiData,
						climateQueryInput.currentYear,
					);
				// Now fill out the state we cleared...
				mapDataStore.setProcessedEuropeNutsRegions(nutsGeoJSON);
				modelOutputStore.setProcessedDataExtremes(extremes);
				mapDataStore.setIsProcessingEuropeNutsData(false);
			} catch (error) {
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
				mapDataStore.setIsProcessingEuropeNutsData(false);
				mapDataStore.setIsLoadingRawData(false);
			} finally {
				isProcessing = false;
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

export const useLoadAndProcessVisibleMapDataFromClimateQueryAndViewport = ({
	models,
	uiStore,
	userStore,
}: UseLoadAndProcessVisibleMapDataFromClimateQueryAndViewportArgs) => {
	const mapViewportBounds = mapDataStore.mapViewportBounds;
	const dataResolution = mapDataStore.dataResolution;
	const rawModelOutputDataPoints = modelOutputStore.rawModelOutputDataPoints;
	const climateQueryInput = getClimateQueryInput(userStore);
	const climateQueryInputKey = getClimateQueryInputKey(climateQueryInput);

	useResetMapProcessingErrorOnClimateQueryChange(uiStore, climateQueryInputKey);
	useLoadAndProcessVisibleGridMapDataFromClimateQueryAndViewport({
		models,
		uiStore,
		userStore,
		climateQueryInput,
		mapViewportBounds,
		dataResolution,
		rawModelOutputDataPoints,
	});
	useLoadAndProcessVisibleEuropeNutsMapDataFromClimateQuery({
		models,
		uiStore,
		userStore,
		climateQueryInput,
	});
	useClearMapHoverTimeoutOnUnmount(uiStore);
};
