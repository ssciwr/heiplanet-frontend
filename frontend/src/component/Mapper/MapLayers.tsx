import { observer } from "mobx-react-lite";
import type React from "react";
import { useCallback } from "react";
import { GeoJSON, Pane } from "react-leaflet";
import { useMapDataStore } from "../../contexts/MapDataContext";
import { useMapUIInteractionsStore } from "../../contexts/MapUIInteractionsContext";
import { useUserSelectionsStore } from "../../contexts/UserSelectionsContext";
import { mapStyleService } from "../../services/MapStyleService";
import { temperatureDataStore } from "../../stores/TemperatureDataStore";
import * as MapInteractionHandlers from "../../utils/MapInteractionHandlers";
import AdaptiveGridLayer from "./AdaptiveGridLayer";
import CitiesLayer from "./CitiesLayer";

import type { DataExtremes, NutsGeoJSON } from "./types";

interface MapLayersProps {
	processedEuropeNutsRegions?: NutsGeoJSON | null;
	processedDataExtremes?: DataExtremes | null;
}

const MapLayers: React.FC<MapLayersProps> = observer(
	({
		processedEuropeNutsRegions: propsProcessedEuropeNutsRegions,
		processedDataExtremes: propsProcessedDataExtremes,
	}) => {
		// Use stores for UI state and data
		const userStore = useUserSelectionsStore();
		const mapUIStore = useMapUIInteractionsStore();
		const mapDataStore = useMapDataStore();

		// Use processed data from props (from ClimateMap) rather than hook instances
		const processedDataExtremes = propsProcessedDataExtremes ?? null;
		const processedEuropeNutsRegions = propsProcessedEuropeNutsRegions ?? null;

		// Create interaction handlers
		const highlightFeature = MapInteractionHandlers.createHighlightFeature(
			userStore.mapMode,
			mapUIStore.borderStyle,
			processedDataExtremes,
			null,
			processedEuropeNutsRegions,
			mapDataStore.baseWorldGeoJSON,
			mapUIStore.mapHoverTimeout,
			mapUIStore.setMapHoverTimeout,
			mapUIStore.mapHoveredLayer,
			mapUIStore.setMapHoveredLayer,
		);

		const resetHighlight = MapInteractionHandlers.createResetHighlight(
			userStore.mapMode,
			mapUIStore.borderStyle,
			processedDataExtremes,
			null,
			processedEuropeNutsRegions,
			mapDataStore.baseWorldGeoJSON,
			mapUIStore.mapHoverTimeout,
			mapUIStore.setMapHoverTimeout,
			mapUIStore.mapHoveredLayer,
			mapUIStore.setMapHoveredLayer,
		);

		const onEachEuropeOnlyFeature =
			MapInteractionHandlers.createOnEachEuropeOnlyFeature(
				userStore.currentOutputVariable,
				highlightFeature,
				resetHighlight,
			);

		// Memoize style functions to prevent recreation on every render
		const nutsStyleFunction = useCallback(
			(f?: GeoJSON.Feature) =>
				f ? mapStyleService.getNutsStyle(f, processedDataExtremes) : {},
			[processedDataExtremes],
		);

		return (
			<>
				{/* Cities Layer - always rendered, but filtered by data regions, and only over the rendered regions */}
				<CitiesLayer
					zoom={mapDataStore.mapZoomLevel}
					dataRegions={
						userStore.mapMode === "europe-only"
							? processedEuropeNutsRegions
							: null
					}
				/>

				{/* Europe-only Mode Layer */}
				{userStore.mapMode === "europe-only" && (
					<Pane name="europeOnlyPane" style={{ zIndex: 30, opacity: 0.9 }}>
						{!mapDataStore.isProcessingEuropeNutsData &&
							processedEuropeNutsRegions?.features &&
							processedEuropeNutsRegions.features.length > 0 && (
								<GeoJSON
									key={`europe-nuts-${processedEuropeNutsRegions.features.length}`}
									data={processedEuropeNutsRegions}
									style={nutsStyleFunction}
									onEachFeature={onEachEuropeOnlyFeature}
								/>
							)}
					</Pane>
				)}

				{/* Grid Mode Layer */}
				{userStore.mapMode === "grid" && (
					<Pane name="gridPane" style={{ zIndex: 340, opacity: 1.0 }}>
						<AdaptiveGridLayer />
						{temperatureDataStore.worldwideRegionBoundaries?.features && (
							<GeoJSON
								data={temperatureDataStore.worldwideRegionBoundaries}
								style={() => ({
									color: "#111111",
									weight: 1,
									fillOpacity: 0,
									opacity: 0.8,
									interactive: false,
								})}
								interactive={false}
							/>
						)}
					</Pane>
				)}
			</>
		);
	},
);

MapLayers.displayName = "MapLayers";

export default MapLayers;
