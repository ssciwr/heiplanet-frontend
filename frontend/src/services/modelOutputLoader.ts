import * as turf from "@turf/turf";
import type {
	DataExtremes,
	ModelOutputDataPoint,
	Month,
	ViewportBounds,
} from "../component/Mapper/types";
import { calculateExtremes } from "../component/Mapper/utilities/mapDataUtils";
import type { Model } from "../types/model";
import { fetchClimateData } from "./climateDataService";
import {
	resolveOutputVariable,
	resolveRequestVariable,
} from "./modelCardService";
import { fetchNutsData } from "./nutsDataService";

type GridDataRequest = {
	year: number;
	month: Month;
	selectedModelData?: Model;
	viewportBounds: ViewportBounds | null;
	requestedGridResolution: number;
};

type EuropeNutsDataRequest = {
	year: number;
	month: Month;
	selectedModelData?: Model;
};

type GridDataResult = {
	dataPoints: ModelOutputDataPoint[];
	extremes: DataExtremes;
	requestedVariableValue: string;
	safeMonth: Month;
};

type EuropeNutsDataResult = {
	nutsApiData: { [nutsId: string]: number };
	requestedVariableValue: string;
	safeMonth: Month;
};

const getRequestedVariableValue = (selectedModelData?: Model) => {
	return {
		requestedVariableValue: selectedModelData
			? resolveRequestVariable(selectedModelData)
			: "R0",
		outputFormat: selectedModelData
			? [resolveOutputVariable(selectedModelData)]
			: undefined,
	};
};

const loadGridData = async ({
	year,
	month,
	selectedModelData,
	viewportBounds,
	requestedGridResolution,
}: GridDataRequest): Promise<GridDataResult> => {
	const safeMonth = (month || 7) as Month;
	const { requestedVariableValue, outputFormat } =
		getRequestedVariableValue(selectedModelData);
	const apiData = await fetchClimateData(
		year,
		safeMonth,
		requestedVariableValue,
		outputFormat,
		viewportBounds,
		requestedGridResolution,
	);

	const dataPoints: ModelOutputDataPoint[] = [];
	for (const { latitude: lat, longitude: lng, modelOutputValue } of apiData) {
		if (
			Number.isFinite(lat) &&
			Number.isFinite(lng) &&
			Number.isFinite(modelOutputValue)
		) {
			dataPoints.push({
				point: turf.point([lng, lat]),
				modelOutputValue,
				lat,
				lng,
			});
		}
	}

	return {
		dataPoints,
		extremes: calculateExtremes(dataPoints, false),
		requestedVariableValue,
		safeMonth,
	};
};

const loadEuropeNutsData = async ({
	year,
	month,
	selectedModelData,
}: EuropeNutsDataRequest): Promise<EuropeNutsDataResult> => {
	const safeMonth = (month || 7) as Month;
	const { requestedVariableValue } =
		getRequestedVariableValue(selectedModelData);

	return {
		nutsApiData: await fetchNutsData(
			year,
			safeMonth,
			requestedVariableValue,
			"NUTS3",
		),
		requestedVariableValue,
		safeMonth,
	};
};

export const modelOutputLoader = {
	loadGridData,
	loadEuropeNutsData,
};
