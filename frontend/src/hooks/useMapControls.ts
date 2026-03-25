import type L from "leaflet";
import { useCallback } from "react";
import { errorStore } from "../stores/ErrorStore";

// for actual direct inputs to map; not for model input (model type, optimism mode etc)
export const useMapControls = (map: L.Map | null) => {
	const handleZoomIn = useCallback(() => {
		map?.zoomIn();
	}, [map]);

	const handleZoomOut = useCallback(() => {
		map?.zoomOut();
	}, [map]);

	const handleResetZoom = useCallback(() => {
		map?.setView([10, 12], 3);
	}, [map]);

	const handleLocationFind = useCallback(() => {
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(
				(position) => {
					map?.setView(
						[position.coords.latitude, position.coords.longitude],
						7,
					);
				},
				(error) => {
					console.error("Error getting location:", error);
					errorStore.showError("Location Error", "Unable to get your location");
				},
			);
			return;
		}

		errorStore.showError(
			"Location Error",
			"Geolocation is not supported by this browser",
		);
	}, [map]);

	return {
		handleZoomIn,
		handleZoomOut,
		handleResetZoom,
		handleLocationFind,
	};
};
