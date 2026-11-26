import assert from "node:assert/strict";
import { test } from "node:test";
import {
	buildDetailsJson,
	normalizeModel,
	resolveOutputVariable,
} from "./build-model-metadata.mjs";

test("model_output_variable takes precedence over outputs", () => {
	const card = {
		model_name: "P-Model",
		model_output_variable: " adults_log10 ",
		outputs: { adults: { units: "per 625 km²" } },
	};
	assert.equal(resolveOutputVariable(card), "adults_log10");
	const model = normalizeModel(card, "pmodel.yaml");
	assert.equal(model.model_output_variable, "adults_log10");
	assert.deepEqual(model.output, ["adults_log10"]);
});

test("model_output_variable can be a mapping", () => {
	assert.equal(
		resolveOutputVariable({
			model_output_variable: {
				adults_log10: { description: "Log10 of mature adults" },
			},
			outputs: { eggs: {}, adults: {} },
		}),
		"adults_log10",
	);
});

test("falls back to the first outputs key", () => {
	assert.equal(
		resolveOutputVariable({ outputs: { r0_estimate: {}, other: {} } }),
		"r0_estimate",
	);
	assert.equal(
		resolveOutputVariable({ model_output_variable: "  ", outputs: { x: {} } }),
		"x",
	);
});

test("falls back to R0 without usable outputs", () => {
	assert.equal(resolveOutputVariable({}), "R0");
	assert.equal(resolveOutputVariable({ outputs: ["a", "b"] }), "R0");
});

test("model_output_variable is not repeated in the details", () => {
	const details = buildDetailsJson({
		model_name: "P-Model",
		model_output_variable: "adults_log10",
		version: "1.0",
	});
	assert.deepEqual(JSON.parse(details), { version: "1.0" });
});
