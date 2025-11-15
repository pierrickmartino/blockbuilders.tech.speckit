"""Onboarding service surface area (Phase 2 stubs)."""

from .service import (
    ChecklistConflictError,
    ChecklistNotFoundError,
    ChecklistService,
    ChecklistServiceProtocol,
    OverrideService,
    OverrideServiceProtocol,
    TemplateSelectionService,
    TemplateSelectionServiceProtocol,
    TelemetryService,
    TelemetryServiceProtocol,
    reset_onboarding_state,
)
from .versioning import has_definition_changed

__all__ = [
    'ChecklistConflictError',
    'ChecklistNotFoundError',
    'ChecklistService',
    'ChecklistServiceProtocol',
    'OverrideService',
    'OverrideServiceProtocol',
    'TemplateSelectionService',
    'TemplateSelectionServiceProtocol',
    'TelemetryService',
    'TelemetryServiceProtocol',
    'reset_onboarding_state',
    'has_definition_changed',
]
