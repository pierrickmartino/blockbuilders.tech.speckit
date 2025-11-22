"""Onboarding service surface area (Phase 2 stubs)."""

from .service import (
    ChecklistConflictError,
    ChecklistNotFoundError,
    ChecklistService,
    ChecklistServiceProtocol,
    OverrideService,
    OverrideServiceProtocol,
    TelemetryService,
    TelemetryServiceProtocol,
    TemplateSelectionService,
    TemplateSelectionServiceProtocol,
    reset_onboarding_state,
)
from .versioning import has_definition_changed

__all__ = [
    "ChecklistConflictError",
    "ChecklistNotFoundError",
    "ChecklistService",
    "ChecklistServiceProtocol",
    "OverrideService",
    "OverrideServiceProtocol",
    "TelemetryService",
    "TelemetryServiceProtocol",
    "TemplateSelectionService",
    "TemplateSelectionServiceProtocol",
    "has_definition_changed",
    "reset_onboarding_state",
]
