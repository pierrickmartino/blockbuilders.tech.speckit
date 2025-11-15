from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Mapping, Sequence
from uuid import UUID


@dataclass(frozen=True)
class StarterTemplateDefinition:
    template_id: UUID
    title: str
    description: str
    estimated_run_time_minutes: int
    default_parameters: Mapping[str, Any]
    react_flow_schema: Mapping[str, Any]


class TemplateCatalog:
    def __init__(self, templates: Sequence[StarterTemplateDefinition]) -> None:
        self._templates = {template.template_id: template for template in templates}

    def list(self) -> tuple[StarterTemplateDefinition, ...]:
        return tuple(self._templates.values())

    def get(self, template_id: UUID) -> StarterTemplateDefinition:
        try:
            return self._templates[template_id]
        except KeyError as exc:
            raise LookupError(f"Unknown starter template '{template_id}'") from exc

    def is_available(self) -> bool:
        return bool(self._templates)


def _repo_root() -> Path:
    current = Path(__file__).resolve()
    for parent in current.parents:
        if (parent / ".git").exists():
            return parent
    return current.parents[-1]


def _load_template_definitions() -> tuple[StarterTemplateDefinition, ...]:
    template_path = _repo_root() / "shared" / "templates" / "starter_templates.json"
    content = json.loads(template_path.read_text(encoding="utf-8"))
    templates: list[StarterTemplateDefinition] = []
    for entry in content:
        templates.append(
            StarterTemplateDefinition(
                template_id=UUID(entry["template_id"]),
                title=entry["title"],
                description=entry["description"],
                estimated_run_time_minutes=int(entry["estimated_run_time_minutes"]),
                default_parameters=entry.get("default_parameters", {}),
                react_flow_schema=entry.get("react_flow", {}),
            ),
        )
    return tuple(templates)


_GLOBAL_CATALOG = TemplateCatalog(_load_template_definitions())


def get_template_catalog() -> TemplateCatalog:
    return _GLOBAL_CATALOG


__all__ = ["StarterTemplateDefinition", "TemplateCatalog", "get_template_catalog"]
