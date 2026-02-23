import type { PathOptions } from "leaflet";
import type { DataExtremes } from "../component/Mapper/types";
import { getColorFromGradient } from "../component/Mapper/utilities/gradientUtilities";

export type BorderStyle =
	| "white"
	| "light-gray"
	| "black"
	| "half-opacity"
	| "black-80";

export class MapStyleService {
	// Style for worldwide regions
	public getWorldwideStyle(
		feature: GeoJSON.Feature | null,
		borderStyle: BorderStyle,
		dataExtremes: DataExtremes | null,
	): PathOptions {
		if (!feature || !feature.properties) return {};

		const properties = feature.properties as {
			intensity?: number;
		};

		// Since this dataset only contains administrative subdivisions (states/provinces),
		// we'll style them all consistently with the selected border style
		let borderColor: string;
		let borderOpacity: number;

		switch (borderStyle) {
			case "white":
				borderColor = "white";
				borderOpacity = 1;
				break;
			case "light-gray":
				borderColor = "#999999";
				borderOpacity = 1;
				break;
			case "black":
				borderColor = "#000000";
				borderOpacity = 1;
				break;
			case "half-opacity":
				borderColor = "white";
				borderOpacity = 0.5;
				break;
			case "black-80":
				borderColor = "#000000";
				borderOpacity = 0.8;
				break;
			default:
				borderColor = "white";
				borderOpacity = 1;
		}

		return {
			fillColor: dataExtremes
				? getColorFromGradient(properties.intensity || 0, dataExtremes)
				: "#cccccc",
			weight: 1.5, // Consistent border weight for all sub-regions
			opacity: borderOpacity,
			color: borderColor,
			dashArray: "",
			fillOpacity: 0.8,
		};
	}

	// Style for world background
	public getWorldStyle(): PathOptions {
		return {
			fillColor: "#374151",
			weight: 0.5,
			opacity: 0.8,
			color: "#6b7280",
			fillOpacity: 1,
		};
	}

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

	// Get style function for a specific map mode
	public getStyleFunction(
		mapMode: "worldwide" | "europe-only",
		borderStyle: BorderStyle,
		dataExtremes: DataExtremes | null,
	) {
		switch (mapMode) {
			case "worldwide":
				return (feature: GeoJSON.Feature | null) =>
					this.getWorldwideStyle(feature, borderStyle, dataExtremes);
			case "europe-only":
				return (feature: GeoJSON.Feature | null) =>
					this.getNutsStyle(feature, dataExtremes);
			default:
				return () => this.getWorldStyle();
		}
	}
}

// Export a singleton instance
export const mapStyleService = new MapStyleService();
