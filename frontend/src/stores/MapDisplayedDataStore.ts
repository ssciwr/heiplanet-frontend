import type L from "leaflet";
import { makeAutoObservable } from "mobx";
import type {
	GridCell,
	NutsGeoJSON,
	WorldwideGeoJSON,
} from "../component/Mapper/types";

const NATURAL_EARTH_URL = "/downsampled_initial.geojson";

/*
This store groups renderable map outputs together with the
single shared Leaflet map instance and loading flags used by the displayed map.
*/
export class MapDisplayedDataStore {
	countryBoundaryOverlay: WorldwideGeoJSON | null = null; // Grid overlay output
	leafletMapInstance: L.Map | null = null; // shared map instance
	isLoadingRawData = false; // Grid + NUTS raw fetch phase
	// Mode specific variables below
	isProcessingEuropeNutsData = false; // NUTS merge/build phase
	processedEuropeNutsRegions: NutsGeoJSON | null = null; // NUTS layer output
	gridCells: GridCell[] = []; // Grid layer output

	constructor() {
		makeAutoObservable(this);
	}

	// Common to both modes:
	setCountryBoundaryOverlay = (data: WorldwideGeoJSON | null) => {
		this.countryBoundaryOverlay = data;
	};

	setLeafletMapInstance = (map: L.Map | null) => {
		this.leafletMapInstance = map;
	};

	/*
		Grid uses this while raw cartesian/grid values are being fetched.
		NUTS uses it while raw region values are being fetched before they are
		merged into the displayed Europe NUTS GeoJSON layer.
	*/
	setIsLoadingRawData = (loading: boolean) => {
		this.isLoadingRawData = loading;
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

	// Mode-specific
	setProcessedEuropeNutsRegions = (data: NutsGeoJSON | null) => {
		this.processedEuropeNutsRegions = data;
	};

	setIsProcessingEuropeNutsData = (processing: boolean) => {
		this.isProcessingEuropeNutsData = processing;
	};

	setGridCells = (cells: GridCell[]) => {
		if (this.gridCells === cells) {
			return;
		}
		if (this.gridCells.length === 0 && cells.length === 0) {
			return;
		}
		this.gridCells = cells;
	};
	// End mode-specific
}

export const mapDisplayedDataStore = new MapDisplayedDataStore();
