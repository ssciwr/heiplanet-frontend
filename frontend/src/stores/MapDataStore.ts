import type L from "leaflet";
import { makeAutoObservable } from "mobx";
import type { NutsGeoJSON, ViewportBounds } from "../component/Mapper/types";

export class MapDataStore {
	processedEuropeNutsRegions: NutsGeoJSON | null = null;
	isProcessingEuropeNutsData = false;
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

	setDataResolution = (resolution: number) => {
		this.dataResolution = resolution;
	};
}

export const mapDataStore = new MapDataStore();
