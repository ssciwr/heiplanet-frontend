import { makeAutoObservable } from "mobx";
import type { Month } from "../component/Mapper/types";

export class UserSelectionsStore {
	selectedModel = "";
	selectedOptimism = "optimistic";
	currentYear = 2025;
	currentMonth: Month = 7;
	currentOutputVariable = "R0";
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

	setCurrentOutputVariable = (value: string) => {
		this.currentOutputVariable = value;
	};

	setMapMode = (mode: "europe-only" | "grid") => {
		this.mapMode = mode;
	};
}

export const userSelectionsStore = new UserSelectionsStore();
