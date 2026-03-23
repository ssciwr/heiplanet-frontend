import type L from "leaflet";
import { makeAutoObservable } from "mobx";
import type { NutsGeoJSON, ViewportBounds } from "../component/Mapper/types";

export class MapDataStore {
	/*
	Common between both Grid and NUTS mode.

		processedEuropeNutsRegions is the final Europe-only NUTS layer payload.
		Each feature already contains the region polygon geometry and its per-region
		intensity in feature.properties.intensity, along with NUTS_ID and related
		display metadata. ModelOutputStore does not hold those NUTS region values;

		The information shared across both NUTS and Grid mode is the legend extremes values.

		The Grid mode stores it's raw data (which gets directly rendered without processing) in GridProcessingStore
	*/
	processedEuropeNutsRegions: NutsGeoJSON | null = null; // NUTS only
	isProcessingEuropeNutsData = false; // NUTS only
	isLoadingRawData = false;
	leafletMapInstance: L.Map | null = null;
	mapViewportBounds: ViewportBounds | null = null;
	mapZoomLevel = 0;
	dataResolution = 5.0;

	constructor() {
		makeAutoObservable(this);
	}

	setProcessedEuropeNutsRegions = (data: NutsGeoJSON | null) => {
		this.processedEuropeNutsRegions = data;
	};

	setIsProcessingEuropeNutsData = (processing: boolean) => {
		this.isProcessingEuropeNutsData = processing;
	};

	setIsLoadingRawData = (loading: boolean) => {
		this.isLoadingRawData = loading;
	};

	setLeafletMapInstance = (map: L.Map | null) => {
		this.leafletMapInstance = map;
	};

	setMapViewportBounds = (bounds: ViewportBounds | null) => {
		this.mapViewportBounds = bounds;
	};

	setMapZoomLevel = (zoom: number) => {
		this.mapZoomLevel = zoom;
	};

	// Grid only
	setDataResolution = (resolution: number) => {
		this.dataResolution = resolution;
	};
}

export const mapDataStore = new MapDataStore();
