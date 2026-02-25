import type { Model } from "../types/model";

const DEFAULT_OUTPUT_VARIABLE = "R0";
const LOCAL_ARTIFACT_URL = "/model-metadata/models.v1.json";

type ModelApiPayload = Model[] | { models?: Model[] };

const getConfiguredArtifactUrl = (): string | null => {
	const configured = import.meta.env.VITE_MODELS_ARTIFACT_URL;
	if (typeof configured !== "string") return null;
	const trimmed = configured.trim();
	return trimmed ? trimmed : null;
};

const resolveOutputVariable = (model: Model): string => {
	const apiOutput =
		typeof model.model_output_variable === "string"
			? model.model_output_variable.trim()
			: "";
	if (apiOutput) return apiOutput;

	const firstOutput =
		Array.isArray(model.output) && typeof model.output[0] === "string"
			? model.output[0].trim()
			: "";
	return firstOutput || DEFAULT_OUTPUT_VARIABLE;
};

const normalizeModel = (model: Model): Model => {
	const outputVariable = resolveOutputVariable(model);
	const outputValues = Array.isArray(model.output)
		? model.output.filter(
				(value): value is string =>
					typeof value === "string" && value.trim().length > 0,
			)
		: [];
	const normalizedOutput = [
		outputVariable,
		...outputValues.filter((value) => value !== outputVariable),
	];

	return {
		...model,
		modelName: model.modelName || model.title || model.id,
		model_output_variable: outputVariable,
		output: normalizedOutput.length
			? normalizedOutput
			: [DEFAULT_OUTPUT_VARIABLE],
	};
};

const fetchModelsFromUrl = async (url: string): Promise<Model[]> => {
	const response = await fetch(url, {
		headers: { Accept: "application/json" },
	});
	if (!response.ok) {
		throw new Error(`${url} returned HTTP ${response.status}`);
	}

	const payload = (await response.json()) as ModelApiPayload;
	const models = Array.isArray(payload) ? payload : payload.models;
	if (!Array.isArray(models)) {
		throw new Error(`${url} returned an unexpected model payload`);
	}

	return models
		.map(normalizeModel)
		.sort((a, b) => a.modelName.localeCompare(b.modelName));
};

const getModelSourceUrls = (): string[] => {
	const configuredArtifactUrl = getConfiguredArtifactUrl();
	const urls = configuredArtifactUrl
		? [
				configuredArtifactUrl,
				...(import.meta.env.DEV ? [LOCAL_ARTIFACT_URL] : []),
			]
		: [LOCAL_ARTIFACT_URL];
	return [...new Set(urls)];
};

export const fetchModelCards = async (): Promise<Model[]> => {
	const errors: string[] = [];
	for (const sourceUrl of getModelSourceUrls()) {
		try {
			return await fetchModelsFromUrl(sourceUrl);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			errors.push(message);
		}
	}

	throw new Error(
		`Failed to load model metadata from artifact source(s). ${errors.join(" | ")}`,
	);
};
