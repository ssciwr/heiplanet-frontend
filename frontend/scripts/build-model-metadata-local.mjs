import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

const OUTPUT_DIR = path.resolve(process.cwd(), "public/model-metadata");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "models.v1.json");

const resolveModelCardsDir = () => {
	const envDir = process.env.HEIPLANET_MODELS_DIR;
	const candidates = [
		envDir ? path.resolve(envDir, "model_cards") : null,
		path.resolve(process.cwd(), "../heiplanet-models/model_cards"),
		path.resolve(process.cwd(), "../../heiplanet-models/model_cards"),
	].filter(Boolean);

	for (const candidateDir of candidates) {
		if (fs.existsSync(candidateDir)) {
			return candidateDir;
		}
	}

	throw new Error(
		[
			"Missing model cards directory.",
			"Set HEIPLANET_MODELS_DIR or place heiplanet-models at one of:",
			...candidates,
		].join(" "),
	);
};

const MODEL_CARDS_DIR = resolveModelCardsDir();

const firstNonEmptyString = (...values) => {
	for (const value of values) {
		if (typeof value === "string" && value.trim()) {
			return value.trim();
		}
	}
	return null;
};

const toStringList = (value) => {
	if (Array.isArray(value)) {
		return value
			.filter((item) => typeof item === "string" && item.trim())
			.map((item) => item.trim());
	}
	if (typeof value === "string" && value.trim()) {
		return [value.trim()];
	}
	return [];
};

const resolveOutputVariable = (modelYaml) => {
	const explicitOutputVariable = firstNonEmptyString(
		modelYaml.model_output_variable,
		modelYaml["model-output-variable"],
	);
	if (explicitOutputVariable) return explicitOutputVariable;

	const outputValues = toStringList(modelYaml.output);
	if (outputValues.length > 0) return outputValues[0];

	const outputsValues = toStringList(modelYaml.outputs);
	if (outputsValues.length > 0) return outputsValues[0];

	if (modelYaml.outputs && typeof modelYaml.outputs === "object") {
		for (const key of Object.keys(modelYaml.outputs)) {
			if (typeof key === "string" && key.trim()) {
				return key.trim();
			}
		}
	}

	return "R0";
};

const normalizeModel = (modelYaml, sourceFile) => {
	const modelName = firstNonEmptyString(
		modelYaml.model_name,
		modelYaml["model-name"],
		modelYaml.modelName,
		modelYaml.title,
		modelYaml.id,
	);
	if (!modelName) return null;

	const outputVariable = resolveOutputVariable(modelYaml);
	const outputValues = [
		...toStringList(modelYaml.output),
		...toStringList(modelYaml.outputs),
	];
	const normalizedOutput = [
		outputVariable,
		...outputValues.filter((value) => value !== outputVariable),
	];

	return {
		id: firstNonEmptyString(modelYaml.id, modelName) || modelName,
		modelName,
		title: firstNonEmptyString(modelYaml.title, modelName) || modelName,
		description: firstNonEmptyString(modelYaml.description, "") || "",
		output: normalizedOutput.length > 0 ? normalizedOutput : ["R0"],
		model_output_variable: outputVariable,
		cardYamlUrl: `https://github.com/ssciwr/heiplanet-models/blob/main/model_cards/${sourceFile}`,
	};
};

const getCandidateModels = (yamlContent) => {
	const candidates = [];

	if (Array.isArray(yamlContent.models)) {
		for (const modelCandidate of yamlContent.models) {
			if (modelCandidate && typeof modelCandidate === "object") {
				candidates.push(modelCandidate);
			}
		}
	}

	const rootLooksLikeModel = [
		"model_name",
		"model-name",
		"modelName",
		"id",
		"model_output_variable",
		"model-output-variable",
		"output",
		"outputs",
	].some((key) => Object.hasOwn(yamlContent, key));
	if (rootLooksLikeModel) {
		candidates.push(yamlContent);
	}

	return candidates;
};

const buildLocalArtifact = () => {
	const yamlFiles = fs
		.readdirSync(MODEL_CARDS_DIR)
		.filter(
			(fileName) => fileName.endsWith(".yaml") || fileName.endsWith(".yml"),
		)
		.sort((left, right) => left.localeCompare(right));

	const normalizedModels = [];
	for (const yamlFile of yamlFiles) {
		const yamlPath = path.join(MODEL_CARDS_DIR, yamlFile);
		const yamlContent = yaml.load(fs.readFileSync(yamlPath, "utf8"));
		if (!yamlContent || typeof yamlContent !== "object") {
			continue;
		}

		for (const modelCandidate of getCandidateModels(yamlContent)) {
			const normalizedModel = normalizeModel(modelCandidate, yamlFile);
			if (normalizedModel) {
				normalizedModels.push(normalizedModel);
			}
		}
	}

	if (normalizedModels.length === 0) {
		throw new Error("No models found in ../heiplanet-models/model_cards");
	}

	const dedupedById = new Map();
	for (const model of normalizedModels) {
		dedupedById.set(model.id, model);
	}

	const models = Array.from(dedupedById.values()).sort((a, b) =>
		a.modelName.localeCompare(b.modelName),
	);
	const artifactPayload = {
		schema_version: "models.v1",
		generated_at: new Date().toISOString(),
		generated_from: "local-dev",
		models,
	};

	fs.mkdirSync(OUTPUT_DIR, { recursive: true });
	fs.writeFileSync(
		OUTPUT_FILE,
		`${JSON.stringify(artifactPayload, null, 2)}\n`,
		"utf8",
	);
	console.log(`Wrote ${OUTPUT_FILE} with ${models.length} models`);
};

buildLocalArtifact();
