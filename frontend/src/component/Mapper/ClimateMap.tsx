import { useCallback, useEffect, useState } from "react";
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
import Header from "./Header.tsx";
import BottomBar from "./InterfaceInputs/BottomBar.tsx";
import MobileSideButtons from "./InterfaceInputs/MobileSideButtons.tsx";
import LoadingSkeleton from "./LoadingSkeleton.tsx";
import MapLayers from "./MapLayers.tsx";
import NoDataModal from "./NoDataModal.tsx";
import type { DataExtremes } from "./types";
import { Legend, MAX_ZOOM, MIN_ZOOM } from "./utilities/mapDataUtils";
import { getVariableUnit } from "./utilities/monthUtils";

type ClimateMapProps = {
	onMount?: () => boolean;
};

/*
AI-Generated
*/
const ClimateMapNoDataModal = observer(() => {
	const uiStore = useMapUIInteractions();
	const userStore = useUserSelectionsForClimateQueryStore();
	const {
		noDataModalVisible,
		userRequestedYear,
		userRequestedMonth,
		dataFetchErrorMessage,
		setNoDataModalVisible,
	} = uiStore;

	const handleClose = useCallback(() => {
		setNoDataModalVisible(false);
	}, [setNoDataModalVisible]);

	const handleLoadCurrentYear = useCallback(() => {
		userStore.setCurrentYear(new Date().getFullYear());
		setNoDataModalVisible(false);
	}, [setNoDataModalVisible, userStore]);

	return (
		<NoDataModal
			isOpen={noDataModalVisible}
			onClose={handleClose}
			onLoadCurrentYear={handleLoadCurrentYear}
			requestedYear={userRequestedYear}
			requestedMonth={userRequestedMonth}
			errorMessage={dataFetchErrorMessage}
		/>
	);
});

const ClimateMap = observer(({ onMount = () => true }: ClimateMapProps) => {
	const userStore = useUserSelectionsForClimateQueryStore();
	const uiStore = useMapUIInteractions();
	const {
		generalError,
		setGeneralError,
		dataProcessingError,
		setDataProcessingError,
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

	const handleModelSelect = (modelId: string) => {
		userStore.setSelectedModel(modelId);
	};

	return (
		<div>
			<div
				className={`climate-map-container ${isMobile ? "climate-map-container-mobile" : ""}`}
			>
				<Header
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
						<BottomBar
							year={userStore.currentYear}
							month={userStore.currentMonth}
							onYearChange={userStore.setCurrentYear}
							onMonthChange={userStore.setCurrentMonth}
							onZoomIn={handleZoomIn}
							onZoomOut={handleZoomOut}
							onResetZoom={handleResetZoom}
							onLocationFind={handleLocationFind}
							onScreenshot={handleScreenshot}
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

			<ClimateMapNoDataModal />

			<Footer />
		</div>
	);
});

export default ClimateMap;
