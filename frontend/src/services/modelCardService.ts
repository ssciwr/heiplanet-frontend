import type { Model } from "../types/model";

// todo: Make this more dynamic in the future if needed.
const MODEL_CARDS_REPO = "ssciwr/onehealth-model-backend";
const MODEL_CARDS_DIR = "model_cards";
const MODEL_CARDS_SUFFIX = "_model_card.md";
const MODEL_CARDS_YAML_SUFFIX = "_model_card.yaml";
const MODEL_CARDS_YML_SUFFIX = "_model_card.yml";

const CONTENTS_URL = `https://api.github.com/repos/${MODEL_CARDS_REPO}/contents/${MODEL_CARDS_DIR}`;
const RAW_BASE_URL = `https://raw.githubusercontent.com/${MODEL_CARDS_REPO}/main/${MODEL_CARDS_DIR}/`;
const BLOB_BASE_URL = `https://github.com/${MODEL_CARDS_REPO}/blob/main/${MODEL_CARDS_DIR}/`;

const stripMarkdown = (text: string): string =>
	text
		.replace(/\[(.+?)]\([^)]+\)/g, "$1")
		.replace(/`([^`]+)`/g, "$1")
		.replace(/\*\*([^*]+)\*\*/g, "$1")
		.replace(/_([^_]+)_/g, "$1")
		.replace(/^#+\s*/, "")
		.trim();

const deriveDescription = (markdown: string): string => {
	const lines = markdown.split(/\r?\n/);
	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed) continue;
		if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
			continue;
		}
		return stripMarkdown(trimmed);
	}
	return "";
};

export const fetchModelCards = async (): Promise<Model[]> => {
	const response = await fetch(CONTENTS_URL);
	if (!response.ok) {
		throw new Error(`Failed to list model cards: ${response.status}`);
	}

	const payload = await response.json();
	if (!Array.isArray(payload)) {
		throw new Error("Unexpected model card listing response");
	}

	const cardFiles = payload
		.filter((item) => item?.name?.endsWith(MODEL_CARDS_SUFFIX))
		.map((item) => item.name as string);
	const yamlFiles = new Set(
		payload
			.filter(
				(item) =>
					item?.name?.endsWith(MODEL_CARDS_YAML_SUFFIX) ||
					item?.name?.endsWith(MODEL_CARDS_YML_SUFFIX),
			)
			.map((item) => item.name as string),
	);

	const models: Model[] = [];

	for (const filename of cardFiles) {
		const modelName = filename.replace(MODEL_CARDS_SUFFIX, "");
		const yamlFilename = yamlFiles.has(`${modelName}${MODEL_CARDS_YAML_SUFFIX}`)
			? `${modelName}${MODEL_CARDS_YAML_SUFFIX}`
			: yamlFiles.has(`${modelName}${MODEL_CARDS_YML_SUFFIX}`)
				? `${modelName}${MODEL_CARDS_YML_SUFFIX}`
				: null;
		try {
			const cardResponse = await fetch(`${RAW_BASE_URL}${filename}`);
			if (!cardResponse.ok) {
				console.warn(
					`Failed to fetch model card ${filename}: ${cardResponse.status}`,
				);
				continue;
			}

			const cardMarkdown = await cardResponse.text();
			models.push({
				id: modelName,
				modelName,
				title: modelName,
				description: deriveDescription(cardMarkdown),
				emoji: "📄",
				color: "#0B63CE",
				output: ["R0"],
				cardMarkdown,
				cardYamlUrl: yamlFilename
					? `${BLOB_BASE_URL}${yamlFilename}`
					: undefined,
			});
		} catch (error) {
			console.error(`Error fetching model card ${filename}:`, error);
		}
	}

	return models.sort((a, b) => a.modelName.localeCompare(b.modelName));
};
