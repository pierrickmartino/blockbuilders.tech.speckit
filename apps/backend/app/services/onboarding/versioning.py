from __future__ import annotations

from typing import Optional


def has_definition_changed(active_version: int, user_version: Optional[int]) -> bool:
    """Return True when the stored user version differs from the active checklist version."""

    if user_version is None:
        return False

    return user_version != active_version


__all__ = ['has_definition_changed']
