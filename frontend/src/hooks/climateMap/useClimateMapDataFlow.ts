import { useEffect, useRef } from "react";
import { loadNutsData } from "../../component/Mapper/utilities/mapDataUtils";
import { regionProcessor } from "../../services/RegionProcessor";
import { resolveOutputVariable } from "../../services/modelCardService";
import { gridProcessingStore } from "../../stores/GridProcessingStore";
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

export const useClimateMapDataFlow = ({
	models,
	uiStore,
	userStore,
}: UseClimateMapDataFlowArgs) => {
	const lastInputKeyRef = useRef<string | null>(null);
	const latestGridBuildRequestRef = useRef(0);
	const mapViewportBounds = mapDataStore.mapViewportBounds;
	const dataResolution = mapDataStore.dataResolution;
	const rawModelOutputPoints = modelOutputStore.rawModelOutputPoints;
	const rawModelOutputPointsLength = rawModelOutputPoints.length;

	// biome-ignore lint/correctness/useExhaustiveDependencies: mobx store values should trigger data loading.
	useEffect(() => {
		const loadData = async () => {
			if (userStore.mapMode === "grid" && !mapViewportBounds) {
				console.log("Skipping grid data load until viewport is available");
				return;
			}

			if (userStore.mapMode === "grid") {
				await modelOutputStore.loadModelOutputData(
					userStore.currentYear,
					userStore.currentMonth,
					models,
					userStore.selectedModel,
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
		userStore.mapMode,
		userStore.currentYear,
		userStore.currentMonth,
		userStore.selectedModel,
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

	// biome-ignore lint/correctness/useExhaustiveDependencies: mobx store values should reset processing errors.
	useEffect(() => {
		const inputKey = [
			userStore.mapMode,
			userStore.currentYear,
			userStore.currentMonth,
			userStore.selectedModel,
		].join("|");

		if (!uiStore.dataProcessingError) {
			lastInputKeyRef.current = inputKey;
			return;
		}

		if (lastInputKeyRef.current === null) {
			lastInputKeyRef.current = inputKey;
			return;
		}

		if (lastInputKeyRef.current === inputKey) return;

		uiStore.setDataProcessingError(false);
		uiStore.setGeneralError(null);
		lastInputKeyRef.current = inputKey;
	}, [
		uiStore,
		userStore.mapMode,
		userStore.currentYear,
		userStore.currentMonth,
		userStore.selectedModel,
		uiStore.dataProcessingError,
		uiStore.setDataProcessingError,
		uiStore.setGeneralError,
	]);

	useEffect(() => {
		if (userStore.mapMode !== "europe-only" || uiStore.dataProcessingError) {
			return;
		}

		let isProcessing = false;

		const processEuropeData = async () => {
			if (isProcessing) return;
			isProcessing = true;

			try {
				mapDataStore.setProcessedEuropeNutsRegions(null);
				mapDataStore.setIsProcessingEuropeNutsData(true);
				mapDataStore.setIsLoadingRawData(true);

				const selectedModelData = models.find(
					(model) => model.id === userStore.selectedModel,
				);
				const requestedVariableValue = selectedModelData
					? resolveOutputVariable(selectedModelData)
					: "R0";
				userStore.setCurrentVariableType(requestedVariableValue);

				const nutsApiData = await loadNutsData(
					userStore.currentYear,
					userStore.currentMonth,
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
						userStore.currentYear,
					);

				mapDataStore.setProcessedEuropeNutsRegions(nutsGeoJSON);
				modelOutputStore.setProcessedDataExtremes(extremes);
				mapDataStore.setIsProcessingEuropeNutsData(false);
			} catch (error) {
				console.error("Failed to load/process Europe-only NUTS data:", error);
				if (
					error instanceof Error &&
					(error.message === "NO_DATA" || error.message.includes("API_ERROR:"))
				) {
					uiStore.setUserRequestedYear(userStore.currentYear);
					uiStore.setUserRequestedMonth(userStore.currentMonth);
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
				mapDataStore.setIsProcessingEuropeNutsData(false);
				mapDataStore.setIsLoadingRawData(false);
			} finally {
				isProcessing = false;
			}
		};

		processEuropeData();
	}, [
		uiStore,
		userStore.mapMode,
		userStore.currentYear,
		userStore.currentMonth,
		userStore.selectedModel,
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

	// biome-ignore lint/correctness/useExhaustiveDependencies: mobx store values should trigger processing.
	useEffect(() => {
		if (userStore.mapMode !== "grid") {
			latestGridBuildRequestRef.current += 1;
			gridProcessingStore.setGridCells([]);
			return;
		}

		if (uiStore.dataProcessingError) {
			return;
		}

		const processGridData = async () => {
			if (rawModelOutputPointsLength > 0) {
				const gridBuildRequestId = ++latestGridBuildRequestRef.current;
				const temperatures = rawModelOutputPoints.map(
					(point) => point.temperature,
				);
				modelOutputStore.setProcessedDataExtremes({
					min: Math.min(...temperatures),
					max: Math.max(...temperatures),
				});

				const nextGridCells =
					gridProcessingStore.generateGridCellsFromTemperatureData(
						rawModelOutputPoints,
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
		userStore.mapMode,
		uiStore.dataProcessingError,
		rawModelOutputPoints,
		rawModelOutputPointsLength,
		mapViewportBounds,
		dataResolution,
	]);

	useEffect(() => {
		return () => {
			if (uiStore.mapHoverTimeout) {
				clearTimeout(uiStore.mapHoverTimeout);
			}
		};
	}, [uiStore, uiStore.mapHoverTimeout]);
};
