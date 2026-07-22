import { useEffect, useState } from "react";
import {
	FALLBACK_MODEL_CARDS,
	fetchModelCards,
	resolveRequestVariable,
} from "../services/modelCardService";
import { fetchNutsData } from "../services/nutsDataService";
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
	const [initialSelection] = useState(selectedModel);
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
				let defaultModel = loadedModels[0].id; // fallback incase no model has any data
				if (!initialSelection) {
					for (const model of loadedModels) {
						try {
							const data = await fetchNutsData(
								2025,
								7,
								resolveRequestVariable(model),
								"NUTS3",
							);
							if (Object.keys(data).length > 0) {
								defaultModel = model.id; // assign default model for later use in setSelectedModel
								break; // stop checking for other models, leave the for loop
							}
						} catch (error) {
							console.debug(`No startup data for ${model.id}:`, error);
						}
					} // finally set to the model which had some data.
					setSelectedModel(defaultModel);
				}
				setModels(loadedModels);
			} catch (error) {
				console.error("Error loading model cards:", error);
				setModelMetadataError("Failed to load models from metadata artifact");
				setModels(FALLBACK_MODEL_CARDS);
				if (!initialSelection) {
					setSelectedModel(FALLBACK_MODEL_CARDS[0].id);
				}
			} finally {
				setModelMetadataLoading(false);
			}
		};

		loadModels();
	}, [initialSelection, setSelectedModel]);

	return {
		models,
		modelMetadataError,
		modelMetadataLoading,
	};
};
