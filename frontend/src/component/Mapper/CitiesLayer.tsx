import type { NutsGeoJSON, WorldwideGeoJSON } from "./types";

interface CitiesLayerProps {
	zoom: number;
	dataRegions?: NutsGeoJSON | WorldwideGeoJSON | null;
}
const CitiesLayer = (props: CitiesLayerProps) => {
	void props;
	return <div />;
};

// Temporarily shim because I realised CitiesLayer was the source of lag, not either of the new APIs!
// with reference to: https://github.com/ssciwr/onehealth-map-frontend/issues/54#issuecomment-3433209012

/*
const CitiesLayer2 = ({ zoom, dataRegions }: CitiesLayerProps) => {
	const [cities, setCities] = useState<City[]>([]);

	useEffect(() => {
		const loadCities = async () => {
			try {
				// Load from CSV data source (MIT licensed)
				// This data was downloaded in early August 2025, from https://www.simplemaps.aspiringeconomist.com/resources/world-cities-data
				// - the Natural Earth Populated Places 2015 data with 7,300 cities/towns.
				// Importantly the data is from 2015.
				const response = await fetch("/data/world_cities.csv");
				if (!response.ok) {
					throw new Error(`HTTP ${response.status}: ${response.statusText}`);
				}
				const csvText = await response.text();
				const cities = parseCSVToCities(csvText);
				setCities(cities);
			} catch (error) {
				console.warn(
					"Cities layer failed to load, continuing without cities:",
					error,
				);
				setCities([]);
			}
		};

		// Use setTimeout to make cities loading non-blocking
		const timeoutId = setTimeout(loadCities, 100);

		return () => clearTimeout(timeoutId);
	}, []);

	// CSV parsing function for world_cities.csv
	const parseCSVToCities = (csvText: string): City[] => {
		const lines = csvText.split("\n");
		const headers = lines[0].split(",").map((h) => h.trim());

		return lines
			.slice(1)
			.filter((line) => line.trim())
			.map((line) => {
				const values = line.split(",").map((v) => v.trim());
				const csvCity: Partial<CityCSV> = {};

				headers.forEach((header, index) => {
					csvCity[header as keyof CityCSV] = values[index];
				});

				return {
					name: csvCity.city_ascii || csvCity.city || "",
					lat: Number.parseFloat(csvCity.lat || "0"),
					lng: Number.parseFloat(csvCity.lng || "0"),
					population: Number.parseInt(csvCity.pop || "0"),
					country: csvCity.country || "",
				} as City;
			})
			.filter(
				(city) =>
					city.name &&
					!Number.isNaN(city.lat) &&
					!Number.isNaN(city.lng) &&
					city.population > 0,
			);
	};

	const getPopulationThreshold = (zoom: number): number => {
		const zoomRange = MAX_ZOOM - MIN_ZOOM;
		const zoomProgress = (zoom - MIN_ZOOM) / zoomRange;

		// More granular population thresholds - cities appear earlier
		if (zoomProgress >= 0.85) return 0; // All cities at highest zoom
		if (zoomProgress >= 0.75) return 50000; // Small cities (50k+)
		if (zoomProgress >= 0.65) return 100000; // Medium-small cities (100k+)
		if (zoomProgress >= 0.55) return 200000; // Medium cities (200k+)
		if (zoomProgress >= 0.45) return 300000; // Larger cities (300k+)
		if (zoomProgress >= 0.35) return 500000; // Major cities (500k+) - as requested
		if (zoomProgress >= 0.25) return 1000000; // Large cities (1M+)
		if (zoomProgress >= 0.15) return 2000000; // Very large cities (2M+)
		return 5000000; // Only megacities at furthest zoom
	};

	const getMarkerSize = (population: number, zoom: number): number => {
		const baseSize = Math.min(zoom * 0.8, 8);
		const populationFactor = Math.log10(population / 100000) * 0.5;
		return Math.max(2, Math.min(12, baseSize + populationFactor));
	};

	const formatPopulation = (population: number): string => {
		if (population >= 1000000) {
			return `${(population / 1000000).toFixed(1)}M`;
		}
		if (population >= 1000) {
			return `${Math.round(population / 1000)}K`;
		}
		return population.toString();
	};

	const createCityLabelIcon = (cityName: string, zoom: number): L.DivIcon => {
		const fontSize = Math.max(11, Math.min(13, zoom * 1.1));
		const paddingVertical = Math.max(4, Math.min(6, zoom * 0.4));
		const paddingHorizontal = Math.max(8, Math.min(12, zoom * 0.8));

		// Estimate text width for proper sizing
		const estimatedWidth =
			cityName.length * fontSize * 0.6 + paddingHorizontal * 2;
		const estimatedHeight = fontSize + paddingVertical * 2 + 4;

		return L.divIcon({
			html: `
				<div style="
					background-color: rgba(255, 255, 255, 0.95);
					padding: ${paddingVertical}px ${paddingHorizontal}px;
					border: 1px solid rgb(32, 32, 32);
					border-radius: 12px;
					font-size: ${fontSize}px;
					font-weight: 600;
					color: #2c3e50;
					white-space: nowrap;
					text-align: center;
					box-shadow: 0 2px 8px rgba(0,0,0,0.15);
					font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
					letter-spacing: 0.025em;
					line-height: 1.2;
					backdrop-filter: blur(4px);
					-webkit-backdrop-filter: blur(4px);
					display: inline-block;
					min-width: fit-content;
				">
					${cityName}
				</div>
			`,
			className: "city-label",
			iconSize: [estimatedWidth, estimatedHeight],
			iconAnchor: [estimatedWidth / 2, estimatedHeight + 8],
			popupAnchor: [0, 0],
		});
	};

	// Filter cities that fall within data regions
	const filterCitiesByDataRegions = (cities: City[]): City[] => {
		// If no data regions provided, show all cities (fallback)
		if (
			!dataRegions ||
			!dataRegions.features ||
			dataRegions.features.length === 0
		) {
			return cities;
		}

		return cities.filter((city) => {
			const cityPoint = turf.point([city.lng, city.lat]);

			for (const feature of dataRegions.features) {
				// these are all the geoJSON regions (e.g. NUT3/World subregions)
				try {
					if (
						turf.booleanPointInPolygon(
							cityPoint,
							feature.geometry as Polygon | MultiPolygon,
						)
					) {
						return true;
					}
				} catch (error) {
					// ignore weird geoJSON situations (like impropoer enclaves)
				}
			}
			return false;
		});
	};

	console.log("Current zoom for cities layer is: ", zoom);
	const threshold = getPopulationThreshold(zoom);
	const citiesInDataRegions = filterCitiesByDataRegions(cities);
	const visibleCities = citiesInDataRegions.filter(
		(city) => city.population >= threshold,
	);

	return (
		<>
			<Pane name="cityMarkersPane" style={{ zIndex: 100 }}>
				{visibleCities.map((city) => (
					<CircleMarker
						key={`marker-${city.name}-${city.country}`}
						center={[city.lat, city.lng]}
						radius={getMarkerSize(city.population, zoom)}
						fillColor="#ffffff"
						fillOpacity={0.9}
						color="#333333"
						weight={1}
						opacity={0.8}
					>
						<div style={{ zIndex: 390 }}>
							<Popup>
								<div style={{ fontSize: "14px", lineHeight: "1.4" }}>
									<strong>{city.name}</strong>
									<br />
									<span style={{ color: "#666" }}>{city.country}</span>
									<br />
									<span style={{ fontSize: "12px" }}>
										Population: {formatPopulation(city.population)}
									</span>
								</div>
							</Popup>
						</div>
					</CircleMarker>
				))}
			</Pane>

			<Pane name="cityLabelsPane" style={{ zIndex: 110 }}>
				{visibleCities.map((city) => (
					<Marker
						key={`label-${city.name}-${city.country}`}
						position={[city.lat, city.lng]}
						icon={createCityLabelIcon(city.name, zoom)}
					/>
				))}
			</Pane>
		</>
	);
};
*/

export default CitiesLayer;
