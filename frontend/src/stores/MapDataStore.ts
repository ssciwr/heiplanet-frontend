import { makeAutoObservable } from "mobx";
import type { NutsGeoJSON } from "../component/Mapper/types";

export class MapDataStore {
	/*
		processedEuropeNutsRegions is the final Europe-only NUTS layer payload.
		Each feature already contains the region polygon geometry and its per-region
		intensity in feature.properties.intensity, along with NUTS_ID and related
		display metadata.
	*/
	processedEuropeNutsRegions: NutsGeoJSON | null = null; // NUTS only
	isProcessingEuropeNutsData = false; // NUTS only
	isLoadingRawData = false; // Grid + NUTS raw fetch phase

	constructor() {
		makeAutoObservable(this);
	}

	setProcessedEuropeNutsRegions = (data: NutsGeoJSON | null) => {
		this.processedEuropeNutsRegions = data;
	};

	setIsProcessingEuropeNutsData = (processing: boolean) => {
		this.isProcessingEuropeNutsData = processing;
	};

	/*
		Both Grid and NUTS use this while raw values are being fetched.
		Grid uses it for the cartesian/grid request, and NUTS uses it for the
		initial region-value request before the NUTS GeoJSON merge step runs.
	*/
	setIsLoadingRawData = (loading: boolean) => {
		this.isLoadingRawData = loading;
	};
}

export const mapDataStore = new MapDataStore();
