import {
	type MapUIInteractionsStore,
	mapUIInteractionsStore,
} from "../stores/MapUIInteractionsStore";

export type MapUIInteractionsState = MapUIInteractionsStore;

export const useMapUIInteractions = (): MapUIInteractionsState =>
	mapUIInteractionsStore;
