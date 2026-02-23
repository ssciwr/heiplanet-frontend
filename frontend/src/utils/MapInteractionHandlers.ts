import L from "leaflet";
import type {
	DataExtremes,
	NutsGeoJSON,
	ViewportBounds,
	WorldwideGeoJSON,
} from "../component/Mapper/types";
import {
	getFormattedVariableValue,
	getVariableDisplayName,
} from "../component/Mapper/utilities/monthUtils";
import { type BorderStyle, mapStyleService } from "../services/MapStyleService";
import { errorStore } from "../stores/ErrorStore";

export interface ViewportChangeData {
	bounds: L.LatLngBounds;
	zoom: number;
}

// Map control functions
export const handleZoomIn = (map: L.Map | null): void => {
	if (map) {
		map.zoomIn();
	}
};

export const handleZoomOut = (map: L.Map | null): void => {
	if (map) {
		map.zoomOut();
	}
};

export const handleResetZoom = (map: L.Map | null): void => {
	if (map) {
		map.setView([10, 12], 3);
	}
};

export const handleLocationFind = (map: L.Map | null): void => {
	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(
			(position) => {
				if (map) {
					map.setView([position.coords.latitude, position.coords.longitude], 6);
				}
			},
			(error) => {
				console.error("Error getting location:", error);
				errorStore.showError("Location Error", "Unable to get your location");
			},
		);
	} else {
		errorStore.showError(
			"Location Error",
			"Geolocation is not supported by this browser",
		);
	}
};

// Viewport change handler
export const handleViewportChange = (
	newViewport: ViewportChangeData,
	setViewport: React.Dispatch<React.SetStateAction<ViewportBounds | null>>,
	setResolutionLevel: React.Dispatch<React.SetStateAction<number>>,
	setCurrentZoom: (zoom: number) => void,
): void => {
	if (newViewport) {
		const bounds = newViewport.bounds;
		const zoom = newViewport.zoom;

		setViewport((prevViewport) => {
			if (
				!prevViewport ||
				Math.abs(bounds.getNorth() - prevViewport.north) > 0.1 ||
				Math.abs(bounds.getSouth() - prevViewport.south) > 0.1 ||
				Math.abs(bounds.getEast() - prevViewport.east) > 0.1 ||
				Math.abs(bounds.getWest() - prevViewport.west) > 0.1 ||
				Math.abs(zoom - prevViewport.zoom) > 0.1
			) {
				return {
					north: bounds.getNorth(),
					south: bounds.getSouth(),
					east: bounds.getEast(),
					west: bounds.getWest(),
					zoom: zoom,
				};
			}
			return prevViewport;
		});

		let newResolution = 1;
		if (zoom < 2.5) newResolution = 4.5;
		else if (zoom < 4.5) newResolution = 3.5;
		else if (zoom < 6) newResolution = 2.5;
		else if (zoom < 8) newResolution = 1.5;
		else newResolution = 1;

		setResolutionLevel((prevResolution) => {
			if (prevResolution !== newResolution) {
				return newResolution;
			}
			return prevResolution;
		});

		setCurrentZoom(zoom);
	}
};

// Feature highlighting for interactive layers
export const createHighlightFeature = (
	mapMode: "worldwide" | "europe-only" | "grid",
	borderStyle: BorderStyle,
	dataExtremes: DataExtremes | null,
	convertedWorldwideGeoJSON: WorldwideGeoJSON | null,
	convertedEuropeOnlyGeoJSON: NutsGeoJSON | null,
	worldGeoJSON: GeoJSON.FeatureCollection | null,
	hoverTimeout: NodeJS.Timeout | null,
	setHoverTimeout: (timeout: NodeJS.Timeout | null) => void,
	currentHoveredLayer: L.Layer | null,
	setCurrentHoveredLayer: (layer: L.Layer | null) => void,
) => {
	return (e: L.LeafletMouseEvent) => {
		const layer = e.target as L.Path;

		// Clear any existing timeout
		if (hoverTimeout) {
			clearTimeout(hoverTimeout);
		}

		// If this is the same layer, don't do anything
		if (currentHoveredLayer === layer) {
			return;
		}

		// Reset previous layer if exists
		if (currentHoveredLayer) {
			const prevLayer = currentHoveredLayer as L.Path & {
				feature: GeoJSON.Feature;
			};
			if (mapMode === "worldwide" && convertedWorldwideGeoJSON) {
				prevLayer.setStyle(
					mapStyleService.getWorldwideStyle(
						prevLayer.feature,
						borderStyle,
						dataExtremes,
					),
				);
			} else if (mapMode === "europe-only" && convertedEuropeOnlyGeoJSON) {
				prevLayer.setStyle(
					mapStyleService.getNutsStyle(prevLayer.feature, dataExtremes),
				);
			} else if (worldGeoJSON) {
				prevLayer.setStyle(mapStyleService.getWorldStyle());
			}
			(prevLayer as L.Layer & { closePopup: () => void }).closePopup();
		}

		// Set new layer styling
		layer.setStyle({
			weight: 3,
			color: "#666",
			dashArray: "",
			fillOpacity: 0.9,
		});

		if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
			layer.bringToFront();
		}

		setCurrentHoveredLayer(layer);

		// Show popup on hover for worldwide and europe-only modes with slight delay
		if (mapMode === "worldwide" || mapMode === "europe-only") {
			const timeout = setTimeout(() => {
				if (currentHoveredLayer === layer) {
					(layer as L.Layer & { openPopup: () => void }).openPopup();
				}
			}, 100);
			setHoverTimeout(timeout);
		}
	};
};

// Reset feature highlighting
export const createResetHighlight = (
	mapMode: "worldwide" | "europe-only" | "grid",
	borderStyle: BorderStyle,
	dataExtremes: DataExtremes | null,
	convertedWorldwideGeoJSON: WorldwideGeoJSON | null,
	convertedEuropeOnlyGeoJSON: NutsGeoJSON | null,
	worldGeoJSON: GeoJSON.FeatureCollection | null,
	hoverTimeout: NodeJS.Timeout | null,
	setHoverTimeout: (timeout: NodeJS.Timeout | null) => void,
	currentHoveredLayer: L.Layer | null,
	setCurrentHoveredLayer: (layer: L.Layer | null) => void,
) => {
	return (e: L.LeafletMouseEvent) => {
		const geoJSONLayer = e.target as L.Path & { feature: GeoJSON.Feature };

		// Clear any existing timeout
		if (hoverTimeout) {
			clearTimeout(hoverTimeout);
			setHoverTimeout(null);
		}

		// Only reset if this is the currently hovered layer
		if (currentHoveredLayer === geoJSONLayer) {
			if (mapMode === "worldwide" && convertedWorldwideGeoJSON) {
				geoJSONLayer.setStyle(
					mapStyleService.getWorldwideStyle(
						geoJSONLayer.feature,
						borderStyle,
						dataExtremes,
					),
				);
			} else if (mapMode === "europe-only" && convertedEuropeOnlyGeoJSON) {
				geoJSONLayer.setStyle(
					mapStyleService.getNutsStyle(geoJSONLayer.feature, dataExtremes),
				);
			} else if (worldGeoJSON) {
				geoJSONLayer.setStyle(mapStyleService.getWorldStyle());
			}

			// Close popup on mouseout for worldwide and europe-only modes
			if (mapMode === "worldwide" || mapMode === "europe-only") {
				(geoJSONLayer as L.Layer & { closePopup: () => void }).closePopup();
			}

			setCurrentHoveredLayer(null);
		}
	};
};

// Feature event handler for worldwide features
export const createOnEachWorldwideFeature = (
	currentVariableType: string,
	highlightFeature: (e: L.LeafletMouseEvent) => void,
	resetHighlight: (e: L.LeafletMouseEvent) => void,
) => {
	return (feature: GeoJSON.Feature, layer: L.Layer) => {
		layer.on({
			mouseover: highlightFeature,
			mouseout: resetHighlight,
		});

		if (feature.properties) {
			const properties = feature.properties as {
				WORLDWIDE_ID?: string;
				intensity?: number;
				countryName?: string;
				pointCount?: number;
				isFallback?: boolean;
				currentPosition?: { lat: number; lng: number };
				nearestDataPoint?: { lat: number; lng: number };
				dataPoints?: Array<{ lat: number; lng: number; temperature: number }>;
			};
			const { WORLDWIDE_ID, intensity, countryName } = properties;
			const displayName = countryName || WORLDWIDE_ID || "Unknown Country";

			const popupContent = `
		<div class="worldwide-popup">
		  <button class="popup-close-btn" aria-label="Close popup">×</button>
		  <h4>${displayName}</h4>
		  <p><strong>${getVariableDisplayName(currentVariableType)}:</strong> ${intensity !== null && intensity !== undefined ? getFormattedVariableValue(currentVariableType, intensity) : "N/A"}</p>
		</div>
	  `;
			(layer as L.Layer & { bindPopup: (content: string) => void }).bindPopup(
				popupContent,
			);
		}
	};
};

// Feature event handler for Europe-only features
export const createOnEachEuropeOnlyFeature = (
	currentVariableType: string,
	highlightFeature: (e: L.LeafletMouseEvent) => void,
	resetHighlight: (e: L.LeafletMouseEvent) => void,
) => {
	return (feature: GeoJSON.Feature, layer: L.Layer) => {
		layer.on({
			mouseover: highlightFeature,
			mouseout: resetHighlight,
		});

		if (feature.properties) {
			const properties = feature.properties as {
				NUTS_ID?: string;
				intensity?: number | null;
				countryName?: string;
				pointCount?: number;
				nutsLevel?: number;
				isFallback?: boolean;
				isModelData?: boolean;
				currentPosition?: { lat: number; lng: number };
				nearestDataPoint?: { lat: number; lng: number };
				dataPoints?: Array<{ lat: number; lng: number; temperature: number }>;
			};
			const { NUTS_ID, intensity, countryName } = properties;
			const displayName = countryName || NUTS_ID || "Unknown Region";

			const popupContent = `
		<div class="europe-only-popup">
		  <button class="popup-close-btn" aria-label="Close popup">×</button>
		  <h4>${displayName}</h4>
		  <p><strong>${getVariableDisplayName(currentVariableType)}:</strong> ${intensity !== null && intensity !== undefined ? getFormattedVariableValue(currentVariableType, intensity) : "N/A"}</p>
		</div>
	  `;
			(layer as L.Layer & { bindPopup: (content: string) => void }).bindPopup(
				popupContent,
			);
		}
	};
};
