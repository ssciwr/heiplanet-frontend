import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { isMap, parseDocument } from "yaml";

const DATASET_REPO =
	process.env.HEIPLANET_MODELS_DATASET_REPO ??
	"iulusoy/heiplanet-models-dataset";
const DATASET_REVISION =
	process.env.HEIPLANET_MODELS_DATASET_REVISION ?? "main";
const OUTPUT_DIR = path.resolve(process.cwd(), "public/model-metadata");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "models.v1.json");
const MODEL_METADATA_URL = `https://huggingface.co/datasets/${DATASET_REPO}/resolve/${DATASET_REVISION}`;
const DATASET_TREE_URL = `https://huggingface.co/api/datasets/${DATASET_REPO}/tree/${encodeURIComponent(DATASET_REVISION)}?recursive=true`;

export const cleanText = (value) => {
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	return trimmed || null;
};

export const resolveOutputVariable = (modelYaml) => {
	const outputsMapping = modelYaml.outputs;
	if (
		outputsMapping &&
		typeof outputsMapping === "object" &&
		!Array.isArray(outputsMapping)
	) {
		for (const key of Object.keys(outputsMapping)) {
			if (typeof key === "string" && key.trim()) {
				return key.trim();
			}
		}
	}

	return "R0";
};

// Due to some properties currently not being valid yaml
// long term solution: Delete this, add a github action flow which runs yaml parser on the model files.
export const parseRootLevelYamlProperties = (rawText) => {
	const document = parseDocument(rawText, {
		keepSourceTokens: true,
		prettyErrors: false,
		uniqueKeys: false,
	});
	if (!isMap(document.contents)) {
		return {};
	}

	const pairs = document.contents.items.filter(
		(item) => typeof item.key?.toString?.() === "string",
	);
	const invalidKeys = new Set(
		document.errors
			.map((error) => {
				const errorPosition = Math.max((error.pos?.[0] ?? 1) - 1, 0);
				return pairs
					.find((item, index) => {
						const start = item.key.range?.[0] ?? -1;
						const end = pairs[index + 1]?.key.range?.[0] ?? rawText.length + 1;
						return start <= errorPosition && errorPosition < end;
					})
					?.key.toString();
			})
			.filter(Boolean),
	);

	return Object.fromEntries(
		pairs
			.filter((item) => !invalidKeys.has(item.key.toString()))
			.map((item) => [item.key.toString(), item.value?.toJSON()]),
	);
};

export const buildDetailsJson = (modelYaml) => {
	const details = Object.fromEntries(
		Object.entries(modelYaml).filter(
			([key]) => !["model_name", "description", "outputs"].includes(key),
		),
	);

	return Object.keys(details).length === 0
		? ""
		: JSON.stringify(details, undefined, 0);
};

export const normalizeModel = (modelYaml, sourceFile) => {
	const modelName = cleanText(modelYaml.model_name);
	if (!modelName) {
		return null;
	}

	const outputVariable = resolveOutputVariable(modelYaml);
	const description = cleanText(modelYaml.description) ?? "";
	const details = buildDetailsJson(modelYaml);

	return {
		id: modelName,
		modelName,
		title: modelName,
		description,
		details,
		output: [outputVariable],
		model_output_variable: outputVariable,
		cardYamlUrl: `${MODEL_METADATA_URL}/${sourceFile}`,
	};
};

export const listRootLevelYamlFiles = async () => {
	const response = await fetch(DATASET_TREE_URL, {
		headers: {
			Accept: "application/json",
		},
	});
	if (!response.ok) {
		throw new Error(
			`Failed to list dataset files from ${DATASET_TREE_URL}: HTTP ${response.status}`,
		);
	}

	const payload = await response.json();
	if (!Array.isArray(payload)) {
		throw new Error("Dataset tree response was not an array");
	}

	return payload
		.map((entry) => (typeof entry?.path === "string" ? entry.path : null))
		.filter(
			(filePath) =>
				typeof filePath === "string" &&
				!filePath.includes("/") &&
				/\.(yaml|yml)$/iu.test(filePath),
		)
		.sort((left, right) => left.localeCompare(right));
};

export const fetchRequiredText = async (url) => {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
	}

	return response.text();
};

export const loadModel = async (sourceFile) => {
	const yamlContent = parseRootLevelYamlProperties(
		await fetchRequiredText(`${MODEL_METADATA_URL}/${sourceFile}`),
	);
	return normalizeModel(yamlContent, sourceFile);
};

export const buildModelArtifact = async () => {
	const modelYamlFiles = await listRootLevelYamlFiles();
	if (modelYamlFiles.length === 0) {
		throw new Error(
			`No root-level YAML model files found in dataset ${DATASET_REPO}@${DATASET_REVISION}`,
		);
	}

	const models = (await Promise.all(modelYamlFiles.map(loadModel))).filter(
		Boolean,
	);

	if (models.length === 0) {
		throw new Error(
			`No model definitions could be normalized from ${DATASET_REPO}@${DATASET_REVISION}`,
		);
	}

	const dedupedModels = Array.from(
		new Map(
			models
				.toSorted((left, right) =>
					left.modelName.localeCompare(right.modelName, undefined, {
						sensitivity: "base",
					}),
				)
				.map((model) => [model.id, model]),
		).values(),
	);

	const artifactPayload = {
		generated_at: new Date().toISOString(),
		generated_from: `hf-dataset:${DATASET_REPO}@${DATASET_REVISION}`,
		models: dedupedModels,
	};

	fs.mkdirSync(OUTPUT_DIR, { recursive: true });
	fs.writeFileSync(
		OUTPUT_FILE,
		`${JSON.stringify(artifactPayload, null, 2)}\n`,
		"utf8",
	);
	console.log(`Wrote ${OUTPUT_FILE} with ${dedupedModels.length} models`);
};

if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(process.argv[1]).href
) {
	buildModelArtifact().catch((error) => {
		console.error(error);
		process.exitCode = 1;
	});
}
