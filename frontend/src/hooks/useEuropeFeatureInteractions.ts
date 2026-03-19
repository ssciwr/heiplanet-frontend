import L from "leaflet";
import { useCallback } from "react";
import type { DataExtremes } from "../component/Mapper/types";
import {
	getFormattedVariableValue,
	getVariableDisplayName,
} from "../component/Mapper/utilities/monthUtils";
import { mapStyleService } from "../services/MapStyleService";

type UseEuropeFeatureInteractionsArgs = {
	currentVariableType: string;
	dataExtremes: DataExtremes | null;
	mapHoverTimeout: ReturnType<typeof setTimeout> | null;
	setMapHoverTimeout: (timeout: ReturnType<typeof setTimeout> | null) => void;
	mapHoveredLayer: L.Layer | null;
	setMapHoveredLayer: (layer: L.Layer | null) => void;
};

export const useEuropeFeatureInteractions = ({
	currentVariableType,
	dataExtremes,
	mapHoverTimeout,
	setMapHoverTimeout,
	mapHoveredLayer,
	setMapHoveredLayer,
}: UseEuropeFeatureInteractionsArgs) => {
	const highlightFeature = useCallback(
		(e: L.LeafletMouseEvent) => {
			const layer = e.target as L.Path;

			if (mapHoverTimeout) {
				clearTimeout(mapHoverTimeout);
			}

			if (mapHoveredLayer === layer) {
				return;
			}

			if (mapHoveredLayer) {
				const prevLayer = mapHoveredLayer as L.Path & {
					feature: GeoJSON.Feature;
				};
				prevLayer.setStyle(
					mapStyleService.getNutsStyle(prevLayer.feature, dataExtremes),
				);
				(prevLayer as L.Layer & { closePopup: () => void }).closePopup();
			}

			layer.setStyle({
				weight: 3,
				color: "#666",
				dashArray: "",
				fillOpacity: 0.9,
			});

			if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
				layer.bringToFront();
			}

			setMapHoveredLayer(layer);

			const timeout = setTimeout(() => {
				if (mapHoveredLayer === layer) {
					(layer as L.Layer & { openPopup: () => void }).openPopup();
				}
			}, 100);
			setMapHoverTimeout(timeout);
		},
		[
			dataExtremes,
			mapHoverTimeout,
			mapHoveredLayer,
			setMapHoverTimeout,
			setMapHoveredLayer,
		],
	);

	const resetHighlight = useCallback(
		(e: L.LeafletMouseEvent) => {
			const geoJSONLayer = e.target as L.Path & { feature: GeoJSON.Feature };

			if (mapHoverTimeout) {
				clearTimeout(mapHoverTimeout);
				setMapHoverTimeout(null);
			}

			if (mapHoveredLayer === geoJSONLayer) {
				geoJSONLayer.setStyle(
					mapStyleService.getNutsStyle(geoJSONLayer.feature, dataExtremes),
				);
				(geoJSONLayer as L.Layer & { closePopup: () => void }).closePopup();
				setMapHoveredLayer(null);
			}
		},
		[
			dataExtremes,
			mapHoverTimeout,
			mapHoveredLayer,
			setMapHoverTimeout,
			setMapHoveredLayer,
		],
	);

	const onEachEuropeOnlyFeature = useCallback(
		(feature: GeoJSON.Feature, layer: L.Layer) => {
			layer.on({
				mouseover: highlightFeature,
				mouseout: resetHighlight,
			});

			if (feature.properties) {
				const properties = feature.properties as {
					NUTS_ID?: string;
					intensity?: number | null;
					countryName?: string;
				};
				const { NUTS_ID, intensity, countryName } = properties;
				const displayName = countryName || NUTS_ID || "Unknown Region";

				const popupContent = `
		<div class="europe-only-popup">
		  <h4>${displayName}</h4>
		  <p><strong>${getVariableDisplayName(currentVariableType)}:</strong> ${intensity !== null && intensity !== undefined ? getFormattedVariableValue(currentVariableType, intensity) : "N/A"}</p>
		</div>
	  `;
				(layer as L.Layer & { bindPopup: (content: string) => void }).bindPopup(
					popupContent,
				);
			}
		},
		[currentVariableType, highlightFeature, resetHighlight],
	);

	return {
		highlightFeature,
		resetHighlight,
		onEachEuropeOnlyFeature,
	};
};
