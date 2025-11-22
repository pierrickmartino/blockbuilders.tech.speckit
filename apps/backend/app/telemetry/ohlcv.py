from __future__ import annotations

from dataclasses import dataclass, field
from functools import lru_cache
from typing import Any


@dataclass
class IngestionMetrics:
    """Aggregate ingestion run metrics for Datadog export and local assertions."""

    runs_total: int = 0
    successes: int = 0
    failures: int = 0
    rows_total: int = 0
    last_duration_ms: float | None = None
    last_lag_minutes: float | None = None
    last_tags: dict[str, str] = field(default_factory=dict)
    recent: list[dict[str, Any]] = field(default_factory=list)

    def record_run(
        self,
        *,
        status: str,
        interval: str,
        trigger: str,
        rows: int,
        duration_ms: float,
        lag_minutes: float | None,
        asset_symbol: str = "*",
        error_summary: str | None = None,
    ) -> None:
        self.runs_total += 1
        if status == "success":
            self.successes += 1
        else:
            self.failures += 1

        self.rows_total += rows
        self.last_duration_ms = duration_ms
        self.last_lag_minutes = lag_minutes
        self.last_tags = {
            "interval": interval,
            "trigger": trigger,
            "asset_symbol": asset_symbol,
            "status": status,
        }

        self.recent.append(
            {
                "status": status,
                "interval": interval,
                "trigger": trigger,
                "rows": rows,
                "duration_ms": duration_ms,
                "lag_minutes": lag_minutes,
                "asset_symbol": asset_symbol,
                "error_summary": error_summary,
            }
        )
        # keep last 50 entries to avoid unbounded growth
        if len(self.recent) > 50:
            self.recent = self.recent[-50:]

    def snapshot(self) -> dict[str, Any]:
        return {
            "runs_total": self.runs_total,
            "successes": self.successes,
            "failures": self.failures,
            "rows_total": self.rows_total,
            "last_duration_ms": self.last_duration_ms,
            "last_lag_minutes": self.last_lag_minutes,
            "last_tags": dict(self.last_tags),
            "recent": list(self.recent),
        }

    def reset(self) -> None:
        self.runs_total = 0
        self.successes = 0
        self.failures = 0
        self.rows_total = 0
        self.last_duration_ms = None
        self.last_lag_minutes = None
        self.last_tags.clear()
        self.recent.clear()


@dataclass
class FreshnessMetrics:
    """Track freshness lag samples and alert churn for dashboards."""

    lag_samples: list[dict[str, Any]] = field(default_factory=list)
    alerts_created: int = 0
    alerts_cleared: int = 0
    alerts_open: int = 0

    def record_lag(self, *, asset: str, interval: str, lag_minutes: float) -> None:
        self.lag_samples.append({"asset": asset, "interval": interval, "lag_minutes": lag_minutes})
        if len(self.lag_samples) > 200:
            self.lag_samples = self.lag_samples[-200:]

    def record_alerts(self, *, created: int, cleared: int) -> None:
        self.alerts_created += created
        self.alerts_cleared += cleared
        self.alerts_open = max(0, self.alerts_open + created - cleared)

    def snapshot(self) -> dict[str, Any]:
        max_lag = max((sample["lag_minutes"] for sample in self.lag_samples), default=None)
        return {
            "alerts_created": self.alerts_created,
            "alerts_cleared": self.alerts_cleared,
            "alerts_open": self.alerts_open,
            "lag_samples": list(self.lag_samples),
            "max_lag_minutes": max_lag,
        }

    def reset(self) -> None:
        self.lag_samples.clear()
        self.alerts_created = 0
        self.alerts_cleared = 0
        self.alerts_open = 0


@lru_cache(maxsize=1)
def get_ingestion_metrics() -> IngestionMetrics:
    return IngestionMetrics()


@lru_cache(maxsize=1)
def get_freshness_metrics() -> FreshnessMetrics:
    return FreshnessMetrics()


def reset_ingestion_metrics() -> None:
    get_ingestion_metrics().reset()


def reset_freshness_metrics() -> None:
    get_freshness_metrics().reset()


__all__ = [
    "FreshnessMetrics",
    "IngestionMetrics",
    "get_freshness_metrics",
    "get_ingestion_metrics",
    "reset_freshness_metrics",
    "reset_ingestion_metrics",
]
