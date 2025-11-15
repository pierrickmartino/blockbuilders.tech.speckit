"""Onboarding service surface area (Phase 2 stubs)."""

from .service import (
    ChecklistService,
    ChecklistServiceProtocol,
    OverrideService,
    OverrideServiceProtocol,
    TemplateSelectionService,
    TemplateSelectionServiceProtocol,
    TelemetryService,
    TelemetryServiceProtocol,
)
from .versioning import has_definition_changed

__all__ = [
    'ChecklistService',
    'ChecklistServiceProtocol',
    'OverrideService',
    'OverrideServiceProtocol',
    'TemplateSelectionService',
    'TemplateSelectionServiceProtocol',
    'TelemetryService',
    'TelemetryServiceProtocol',
    'has_definition_changed',
]
