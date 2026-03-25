import type { FeatureCollection, GeoJsonProperties, Geometry } from "geojson";
import type L from "leaflet";
import { makeAutoObservable } from "mobx";
import type {
	GridCell,
	ModelOutputDataPoint,
	ViewportBounds,
} from "../component/Mapper/types";

interface DataPoint {
	lat: number;
	lng: number;
	modelOutputValue: number;
}

const calculateDerivedIntervalSize = (dataPoints: DataPoint[]): number => {
	if (!dataPoints || dataPoints.length < 2) return 0.1;

	const first = dataPoints[0];
	const second = dataPoints[1];

	const latDiff = Math.abs(second.lat - first.lat);
	if (latDiff > 0) {
		return Math.min(latDiff, 3);
	}

	const lngDiff = Math.abs(second.lng - first.lng);
	if (lngDiff > 0) {
		return Math.min(lngDiff, 3);
	}

	return 0.5;
};

export class GridProcessingStore {
	isProcessingGrid = false;
	countriesGeoJSON: FeatureCollection<Geometry, GeoJsonProperties> | null =
		null;

	private cachedGridCells: GridCell[] = [];
	private prevViewport: ViewportBounds | null = null;
	private prevResolution = 0;
	private prevFirstDatapointModelOutputValue: number | undefined = undefined;

	constructor() {
		makeAutoObservable(this);
	}

	setIsProcessingGrid = (processing: boolean) => {
		this.isProcessingGrid = processing;
	};

	setCountriesGeoJSON = (
		data: FeatureCollection<Geometry, GeoJsonProperties> | null,
	) => {
		this.countriesGeoJSON = data;
	};

	generateAdaptiveGridCells = (
		dataPoints: DataPoint[],
		viewport: ViewportBounds,
		resolutionFactor = 1,
	): GridCell[] => {
		const startTime = performance.now();
		console.log(
			"🕒 generateAdaptiveGridCells START - dataPoints:",
			dataPoints.length,
		);

		if (!viewport || !dataPoints || dataPoints.length === 0) {
			console.log("⚠️ Early return - no viewport or data");
			return [];
		}

		const { north, south, east, west, zoom } = viewport;

		const intervalStart = performance.now();
		const derivedIntervalSize = calculateDerivedIntervalSize(dataPoints);
		console.log(
			`📏 calculateDerivedIntervalSize took ${(performance.now() - intervalStart).toFixed(2)}ms`,
		);

		const baseSize =
			resolutionFactor > 0 ? resolutionFactor : derivedIntervalSize;
		const gridSize = Number(baseSize.toFixed(6));
		if (!Number.isFinite(gridSize) || gridSize <= 0) {
			console.warn("⚠️ Invalid grid size calculated:", gridSize);
			return [];
		}

		console.log(
			`🔍 Grid size: ${gridSize}, zoom: ${zoom}, resolutionFactor: ${resolutionFactor}`,
		);

		const cellMap = new Map<
			string,
			{ sum: number; count: number; bounds: L.LatLngBoundsExpression }
		>();

		const filterStart = performance.now();
		const buffer = gridSize * 2;
		const filteredData = dataPoints
			.filter(
				(point: DataPoint) =>
					Number.isFinite(point.lat) &&
					Number.isFinite(point.lng) &&
					Number.isFinite(point.modelOutputValue),
			)
			.filter(
				(point: DataPoint) =>
					point.lat >= south - buffer &&
					point.lat <= north + buffer &&
					point.lng >= west - buffer &&
					point.lng <= east + buffer,
			);
		console.log(
			`🔍 Filtering took ${(performance.now() - filterStart).toFixed(2)}ms - filtered from ${dataPoints.length} to ${filteredData.length} points`,
		);

		const processStart = performance.now();
		const halfGridSize = gridSize / 2;
		for (const point of filteredData) {
			const cellLatIndex = Math.round((point.lat + 90) / gridSize);
			const cellLngIndex = Math.round((point.lng + 180) / gridSize);
			const baseCellLat = cellLatIndex * gridSize - 90;
			const baseCellLng = cellLngIndex * gridSize - 180;
			const cellLat = baseCellLat - halfGridSize;
			const cellLng = baseCellLng - halfGridSize;
			const cellId = `${cellLatIndex}_${cellLngIndex}`;

			const bounds: L.LatLngBoundsExpression = [
				[cellLat, cellLng],
				[cellLat + gridSize, cellLng + gridSize],
			];

			if (cellMap.has(cellId)) {
				const cell = cellMap.get(cellId);
				if (cell) {
					cell.sum += point.modelOutputValue;
					cell.count += 1;
				}
			} else {
				cellMap.set(cellId, {
					sum: point.modelOutputValue,
					count: 1,
					bounds,
				});
			}
		}
		console.log(
			`⚙️ Processing loop took ${(performance.now() - processStart).toFixed(2)}ms`,
		);

		const mapStart = performance.now();
		const result = Array.from(cellMap.entries()).map(([id, data]) => ({
			id,
			bounds: data.bounds,
			modelOutputValue: data.sum / data.count,
		}));
		console.log(
			`🗺️ Final mapping took ${(performance.now() - mapStart).toFixed(2)}ms`,
		);

		const totalTime = performance.now() - startTime;
		console.log(
			`✅ generateAdaptiveGridCells COMPLETE - ${result.length} cells in ${totalTime.toFixed(2)}ms`,
		);

		return result;
	};

	/* Note, this is just raw model output data points now and since the resolution change could be made to map directly?
	 * todo: Review this simplification */
	generateGridCellsFromRawModelOutputData = (
		rawModelOutputData: ModelOutputDataPoint[],
		viewport: ViewportBounds | null,
		resolutionLevel: number,
	): GridCell[] => {
		const methodStart = performance.now();
		console.log(
			"🚀 generateGridCellsFromRawModelOutputData START with:",
			rawModelOutputData.length,
			"points, resolution:",
			resolutionLevel,
		);

		if (!viewport || !rawModelOutputData.length) {
			console.log(
				"⚠️ Early exit - no viewport or raw model output data",
				!!viewport,
				rawModelOutputData.length,
			);
			return [];
		}

		const changeCheckStart = performance.now();
		const currentFirstDatapointModelOutputValue =
			rawModelOutputData[0]?.modelOutputValue;
		const hasSignificantViewportChange =
			!this.prevViewport ||
			Math.abs(this.prevViewport.zoom - viewport.zoom) > 0.5 ||
			Math.abs(this.prevViewport.north - viewport.north) > 1 ||
			Math.abs(this.prevViewport.south - viewport.south) > 1 ||
			Math.abs(this.prevViewport.east - viewport.east) > 1 ||
			Math.abs(this.prevViewport.west - viewport.west) > 1;

		const hasResolutionChange =
			Math.abs(this.prevResolution - resolutionLevel) > 0.1;
		const hasDataChange =
			this.prevFirstDatapointModelOutputValue !==
			currentFirstDatapointModelOutputValue;

		console.log(
			`🔍 Change detection took ${(performance.now() - changeCheckStart).toFixed(2)}ms`,
		);
		console.log("📊 Changes detected:", {
			viewport: hasSignificantViewportChange,
			resolution: hasResolutionChange,
			data: hasDataChange,
		});

		if (hasSignificantViewportChange || hasResolutionChange || hasDataChange) {
			console.log(
				"🔄 RECALCULATING grid cells - data size:",
				rawModelOutputData.length,
				"viewport zoom:",
				viewport.zoom,
			);

			const gridGenStart = performance.now();
			const cells = this.generateAdaptiveGridCells(
				rawModelOutputData,
				viewport,
				resolutionLevel,
			);
			console.log(
				`🗂️ Grid generation took ${(performance.now() - gridGenStart).toFixed(2)}ms`,
			);

			console.log("📈 Generated", cells.length, "grid cells");

			this.prevViewport = viewport;
			this.prevResolution = resolutionLevel;
			this.prevFirstDatapointModelOutputValue =
				currentFirstDatapointModelOutputValue;
			this.cachedGridCells = cells;
			const methodTotal = performance.now() - methodStart;
			console.log(
				`✅ generateGridCellsFromRawModelOutputData COMPLETE in ${methodTotal.toFixed(2)}ms`,
			);
			return cells;
		}

		console.log("♻️ Using cached grid cells - no recalculation needed");
		const methodTotal = performance.now() - methodStart;
		console.log(
			`✅ generateGridCellsFromRawModelOutputData COMPLETE in ${methodTotal.toFixed(2)}ms`,
		);
		return this.cachedGridCells;
	};
}

export const gridProcessingStore = new GridProcessingStore();
