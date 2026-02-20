import { useEffect, useState } from "react";
import { fetchModelCards } from "../services/modelCardService";
import type { Model } from "../types/model";

export interface UseModelDataReturn {
	models: Model[];
	setModels: (models: Model[]) => void;
	getOptimismLevels: () => string[];
}

export const useModelData = (
	selectedModel: string,
	setSelectedModel: (model: string) => void,
): UseModelDataReturn => {
	const [models, setModels] = useState<Model[]>([]);

	const getOptimismLevels = () => ["optimistic", "realistic", "pessimistic"];

	// Load models for ModelDetailsModal
	useEffect(() => {
		const loadModels = async () => {
			try {
				const loadedModels = await fetchModelCards();
				setModels(loadedModels);
			} catch (error) {
				console.error("Error loading model cards:", error);
				setModels([]);
			}
		};

		loadModels();
	}, []);

	// Set the first model as default once models are loaded
	useEffect(() => {
		if (!selectedModel && models.length > 0) {
			setSelectedModel(models[0].id);
		}
	}, [models, selectedModel, setSelectedModel]);

	return {
		models,
		setModels,
		getOptimismLevels,
	};
};
