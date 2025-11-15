from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass, field
from typing import Any

from app.schemas.onboarding import TelemetryEvent, TelemetryEventType

LOGGER = logging.getLogger("app.telemetry.forwarder")


@dataclass
class TelemetryForwarder:
    """Lightweight Datadog forwarder stub that validates onboarding telemetry."""

    api_key: str | None = field(default=None)
    app_key: str | None = field(default=None)
    site: str = field(default="datadoghq.com")
    source: str = field(default="onboarding-checklist")

    def __post_init__(self) -> None:
        self.api_key = self.api_key or os.getenv("DATADOG_API_KEY")
        self.app_key = self.app_key or os.getenv("DATADOG_APP_KEY")
        self.site = os.getenv("DATADOG_SITE", self.site)
        self.source = os.getenv("DATADOG_FORWARDER_SOURCE", self.source)

    def forward(self, event: TelemetryEvent) -> dict[str, Any]:
        payload = self._normalise(event)
        LOGGER.info("onboarding_event_forwarded", extra={"payload": payload})
        # Real Datadog ingestion would occur here once credentials are configured.
        return payload

    def _normalise(self, event: TelemetryEvent) -> dict[str, Any]:
        record = {
            "eventType": event.event_type.value,
            "stepId": event.step_id,
            "templateId": str(event.template_id) if event.template_id else None,
            "metadata": event.metadata,
            "occurredAt": event.occurred_at.isoformat(),
            "clientContext": event.client_context,
            "source": self.source,
        }

        if event.event_type is TelemetryEventType.TEMPLATE_SELECTED and not event.template_id:
            raise ValueError("template_selected events require template_id")

        if event.event_type in {
            TelemetryEventType.OVERRIDE_PENDING_CLEARED,
            TelemetryEventType.BACKTEST_SUCCESS,
        }:
            workspace_id = event.metadata.get("workspaceId")
            if not workspace_id:
                raise ValueError(
                    f"{event.event_type.value} events require workspaceId metadata for Datadog context"
                )

        record["serialized"] = json.dumps(record, ensure_ascii=False)
        return record


__all__ = ["TelemetryForwarder"]
