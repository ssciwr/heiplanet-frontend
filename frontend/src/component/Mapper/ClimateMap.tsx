import { useCallback, useEffect, useRef } from "react";
import { MapContainer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { LatLngBounds } from "leaflet";
import ViewportMonitor from "./ViewportMonitor.tsx";
import "./Map.css";
import { observer } from "mobx-react-lite";
import { isMobile } from "react-device-detect";
import { useUserSelectionsForClimateQueryStore } from "../../contexts/UserSelectionsForClimateQueryContext";
import { useMapScreenshot } from "../../hooks/useMapScreenshot";
import { useMapUIInteractions } from "../../hooks/useMapUIInteractions";
import { useModelData } from "../../hooks/useModelData";
import { regionProcessor } from "../../services/RegionProcessor";
import { resolveOutputVariable } from "../../services/modelCardService";
import Footer from "../../static/Footer.tsx";
import { gridProcessingStore } from "../../stores/GridProcessingStore";
import { mapDataStore } from "../../stores/MapDataStore";
import { modelOutputStore } from "../../stores/ModelOutputStore";
import * as MapInteractionHandlers from "../../utils/MapInteractionHandlers";
import AdvancedTimelineSelector from "./InterfaceInputs/AdvancedTimelineSelector.tsx";
import MobileSideButtons from "./InterfaceInputs/MobileSideButtons.tsx";
import LoadingSkeleton from "./LoadingSkeleton.tsx";
import MapHeader from "./MapHeader.tsx";
import MapLayers from "./MapLayers.tsx";
import NoDataModal from "./NoDataModal.tsx";
import { loadNutsData } from "./utilities/mapDataUtils";
import { Legend, MAX_ZOOM, MIN_ZOOM } from "./utilities/mapDataUtils";
import { getVariableUnit } from "./utilities/monthUtils";

// Coarser grid at low zoom to keep requests light; finer as you zoom in
const GRID_RESOLUTION_BY_ZOOM = [5.0, 3.0, 2.5, 2.0, 1.5, 1.0, 0.5, 0.2, 0.1];

console.log("GRID-PROBLEM-DEBUG ClimateMap module loaded");

const getGridResolutionForZoom = (zoom: number) => {
	const clampedIndex = Math.max(
		0,
		Math.min(GRID_RESOLUTION_BY_ZOOM.length - 1, Math.round(zoom)),
	);
	return GRID_RESOLUTION_BY_ZOOM[clampedIndex];
};

type ClimateMapProps = {
	onMount?: () => boolean;
};

const ClimateMap = observer(({ onMount = () => true }: ClimateMapProps) => {
	console.log("GRID-PROBLEM-DEBUG ClimateMap render");
	const userStore = useUserSelectionsForClimateQueryStore();
	const lastInputKeyRef = useRef<string | null>(null);
	const latestGridBuildRequestRef = useRef(0);
	const mapViewportBounds = mapDataStore.mapViewportBounds;
	const dataResolution = mapDataStore.dataResolution;
	const rawModelOutputPoints = modelOutputStore.rawModelOutputPoints;
	const rawModelOutputPointsLength = rawModelOutputPoints.length;
	const {
		generalError,
		setGeneralError,
		dataProcessingError,
		setDataProcessingError,
		noDataModalVisible,
		setNoDataModalVisible,
		userRequestedYear,
		setUserRequestedYear,
		userRequestedMonth,
		setUserRequestedMonth,
		dataFetchErrorMessage,
		setDataFetchErrorMessage,
		mapScreenshoter,
		setMapScreenshoter,
		mapHoverTimeout,
	} = useMapUIInteractions();

	// Use model data hook
	const { models, modelMetadataError, modelMetadataLoading } = useModelData(
		userStore.selectedModel,
		userStore.setSelectedModel,
	);

	// Use screenshot hook
	const { handleScreenshot } = useMapScreenshot({
		map: mapDataStore.leafletMapInstance,
		screenshoter: mapScreenshoter,
		setScreenshoter: setMapScreenshoter,
		models,
		selectedModel: userStore.selectedModel,
		currentYear: userStore.currentYear,
		currentMonth: userStore.currentMonth,
		selectedOptimism: userStore.selectedOptimism,
	});

	// Load data when mode changes
	// biome-ignore lint/correctness/useExhaustiveDependencies: mobx store values should trigger data loading.
	useEffect(() => {
		const loadData = async () => {
			// Avoid global requests before viewport is known in grid mode
			if (userStore.mapMode === "grid" && !mapViewportBounds) {
				console.log("Skipping grid data load until viewport is available");
				return;
			}

			if (userStore.mapMode === "grid") {
				console.log("Loading lat/lon data for grid mode");
				console.log(
					"🗺️ Current mapViewportBounds when loading data:",
					mapViewportBounds,
				);

				// Use current viewport bounds for data fetching
				const viewportBoundsToUse = mapViewportBounds;
				console.log("🔄 Using viewport bounds:", viewportBoundsToUse);

				await modelOutputStore.loadModelOutputData(
					userStore.currentYear,
					userStore.currentMonth,
					models,
					userStore.selectedModel,
					userStore.setCurrentVariableType,
					setUserRequestedYear,
					setUserRequestedMonth,
					setNoDataModalVisible,
					setDataFetchErrorMessage,
					mapDataStore.setIsLoadingRawData,
					setGeneralError,
					viewportBoundsToUse,
					dataResolution,
				);
				if (!modelOutputStore.countryBoundaryOverlay) {
					await modelOutputStore.loadCountryBoundaryOverlay();
				}
			}
		};

		loadData();
	}, [
		userStore.mapMode,
		userStore.currentYear,
		userStore.currentMonth,
		userStore.selectedModel,
		models,
		userStore.setCurrentVariableType,
		setUserRequestedYear,
		setUserRequestedMonth,
		setNoDataModalVisible,
		setDataFetchErrorMessage,
		setGeneralError,
		mapViewportBounds,
		dataResolution,
	]);

	useEffect(() => {
		onMount?.();
	}, [onMount]);

	// Clear processing errors on mode or input changes to avoid blocking other modes.
	// biome-ignore lint/correctness/useExhaustiveDependencies: mobx store values should reset processing errors.
	useEffect(() => {
		const inputKey = [
			userStore.mapMode,
			userStore.currentYear,
			userStore.currentMonth,
			userStore.selectedModel,
		].join("|");

		if (!dataProcessingError) {
			lastInputKeyRef.current = inputKey;
			return;
		}

		if (lastInputKeyRef.current === null) {
			lastInputKeyRef.current = inputKey;
			return;
		}

		if (lastInputKeyRef.current === inputKey) return;

		console.log("Resetting dataProcessingError due to input change");
		setDataProcessingError(false);
		setGeneralError(null);
		lastInputKeyRef.current = inputKey;
	}, [
		userStore.mapMode,
		userStore.currentYear,
		userStore.currentMonth,
		userStore.selectedModel,
		dataProcessingError,
		setDataProcessingError,
		setGeneralError,
	]);

	// Process data based on map mode - separate effects to prevent dependency loops
	// Europe-only mode effect (independent of modelOutputStore.rawModelOutputPoints)
	useEffect(() => {
		if (userStore.mapMode !== "europe-only" || dataProcessingError) {
			console.log(
				"Change of map mode, but only europe is supported for now.",
				userStore.mapMode,
			);
			return;
		}

		// Only run once per year/month combination to prevent infinite loops
		let isProcessing = false;

		const processEuropeData = async () => {
			if (isProcessing) return;
			isProcessing = true;

			try {
				console.log(
					`Processing Europe NUTS: ${userStore.currentYear}-${userStore.currentMonth}`,
				);
				// Clear existing data immediately to prevent stale display
				mapDataStore.setProcessedEuropeNutsRegions(null);
				mapDataStore.setIsProcessingEuropeNutsData(true);

				// Load NUTS data directly from API (avoid unstable function dependency)
				mapDataStore.setIsLoadingRawData(true);
				const selectedModelData = models.find(
					(m) => m.id === userStore.selectedModel,
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

				// Process API data into GeoJSON format
				const { nutsGeoJSON, extremes } =
					await regionProcessor.processEuropeOnlyRegionsFromApi(
						nutsApiData,
						userStore.currentYear,
					);

				// Update state with processed data
				mapDataStore.setProcessedEuropeNutsRegions(nutsGeoJSON);
				modelOutputStore.setProcessedDataExtremes(extremes);
				mapDataStore.setIsProcessingEuropeNutsData(false);
			} catch (error) {
				console.error("Failed to load/process Europe-only NUTS data:", error);
				if (
					error instanceof Error &&
					(error.message === "NO_DATA" || error.message.includes("API_ERROR:"))
				) {
					setUserRequestedYear(userStore.currentYear);
					setUserRequestedMonth(userStore.currentMonth);
					setDataFetchErrorMessage(
						error.message === "NO_DATA"
							? "No data found for this request."
							: error.message.replace("API_ERROR: ", ""),
					);
					setNoDataModalVisible(true);
					setDataProcessingError(false);
					setGeneralError(null);
				} else {
					setDataProcessingError(true);
					setGeneralError("Failed to process Europe-only NUTS data");
				}
				mapDataStore.setIsProcessingEuropeNutsData(false);
				mapDataStore.setIsLoadingRawData(false);
			} finally {
				isProcessing = false;
			}
		};

		processEuropeData();
	}, [
		userStore.mapMode,
		userStore.currentYear,
		userStore.currentMonth,
		userStore.selectedModel,
		dataProcessingError,
		models,
		userStore,
		userStore.setCurrentVariableType,
		setDataProcessingError,
		setGeneralError,
		setUserRequestedYear,
		setUserRequestedMonth,
		setDataFetchErrorMessage,
		setNoDataModalVisible,
	]);

	// Grid mode effect (dependent on modelOutputStore.rawModelOutputPoints)
	// biome-ignore lint/correctness/useExhaustiveDependencies: mobx store values should trigger processing.
	useEffect(() => {
		console.log("GRID-PROBLEM-DEBUG effect: processData start", {
			mapMode: userStore.mapMode,
			rawLen: rawModelOutputPointsLength,
			hasViewport: !!mapViewportBounds,
			dataResolution,
			dataProcessingError,
		});
		if (userStore.mapMode !== "grid") {
			latestGridBuildRequestRef.current += 1;
			gridProcessingStore.setGridCells([]);
			return;
		}

		// Skip processing if there's already a processing error
		if (dataProcessingError) {
			console.log("GRID-PROBLEM-DEBUG effect: early skip", {
				mapMode: userStore.mapMode,
				dataProcessingError,
			});
			console.log("Skipping lat/lon processing due to error or Europe mode");
			return;
		}

		const rawDataLength = rawModelOutputPointsLength;
		console.log("GRID-PROBLEM-DEBUG effect: rawDataLength", rawDataLength);

		const processData = async () => {
			if (rawDataLength > 0) {
				const gridBuildRequestId = ++latestGridBuildRequestRef.current;
				console.log("GRID-PROBLEM-DEBUG grid branch entry", {
					rawDataLength,
					viewport: mapViewportBounds,
					resolution: dataResolution,
				});
				console.log("Grid processing check:", userStore.mapMode, rawDataLength);
				console.log("mapDataStore.mapViewportBounds:", mapViewportBounds);
				console.log("dataResolution:", dataResolution);

				// Grid mode: set extremes from raw temperature data and generate grid cells
				const temps = rawModelOutputPoints.map((d) => d.temperature);
				const extremes = {
					min: Math.min(...temps),
					max: Math.max(...temps),
				};
				modelOutputStore.setProcessedDataExtremes(extremes);

				// Generate grid cells using MobX store
				console.log("About to call generateGridCellsFromTemperatureData");
				const viewportBounds = mapViewportBounds;
				const resolution = dataResolution;
				console.log("GRID-PROBLEM-DEBUG before gridProcessingStore.generate", {
					viewportBounds,
					resolution,
				});
				const nextGridCells =
					gridProcessingStore.generateGridCellsFromTemperatureData(
						rawModelOutputPoints,
						viewportBounds,
						resolution,
					);
				if (gridBuildRequestId !== latestGridBuildRequestRef.current) {
					return; // stale, ignore
				}
				gridProcessingStore.setGridCells(nextGridCells);
				console.log("GRID-PROBLEM-DEBUG after gridProcessingStore.generate", {
					gridCellCount: gridProcessingStore.gridCells.length,
				});
			} else {
				latestGridBuildRequestRef.current += 1;
				console.log("GRID-PROBLEM-DEBUG grid else", { rawDataLength });
				gridProcessingStore.setGridCells([]);
			}
		};

		processData();
	}, [
		userStore.mapMode,
		dataProcessingError,
		rawModelOutputPoints,
		rawModelOutputPointsLength,
		mapViewportBounds,
		dataResolution,
	]);

	// Cleanup timeouts on unmount
	useEffect(() => {
		return () => {
			if (mapHoverTimeout) {
				clearTimeout(mapHoverTimeout);
			}
		};
	}, [mapHoverTimeout]);

	const mobileLegend = modelOutputStore.processedDataExtremes ? (
		<Legend
			extremes={modelOutputStore.processedDataExtremes}
			unit={getVariableUnit(userStore.currentVariableType)}
		/>
	) : (
		<div />
	);

	const desktopLegend = modelOutputStore.processedDataExtremes ? (
		<Legend
			extremes={modelOutputStore.processedDataExtremes}
			unit={getVariableUnit(userStore.currentVariableType)}
		/>
	) : null;

	// Viewport change handler
	const handleViewportChange = useCallback(
		(newViewport: { bounds: LatLngBounds; zoom: number }) => {
			if (newViewport) {
				const bounds = newViewport.bounds;
				const currentZoom = newViewport.zoom;
				const lodZoom = Math.max(
					// Level of Detail zoom
					MIN_ZOOM,
					Math.min(MAX_ZOOM, Math.round(currentZoom)),
				);

				const newViewportBounds = {
					north: bounds.getNorth(),
					south: bounds.getSouth(),
					east: bounds.getEast(),
					west: bounds.getWest(),
					zoom: lodZoom,
				};

				console.log("🎯 Setting new viewport bounds:", newViewportBounds);
				mapDataStore.setMapViewportBounds(newViewportBounds);
				mapDataStore.setMapZoomLevel(lodZoom);

				// Align to one discrete lod to avoid mixing adjacent zoom levels.
				mapDataStore.setDataResolution(getGridResolutionForZoom(lodZoom));
			}
		},
		[],
	);

	// Control functions using MapInteractionHandlers
	const handleZoomIn = () =>
		MapInteractionHandlers.handleZoomIn(mapDataStore.leafletMapInstance);
	const handleZoomOut = () =>
		MapInteractionHandlers.handleZoomOut(mapDataStore.leafletMapInstance);
	const handleResetZoom = () =>
		MapInteractionHandlers.handleResetZoom(mapDataStore.leafletMapInstance);
	const handleLocationFind = () =>
		MapInteractionHandlers.handleLocationFind(mapDataStore.leafletMapInstance);

	const handleLoadCurrentYear = () => {
		const currentYear = new Date().getFullYear();
		userStore.setCurrentYear(currentYear);
		setNoDataModalVisible(false);
	};

	const handleModelSelect = (modelId: string) => {
		userStore.setSelectedModel(modelId);
	};

	return (
		<div>
			<div
				className={`climate-map-container ${isMobile ? "climate-map-container-mobile" : ""}`}
			>
				<MapHeader
					modelMetadataError={modelMetadataError}
					modelMetadataLoading={modelMetadataLoading}
					models={models}
				/>

				<div className="map-content-wrapper">
					<div className="map-content" style={{ position: "relative" }}>
						<MapContainer
							className="full-height-map"
							center={[45, 12]}
							zoom={5}
							minZoom={MIN_ZOOM}
							maxZoom={MAX_ZOOM}
							ref={mapDataStore.setLeafletMapInstance}
							zoomControl={false}
							worldCopyJump={false}
							style={{
								backgroundColor: "white",
								marginLeft: isMobile ? "0px" : "140px",
								width: isMobile ? "100%" : "calc(100% - 140px)",
							}}
						>
							<MapLayers
								processedEuropeNutsRegions={
									mapDataStore.processedEuropeNutsRegions
								}
								processedDataExtremes={modelOutputStore.processedDataExtremes}
							/>
							<ViewportMonitor onViewportChange={handleViewportChange} />
						</MapContainer>

						{/* Loading Skeleton Overlay */}
						<LoadingSkeleton
							isProcessing={
								mapDataStore.isProcessingEuropeNutsData ||
								mapDataStore.isLoadingRawData
							}
							message={
								mapDataStore.isProcessingEuropeNutsData
									? "Processing Europe-only data..."
									: "Loading map data..."
							}
						/>

						{/* Advanced Timeline Selector - Now supports mobile */}
						<AdvancedTimelineSelector
							year={userStore.currentYear}
							month={userStore.currentMonth}
							onYearChange={userStore.setCurrentYear}
							onMonthChange={userStore.setCurrentMonth}
							onZoomIn={handleZoomIn}
							onZoomOut={handleZoomOut}
							onResetZoom={handleResetZoom}
							onLocationFind={handleLocationFind}
							onScreenshot={handleScreenshot}
							colorScheme="purple"
							screenshoter={mapScreenshoter}
							models={models}
							selectedModelId={userStore.selectedModel}
							onModelSelect={handleModelSelect}
							legend={mobileLegend}
						/>

						{/* Mobile side buttons */}
						{isMobile && (
							<MobileSideButtons
								map={mapDataStore.leafletMapInstance}
								modelMetadataLoading={modelMetadataLoading}
								models={models}
								onModelSelect={handleModelSelect}
								selectedModel={userStore.selectedModel}
							/>
						)}
					</div>
				</div>

				{/* Desktop-only legend positioned over the map */}
				{!isMobile && desktopLegend}

				<div className="map-bottom-bar">
					<div className="control-section">
						{dataProcessingError && (
							<button
								type="button"
								onClick={() => {
									setDataProcessingError(false);
									setGeneralError(null);
									console.log("Processing error reset");
								}}
								className="secondary-button"
							>
								Reset Processing Error
							</button>
						)}
					</div>

					{generalError && (
						<div className="error-message">
							<p>{generalError}</p>
							{dataProcessingError && (
								<p>
									<small>
										Processing has been stopped to prevent infinite errors. Use
										the reset button to try again.
									</small>
								</p>
							)}
						</div>
					)}
				</div>
			</div>

			<NoDataModal
				isOpen={noDataModalVisible}
				onClose={() => setNoDataModalVisible(false)}
				onLoadCurrentYear={handleLoadCurrentYear}
				requestedYear={userRequestedYear}
				requestedMonth={userRequestedMonth}
				errorMessage={dataFetchErrorMessage}
			/>

			<Footer />
		</div>
	);
});

export default ClimateMap;
