import type { PathOptions } from "leaflet";
import type { DataExtremes } from "../component/Mapper/types";
import { getColorFromGradient } from "../component/Mapper/utilities/gradientUtilities";

export class MapStyleService {
	// Style for NUTS regions (Europe-only)
	public getNutsStyle(
		feature: GeoJSON.Feature | null,
		dataExtremes: DataExtremes | null,
	): PathOptions {
		if (!feature || !feature.properties) return {};

		const properties = feature.properties as {
			intensity?: number;
			NUTS_ID?: string;
		};

		if (
			!dataExtremes ||
			typeof properties.intensity !== "number" ||
			!Number.isFinite(properties.intensity)
		) {
			return {
				fillColor: "#cccccc",
				weight: 1,
				opacity: 0.8,
				color: "#666666",
				fillOpacity: 0.3,
			};
		}

		const fillColor = getColorFromGradient(properties.intensity, dataExtremes);

		return {
			fillColor,
			weight: 0,
			opacity: 0,
			color: "transparent",
			dashArray: "",
			fillOpacity: 0.9,
		};
	}
}

// Export a singleton instance
export const mapStyleService = new MapStyleService();
