from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Dict


@dataclass
class AuthMetrics:
    """Track aggregated Supabase authentication metrics for observability."""

    successes: int = 0
    failures: int = 0
    failure_reasons: Dict[str, int] = field(default_factory=dict)

    def record_success(self) -> None:
        self.successes += 1

    def record_failure(self, reason: str) -> None:
        self.failures += 1
        self.failure_reasons[reason] = self.failure_reasons.get(reason, 0) + 1

    def snapshot(self) -> Dict[str, object]:
        return {
            "successes": self.successes,
            "failures": self.failures,
            "failure_reasons": dict(self.failure_reasons),
        }

    def reset(self) -> None:
        self.successes = 0
        self.failures = 0
        self.failure_reasons.clear()


class AuthMetricsHandler(logging.Handler):
    """Logging handler that updates aggregated authentication metrics."""

    def __init__(self, metrics: AuthMetrics) -> None:
        super().__init__(level=logging.INFO)
        self._metrics = metrics

    def emit(self, record: logging.LogRecord) -> None:  # pragma: no cover - thin shim
        event = getattr(record, "event", None)

        if event == "supabase_auth_verified":
            self._metrics.record_success()
            return

        if event == "supabase_auth_failed":
            reason = getattr(record, "reason", "unknown") or "unknown"
            self._metrics.record_failure(str(reason))


class AuthRedactionFilter(logging.Filter):
    """Remove PII fields from Supabase auth log records before they emit."""

    BLOCKED_ATTRIBUTES = {
        "email",
        "user_email",
        "user",
        "user_id",
        "access_token",
        "refresh_token",
    }

    def filter(self, record: logging.LogRecord) -> bool:  # pragma: no cover - thin shim
        for attribute in self.BLOCKED_ATTRIBUTES:
            if hasattr(record, attribute):
                setattr(record, attribute, None)
        return True


_AUTH_METRICS: AuthMetrics | None = None


def get_auth_metrics() -> AuthMetrics:
    """Return the shared authentication metrics container."""

    global _AUTH_METRICS
    if _AUTH_METRICS is None:
        _AUTH_METRICS = AuthMetrics()
    return _AUTH_METRICS


def reset_auth_metrics() -> None:
    """Reset the recorded authentication metrics (primarily for testing)."""

    get_auth_metrics().reset()


def configure_auth_logging(logger: logging.Logger) -> AuthMetrics:
    """Attach metrics and redaction safeguards to the supplied logger."""

    metrics = get_auth_metrics()

    if not any(isinstance(handler, AuthMetricsHandler) for handler in logger.handlers):
        logger.addHandler(AuthMetricsHandler(metrics))

    if not any(isinstance(flt, AuthRedactionFilter) for flt in logger.filters):
        logger.addFilter(AuthRedactionFilter())

    if logger.level == logging.NOTSET:
        logger.setLevel(logging.INFO)

    return metrics


__all__ = [
    "AuthMetrics",
    "AuthMetricsHandler",
    "AuthRedactionFilter",
    "configure_auth_logging",
    "get_auth_metrics",
    "reset_auth_metrics",
]
