import { useEffect, useState } from "react";
import { MapContainer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import ViewportMonitor from "./ViewportMonitor.tsx";
import "./Map.css";
import { observer } from "mobx-react-lite";
import { isMobile } from "react-device-detect";
import { useUserSelectionsForClimateQueryStore } from "../../contexts/UserSelectionsForClimateQueryContext";
import { useClimateDataLoader } from "../../hooks/climateMap/useClimateDataLoader";
import { useClimateMapViewport } from "../../hooks/climateMap/useClimateMapViewport";
import { useMapControls } from "../../hooks/useMapControls";
import { useMapScreenshot } from "../../hooks/useMapScreenshot";
import { useMapUIInteractions } from "../../hooks/useMapUIInteractions";
import { useModelData } from "../../hooks/useModelData";
import Footer from "../../static/Footer.tsx";
import { mapDisplayedDataStore } from "../../stores/MapDisplayedDataStore";
import DateSelector from "./InterfaceInputs/DateSelector.tsx";
import MobileSideButtons from "./InterfaceInputs/MobileSideButtons.tsx";
import LoadingSkeleton from "./LoadingSkeleton.tsx";
import MapHeader from "./MapHeader.tsx";
import MapLayers from "./MapLayers.tsx";
import NoDataModal from "./NoDataModal.tsx";
import type { DataExtremes } from "./types";
import { Legend, MAX_ZOOM, MIN_ZOOM } from "./utilities/mapDataUtils";
import { getVariableUnit } from "./utilities/monthUtils";

console.log("GRID-PROBLEM-DEBUG ClimateMap module loaded");

type ClimateMapProps = {
	onMount?: () => boolean;
};

const ClimateMap = observer(({ onMount = () => true }: ClimateMapProps) => {
	console.log("GRID-PROBLEM-DEBUG ClimateMap render");
	const userStore = useUserSelectionsForClimateQueryStore();
	const uiStore = useMapUIInteractions();
	const {
		generalError,
		setGeneralError,
		dataProcessingError,
		setDataProcessingError,
		noDataModalVisible,
		setNoDataModalVisible,
		userRequestedYear,
		userRequestedMonth,
		dataFetchErrorMessage,
		mapScreenshoter,
		setMapScreenshoter,
	} = uiStore;

	// Use model data hook
	const { models, modelMetadataError, modelMetadataLoading } = useModelData(
		userStore.selectedModel,
		userStore.setSelectedModel,
	);

	// Use screenshot hook
	const { handleScreenshot } = useMapScreenshot({
		map: mapDisplayedDataStore.leafletMapInstance,
		screenshoter: mapScreenshoter,
		setScreenshoter: setMapScreenshoter,
		models,
		selectedModel: userStore.selectedModel,
		currentYear: userStore.currentYear,
		currentMonth: userStore.currentMonth,
		selectedOptimism: userStore.selectedOptimism,
	});
	const { handleZoomIn, handleZoomOut, handleResetZoom, handleLocationFind } =
		useMapControls(mapDisplayedDataStore.leafletMapInstance);
	const handleViewportChange = useClimateMapViewport();
	const selectedModelData = models.find(
		(model) => model.id === userStore.selectedModel,
	);
	const [processedDataExtremes, setProcessedDataExtremes] =
		useState<DataExtremes | null>(null);

	useClimateDataLoader({
		selectedModelData,
		setProcessedDataExtremes,
		uiStore,
		userStore,
	});

	useEffect(() => {
		onMount?.();
	}, [onMount]);

	const mobileLegend = processedDataExtremes ? (
		<Legend
			extremes={processedDataExtremes}
			unit={getVariableUnit(userStore.currentVariableType)}
		/>
	) : (
		<div />
	);

	const desktopLegend = processedDataExtremes ? (
		<Legend
			extremes={processedDataExtremes}
			unit={getVariableUnit(userStore.currentVariableType)}
		/>
	) : null;

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
							ref={mapDisplayedDataStore.setLeafletMapInstance}
							zoomControl={false}
							worldCopyJump={false}
							style={{
								backgroundColor: "white",
								marginLeft: isMobile ? "0px" : "140px",
								width: isMobile ? "100%" : "calc(100% - 140px)",
							}}
						>
							<MapLayers processedDataExtremes={processedDataExtremes} />
							<ViewportMonitor onViewportChange={handleViewportChange} />
						</MapContainer>

						{/* Loading Skeleton Overlay */}
						<LoadingSkeleton
							isProcessing={
								mapDisplayedDataStore.isProcessingEuropeNutsData ||
								mapDisplayedDataStore.isLoadingRawData
							}
							message={
								mapDisplayedDataStore.isProcessingEuropeNutsData
									? "Processing Europe-only data..."
									: "Loading map data..."
							}
						/>

						{/* Date Selector - supports mobile */}
						<DateSelector
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
								map={mapDisplayedDataStore.leafletMapInstance}
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
