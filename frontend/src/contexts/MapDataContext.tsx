/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext } from "react";
import { type MapDataStore, mapDataStore } from "../stores/MapDataStore";

const MapDataContext = createContext<MapDataStore>(mapDataStore);

export function MapDataProvider({ children }: { children: React.ReactNode }) {
	return (
		<MapDataContext.Provider value={mapDataStore}>
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
