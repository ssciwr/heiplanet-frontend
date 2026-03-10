import type { Month, MonthInfo } from "../types";

export const MONTHS: MonthInfo[] = [
	{ value: 1, label: "January", shortLabel: "Jan" },
	{ value: 2, label: "February", shortLabel: "Feb" },
	{ value: 3, label: "March", shortLabel: "Mar" },
	{ value: 4, label: "April", shortLabel: "Apr" },
	{ value: 5, label: "May", shortLabel: "May" },
	{ value: 6, label: "June", shortLabel: "Jun" },
	{ value: 7, label: "July", shortLabel: "Jul" },
	{ value: 8, label: "August", shortLabel: "Aug" },
	{ value: 9, label: "September", shortLabel: "Sep" },
	{ value: 10, label: "October", shortLabel: "Oct" },
	{ value: 11, label: "November", shortLabel: "Nov" },
	{ value: 12, label: "December", shortLabel: "Dec" },
];

export const getMonthInfo = (month: Month): MonthInfo => {
	return MONTHS[month - 1];
};

export const formatMonthForApi = (month: Month): string => {
	return month.toString().padStart(2, "0");
};

export const formatDateForApi = (year: number, month: Month): string => {
	return `${year}-${formatMonthForApi(month)}-01`;
};

export const getMonthLabel = (month: Month): string => {
	return getMonthInfo(month).label;
};

export const getMonthShortLabel = (month: Month): string => {
	return getMonthInfo(month).shortLabel;
};

// Variable to unit mapping for legend display
export const getVariableUnit = (variableValue: string): string => {
	const unitMap: { [key: string]: string } = {
		R0: "R0",
		t2m: "°C",
		temperature: "°C",
		temp: "°C",
		// Add more mappings as needed
	};

	return unitMap[variableValue] || variableValue;
};

// Variable to display name mapping for popup display
export const getVariableDisplayName = (variableValue: string): string => {
	const displayNameMap: { [key: string]: string } = {
		R0: "R0",
		t2m: "Temperature (2m above ground)",
		temperature: "Temperature",
		temp: "Temperature",
		// Add more mappings as needed
	};

	if (displayNameMap[variableValue]) {
		return displayNameMap[variableValue];
	}

	const normalizedVariable = variableValue
		.replace(/_/g, " ")
		.trim()
		.replace(/\s+/g, " ");

	return normalizedVariable
		? `${normalizedVariable.charAt(0).toUpperCase()}${normalizedVariable.slice(1)}`
		: variableValue;
};

// Get formatted variable value with unit for display
export const getFormattedVariableValue = (
	variableValue: string,
	value: number,
): string => {
	const unit = getVariableUnit(variableValue);

	if (value === null || value === undefined) {
		return "N/A";
	}

	const unitSuffix = unit && unit !== variableValue ? unit : "";

	return `${value.toFixed(1)}${unitSuffix}`;
};
