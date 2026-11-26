import { makeAutoObservable } from "mobx";
import type { Month } from "../component/Mapper/types";
import { STARTUP_MONTH, STARTUP_YEAR } from "../constants/startupDate";

export class UserSelectionsForClimateQueryStore {
	selectedModel = "";
	selectedOptimism = "optimistic";
	currentYear = STARTUP_YEAR;
	currentMonth: Month = STARTUP_MONTH;
	currentVariableType = "R0";
	mapMode: "europe-only" | "grid" = "europe-only";

	constructor() {
		makeAutoObservable(this);
	}

	setSelectedModel = (model: string) => {
		this.selectedModel = model;
	};

	setSelectedOptimism = (optimism: string) => {
		this.selectedOptimism = optimism;
	};

	setCurrentYear = (year: number) => {
		this.currentYear = year;
	};

	setCurrentMonth = (month: Month) => {
		this.currentMonth = month;
	};

	setCurrentVariableType = (value: string) => {
		this.currentVariableType = value;
	};

	setMapMode = (mode: "europe-only" | "grid") => {
		this.mapMode = mode;
	};
}

export const userSelectionsForClimateQueryStore =
	new UserSelectionsForClimateQueryStore();
