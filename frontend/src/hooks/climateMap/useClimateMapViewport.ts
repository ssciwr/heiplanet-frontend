import type { LatLngBounds } from "leaflet";
import { useCallback } from "react";
import {
	MAX_ZOOM,
	MIN_ZOOM,
} from "../../component/Mapper/utilities/mapDataUtils";
import { mapViewportInputsStore } from "../../stores/MapViewportInputsStore";

const GRID_RESOLUTION_BY_ZOOM = [5.0, 3.0, 2.5, 2.0, 1.5, 1.0, 0.5, 0.2, 0.1];

const getGridResolutionForZoom = (zoom: number) => {
	const clampedIndex = Math.max(
		0,
		Math.min(GRID_RESOLUTION_BY_ZOOM.length - 1, Math.round(zoom)),
	);
	return GRID_RESOLUTION_BY_ZOOM[clampedIndex];
};

//This hook is mostly for managing input in for the viewport;
/*
Changes here trigger requesting of Grid data.
 */
export const useClimateMapViewport = () =>
	useCallback((newViewport: { bounds: LatLngBounds; zoom: number }) => {
		const bounds = newViewport.bounds;
		const lodZoom = Math.max(
			MIN_ZOOM,
			Math.min(MAX_ZOOM, Math.round(newViewport.zoom)),
		);
		const nextViewportBounds = {
			north: bounds.getNorth(),
			south: bounds.getSouth(),
			east: bounds.getEast(),
			west: bounds.getWest(),
			zoom: lodZoom,
		};
		const currentViewportBounds = mapViewportInputsStore.mapViewportBounds;
		const nextDataResolution = getGridResolutionForZoom(lodZoom);

		if (
			!currentViewportBounds ||
			currentViewportBounds.north !== nextViewportBounds.north ||
			currentViewportBounds.south !== nextViewportBounds.south ||
			currentViewportBounds.east !== nextViewportBounds.east ||
			currentViewportBounds.west !== nextViewportBounds.west ||
			currentViewportBounds.zoom !== nextViewportBounds.zoom
		) {
			mapViewportInputsStore.setMapViewportBounds(nextViewportBounds);
		}
		if (mapViewportInputsStore.mapZoomLevel !== lodZoom) {
			mapViewportInputsStore.setMapZoomLevel(lodZoom);
		}
		if (mapViewportInputsStore.dataResolution !== nextDataResolution) {
			mapViewportInputsStore.setDataResolution(nextDataResolution);
		}
	}, []);
