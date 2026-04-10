from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from datasets import DownloadConfig
from datasets.download.download_manager import DownloadManager
from huggingface_hub import HfApi
import yaml

DATASET_REPO = os.environ.get(
    "HEIPLANET_MODELS_DATASET_REPO", "iulusoy/heiplanet-models-dataset"
)
DATASET_REVISION = os.environ.get("HEIPLANET_MODELS_DATASET_REVISION", "main") # essentially production
ROOT_DIR = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT_DIR / "public" / "model-metadata"
OUTPUT_FILE = OUTPUT_DIR / "models.v1.json"


def clean_text(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    trimmed = value.strip()
    return trimmed or None


def resolve_output_variable(model_yaml: dict[str, Any]) -> str:
    outputs_mapping = model_yaml.get("outputs")
    '''
    e.g.
    outputs:
        r0_estimate:
             description: Estimated relative reproduction number
             units: Dimensionless
    '''
    if isinstance(outputs_mapping, dict):
        for key in outputs_mapping:
            if isinstance(key, str):
                trimmed = key.strip()
                if trimmed:
                    return trimmed

    return "R0"


# bascially manually parse the yaml format; we could use a library instead. Due to  broken bullet continuation lines
# so does not work for default yaml parsing, better solution is to resolve/validate the yaml file before it gets svaed
# todo: mention this
def normalize_yaml_text(raw_text: str) -> str:
    normalized_lines: list[str] = []
    previous_bullet_indent: int | None = None

    for raw_line in raw_text.splitlines():
        stripped = raw_line.strip()
        indent = len(raw_line) - len(raw_line.lstrip(" "))
        is_bullet_line = raw_line.lstrip().startswith("- ")

        if (
            stripped
            and not is_bullet_line
            and previous_bullet_indent is not None
            and indent >= previous_bullet_indent
            and normalized_lines
        ):
            normalized_lines[-1] = f"{normalized_lines[-1].rstrip()} {stripped}"
            continue

        normalized_lines.append(raw_line)

        if is_bullet_line:
            previous_bullet_indent = indent
        elif stripped:
            previous_bullet_indent = None

    return "\n".join(normalized_lines)


def build_details_markdown(model_yaml: dict[str, Any]) -> str: # catch together everything which is not already parsed
    details = {
        key: value
        for key, value in model_yaml.items()
        if key not in {"model_name", "description", "outputs"}
    }
    if not details:
        return ""
    return json.dumps(details, ensure_ascii=True, sort_keys=True)


def normalize_model_to_frontend_model_card_format(model_yaml: dict[str, Any], source_file: str) -> dict[str, Any] | None:
    model_name = clean_text(model_yaml.get("model_name"))
    if not model_name:
        return None

    output_variable = resolve_output_variable(model_yaml)
    description = clean_text(model_yaml.get("description")) or ""
    details = build_details_markdown(model_yaml)

    return {
        "id": model_name,
        "modelName": model_name,
        "title": model_name,
        "description": description,
        "details": details, # basically a variable for all other yaml not specified for our frontend yet concatenated into a string
        "output": [output_variable],
        "model_output_variable": output_variable,
        "cardYamlUrl": (
            f"https://huggingface.co/datasets/{DATASET_REPO}/resolve/"
            f"{DATASET_REVISION}/{source_file}"
        ),
    }


# This then bakes in at build time for the frontend. Note this happens when building the image, so you need to rebuild the image, not just bring it up again for this to update.
# (so most likely timed also for when updating the huggingface datasets in tandem)
def build_model_artifact() -> None:
    api = HfApi()
    repo_files = api.list_repo_files(
        repo_id=DATASET_REPO,
        repo_type="dataset",
        revision=DATASET_REVISION,
    )
    model_yaml_files = sorted(
        file_path
        for file_path in repo_files
        if "/" not in file_path and file_path.lower().endswith((".yaml", ".yml"))
    )

    if not model_yaml_files:
        raise RuntimeError(
            f"No root-level YAML model files found in dataset {DATASET_REPO}@{DATASET_REVISION}"
        )

    download_manager = DownloadManager(
        download_config=DownloadConfig(
            user_agent="heiplanet-frontend-model-metadata-build"
        )
    )

    models: list[dict[str, Any]] = []
    for source_file in model_yaml_files:
        remote_url = (
            f"https://huggingface.co/datasets/{DATASET_REPO}/resolve/"
            f"{DATASET_REVISION}/{source_file}"
        )
        local_path = Path(download_manager.download(remote_url))
        yaml_content = yaml.safe_load(
            normalize_yaml_text(local_path.read_text(encoding="utf-8"))
        )
        if not isinstance(yaml_content, dict):
            continue
        normalized_model = normalize_model_to_frontend_model_card_format(yaml_content, source_file)
        if normalized_model:
            models.append(normalized_model)

    if not models:
        raise RuntimeError(
            f"No model definitions could be normalized from {DATASET_REPO}@{DATASET_REVISION}"
        )

    deduped_models = {
        model["id"]: model
        for model in sorted(models, key=lambda model: model["modelName"].lower())
    }
    artifact_payload = {
        "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "generated_from": f"hf-dataset:{DATASET_REPO}@{DATASET_REVISION}",
        "models": list(deduped_models.values()),
    }

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(
        json.dumps(artifact_payload, indent=2, ensure_ascii=True) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {OUTPUT_FILE} with {len(deduped_models)} models")


if __name__ == "__main__":
    build_model_artifact()
