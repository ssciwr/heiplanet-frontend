import type { Model } from "../types/model";

const DEFAULT_OUTPUT_VARIABLE = "R0";
const MODEL_METADATA_URL = "/model-metadata/models.v1.json";

type ModelApiPayload = Model[] | { models?: Model[] };

export const FALLBACK_MODEL_CARDS: Model[] = [
	{
		id: "model-cards-unavailable",
		modelName: "Model Cards Unavailable",
		title: "Model Cards Unavailable",
		description:
			"Unable to load model metadata from artifact source, may require regeneration.",
		emoji: "⚠️",
		color: "#D14343",
		details: "",
		output: [DEFAULT_OUTPUT_VARIABLE],
		model_output_variable: DEFAULT_OUTPUT_VARIABLE,
	},
];

export const resolveOutputVariable = (model: Model): string => {
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

export const resolveRequestVariable = (model: Model): string => {
	return resolveOutputVariable(model);
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

export const fetchModelCards = async (): Promise<Model[]> => {
	return fetchModelsFromUrl(MODEL_METADATA_URL);
};
