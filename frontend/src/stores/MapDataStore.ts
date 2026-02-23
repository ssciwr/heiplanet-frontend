import type { FeatureCollection, GeoJsonProperties, Geometry } from "geojson";
import type L from "leaflet";
import { makeAutoObservable } from "mobx";
import type {
	DataExtremes,
	NutsGeoJSON,
	TemperatureDataPoint,
	ViewportBounds,
	WorldwideGeoJSON,
} from "../component/Mapper/types";

export class MapDataStore {
	rawRegionTemperatureData: TemperatureDataPoint[] = [];
	processedDataExtremes: DataExtremes | null = null;
	mapDataBounds: ViewportBounds | null = null;
	baseWorldGeoJSON: FeatureCollection<Geometry, GeoJsonProperties> | null =
		null;
	processedWorldwideRegions: WorldwideGeoJSON | null = null;
	worldwideRegionBoundaries: WorldwideGeoJSON | null = null;
	processedEuropeNutsRegions: NutsGeoJSON | null = null;
	isProcessingEuropeNutsData = false;
	isProcessingWorldwideRegionData = false;
	isLoadingRawData = false;
	leafletMapInstance: L.Map | null = null;
	mapViewportBounds: ViewportBounds | null = null;
	mapZoomLevel = 0;
	dataResolution = 5.0;

	constructor() {
		makeAutoObservable(this);
	}
	// tidyup: remove
	setRawRegionTemperatureData = (data: TemperatureDataPoint[]) => {
		this.rawRegionTemperatureData = data;
	};

	setProcessedDataExtremes = (extremes: DataExtremes | null) => {
		this.processedDataExtremes = extremes;
	};

	setMapDataBounds = (bounds: ViewportBounds | null) => {
		this.mapDataBounds = bounds;
	};

	setBaseWorldGeoJSON = (
		data: FeatureCollection<Geometry, GeoJsonProperties> | null,
	) => {
		this.baseWorldGeoJSON = data;
	};

	setWorldwideRegionBoundaries = (data: WorldwideGeoJSON | null) => {
		this.worldwideRegionBoundaries = data;
	};

	setProcessedWorldwideRegions = (data: WorldwideGeoJSON | null) => {
		this.processedWorldwideRegions = data;
	};

	setProcessedEuropeNutsRegions = (data: NutsGeoJSON | null) => {
		this.processedEuropeNutsRegions = data;
	};

	setIsProcessingEuropeNutsData = (processing: boolean) => {
		this.isProcessingEuropeNutsData = processing;
	};

	setIsProcessingWorldwideRegionData = (processing: boolean) => {
		this.isProcessingWorldwideRegionData = processing;
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
