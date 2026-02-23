/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext } from "react";
import {
	type MapUIInteractionsStore,
	mapUIInteractionsStore,
} from "../stores/MapUIInteractionsStore";

const MapUIInteractionsContext = createContext<MapUIInteractionsStore>(
	mapUIInteractionsStore,
);

export function MapUIInteractionsProvider({
	children,
}: { children: React.ReactNode }) {
	return (
		<MapUIInteractionsContext.Provider value={mapUIInteractionsStore}>
			{children}
		</MapUIInteractionsContext.Provider>
	);
}

export const useMapUIInteractionsStore = () => {
	const context = useContext(MapUIInteractionsContext);
	if (!context) {
		throw new Error(
			"useMapUIInteractionsStore must be used within a MapUIInteractionsProvider",
		);
	}
	return context;
};
