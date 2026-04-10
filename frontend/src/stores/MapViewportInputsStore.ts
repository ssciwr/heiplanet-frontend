import { makeAutoObservable } from "mobx";
import type { ViewportBounds } from "../component/Mapper/types";

/*
This store keeps only live viewport-derived inputs that affect
Grid requests and map-level zoom-dependent rendering. In NUTS mode it is not used.
*/
export class MapViewportInputsStore {
	mapViewportBounds: ViewportBounds | null = null;
	mapZoomLevel = 0;
	dataResolution = 5.0;

	constructor() {
		makeAutoObservable(this);
	}

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

export const mapViewportInputsStore = new MapViewportInputsStore();
