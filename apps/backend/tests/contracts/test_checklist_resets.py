from __future__ import annotations

from app.services.onboarding import has_definition_changed


def test_definition_changed_when_versions_diverge() -> None:
    assert has_definition_changed(active_version=2, user_version=1) is True


def test_definition_unchanged_when_versions_match() -> None:
    assert has_definition_changed(active_version=2, user_version=2) is False


def test_definition_unchanged_when_user_has_no_progress() -> None:
    assert has_definition_changed(active_version=2, user_version=None) is False
