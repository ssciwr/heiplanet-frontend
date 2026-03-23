import { makeAutoObservable } from "mobx";
import type {
	ModelOutputDataPoint,
	WorldwideGeoJSON,
} from "../component/Mapper/types";

const NATURAL_EARTH_URL = "/downsampled_initial.geojson";

export class ModelOutputStore {
	rawModelOutputDataPoints: ModelOutputDataPoint[] = [];
	countryBoundaryOverlay: WorldwideGeoJSON | null = null;

	constructor() {
		makeAutoObservable(this);
	}

	setRawModelOutputDataPoints = (data: ModelOutputDataPoint[]) => {
		this.rawModelOutputDataPoints = data;
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
