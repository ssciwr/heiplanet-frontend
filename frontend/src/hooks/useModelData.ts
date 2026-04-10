import { useEffect, useState } from "react";
import {
	FALLBACK_MODEL_CARDS,
	fetchModelCards,
} from "../services/modelCardService";
import type { Model } from "../types/model";

export interface UseModelDataReturn {
	models: Model[];
	modelMetadataError: string | null;
	modelMetadataLoading: boolean;
}

export const useModelData = (
	selectedModel: string,
	setSelectedModel: (model: string) => void,
): UseModelDataReturn => {
	const [models, setModels] = useState<Model[]>([]);
	const [modelMetadataLoading, setModelMetadataLoading] = useState(true);
	const [modelMetadataError, setModelMetadataError] = useState<string | null>(
		null,
	);

	// Load models for ModelDetailsModal
	useEffect(() => {
		const loadModels = async () => {
			try {
				setModelMetadataLoading(true);
				setModelMetadataError(null);
				const loadedModels = await fetchModelCards();
				if (loadedModels.length === 0) {
					throw new Error("No model metadata found in artifact payload");
				}
				setModels(loadedModels);
			} catch (error) {
				console.error("Error loading model cards:", error);
				setModelMetadataError("Failed to load models from metadata artifact");
				setModels(FALLBACK_MODEL_CARDS);
			} finally {
				setModelMetadataLoading(false);
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
		modelMetadataError,
		modelMetadataLoading,
	};
};
