import type * as L from "leaflet";
import { makeAutoObservable } from "mobx";

export class MapUIInteractionsStore {
	generalError: string | null = null;
	dataProcessingError = false;
	mapHoverTimeout: ReturnType<typeof window.setTimeout> | null = null;
	mapHoveredLayer: L.Layer | null = null;
	mapScreenshoter: L.SimpleMapScreenshoter | null = null;
	noDataModalVisible = false;
	userRequestedYear = 2025;
	userRequestedMonth = 1;
	dataFetchErrorMessage = "";

	constructor() {
		makeAutoObservable(this);
	}

	setGeneralError = (error: string | null) => {
		this.generalError = error;
	};

	setDataProcessingError = (error: boolean) => {
		this.dataProcessingError = error;
	};

	setMapHoverTimeout = (
		timeout: ReturnType<typeof window.setTimeout> | null,
	) => {
		this.mapHoverTimeout = timeout;
	};

	setMapHoveredLayer = (layer: L.Layer | null) => {
		this.mapHoveredLayer = layer;
	};

	setMapScreenshoter = (screenshoter: L.SimpleMapScreenshoter | null) => {
		this.mapScreenshoter = screenshoter;
	};

	setNoDataModalVisible = (visible: boolean) => {
		this.noDataModalVisible = visible;
	};

	setUserRequestedYear = (year: number) => {
		this.userRequestedYear = year;
	};

	setUserRequestedMonth = (month: number) => {
		this.userRequestedMonth = month;
	};

	setDataFetchErrorMessage = (message: string) => {
		this.dataFetchErrorMessage = message;
	};
}

export const mapUIInteractionsStore = new MapUIInteractionsStore();
