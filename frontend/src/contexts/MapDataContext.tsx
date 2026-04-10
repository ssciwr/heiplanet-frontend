/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext } from "react";
import {
	type MapDisplayedDataStore,
	mapDisplayedDataStore,
} from "../stores/MapDisplayedDataStore";

const MapDataContext = createContext<MapDisplayedDataStore>(
	mapDisplayedDataStore,
);

export function MapDataProvider({ children }: { children: React.ReactNode }) {
	return (
		<MapDataContext.Provider value={mapDisplayedDataStore}>
			{children}
		</MapDataContext.Provider>
	);
}

export const useMapDataStore = () => {
	const context = useContext(MapDataContext);
	if (!context) {
		throw new Error("useMapDataStore must be used within a MapDataProvider");
	}
	return context;
};
