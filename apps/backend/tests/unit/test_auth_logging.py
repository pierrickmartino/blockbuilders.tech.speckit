from __future__ import annotations

import logging

import pytest

from app.services.supabase.logging import LOGGER, log_auth_failure, log_auth_success
from app.telemetry import configure_auth_logging, get_auth_metrics, reset_auth_metrics


@pytest.fixture(autouse=True)
def _configure_auth_logging() -> None:
    configure_auth_logging(LOGGER)
    reset_auth_metrics()


def test_auth_success_logging_redacts_pii_and_tracks_metrics(caplog: pytest.LogCaptureFixture) -> None:
    with caplog.at_level(logging.INFO, logger=LOGGER.name):
        log_auth_success({"sub": "user-123", "email": "person@example.com"})

    assert caplog.records, "Expected an authentication log record to be emitted"
    record = caplog.records[-1]

    assert record.event == "supabase_auth_verified"
    assert record.channel == "backend"
    assert isinstance(record.email_hash, str) and record.email_hash.startswith("sha256:")
    assert record.user_id_hash.startswith("sha256:")
    assert getattr(record, "email", None) in (None, "")
    assert getattr(record, "user_id", None) in (None, "")
    assert record.pii == "redacted"

    metrics_snapshot = get_auth_metrics().snapshot()
    assert metrics_snapshot["successes"] == 1
    assert metrics_snapshot["failures"] == 0


def test_auth_failure_logging_redacts_identifiers_and_counts_reasons(caplog: pytest.LogCaptureFixture) -> None:
    with caplog.at_level(logging.WARNING, logger=LOGGER.name):
        log_auth_failure("jwt_decode_failed", user_id="user-123")

    assert caplog.records, "Expected an authentication failure log record"
    record = caplog.records[-1]

    assert record.event == "supabase_auth_failed"
    assert record.reason == "jwt_decode_failed"
    assert record.user_id_hash.startswith("sha256:")
    assert getattr(record, "user_id", None) in (None, "")
    assert record.pii == "redacted"

    metrics_snapshot = get_auth_metrics().snapshot()
    assert metrics_snapshot["failures"] == 1
    assert metrics_snapshot["failure_reasons"]["jwt_decode_failed"] == 1


def test_redaction_filter_strips_email_from_arbitrary_logs(caplog: pytest.LogCaptureFixture) -> None:
    with caplog.at_level(logging.INFO, logger=LOGGER.name):
        LOGGER.info(
            "manual auth log",
            extra={
                "event": "supabase_auth_verified",
                "email": "raw@example.com",
            },
        )

    record = caplog.records[-1]
    assert getattr(record, "email", None) in (None, "")
