import { makeAutoObservable } from "mobx";
import type {
	DataExtremes,
	ModelOutputDataPoint,
	WorldwideGeoJSON,
} from "../component/Mapper/types";

const NATURAL_EARTH_URL = "/downsampled_initial.geojson";

export class ModelOutputStore {
	rawModelOutputDataPoints: ModelOutputDataPoint[] = [];
	processedDataExtremes: DataExtremes | null = null;
	countryBoundaryOverlay: WorldwideGeoJSON | null = null;

	constructor() {
		makeAutoObservable(this);
	}

	setRawModelOutputDataPoints = (data: ModelOutputDataPoint[]) => {
		this.rawModelOutputDataPoints = data;
	};

	setProcessedDataExtremes = (extremes: DataExtremes | null) => {
		this.processedDataExtremes = extremes;
	};

	setCountryBoundaryOverlay = (data: WorldwideGeoJSON | null) => {
		this.countryBoundaryOverlay = data;
	};

	loadCountryBoundaryOverlay = async () => {
		try {
			const response = await fetch(NATURAL_EARTH_URL);
			const data = await response.json();

			const allFeatures = data.features.filter((feature: GeoJSON.Feature) => {
				return (
					feature.geometry?.type === "Polygon" ||
					feature.geometry?.type === "MultiPolygon"
				);
			});

			this.setCountryBoundaryOverlay({
				type: "FeatureCollection" as const,
				features: allFeatures,
			});
		} catch (error) {
			console.error("Failed to load boundary overlay:", error);
		}
	};
}

export const modelOutputStore = new ModelOutputStore();
