from __future__ import annotations

import re
from collections.abc import Mapping
from dataclasses import dataclass
from functools import cache
from pathlib import Path

DEFAULT_LOCALE = "en-US"
DEFAULT_EVIDENCE_LINK = "docs/qa/onboarding-checklist.md"


@dataclass(frozen=True)
class LocaleApprovalStatus:
    locale: str
    approved: bool
    reviewer: str | None = None
    role: str | None = None
    decision_date: str | None = None
    evidence_link: str | None = None

    @property
    def status(self) -> str:
        return "approved" if self.approved else "pending"

    @property
    def message(self) -> str:
        if self.approved:
            reviewer = f" by {self.reviewer}" if self.reviewer else ""
            decision = f" on {self.decision_date}" if self.decision_date else ""
            return f"Locale {self.locale} approved{reviewer}{decision}."
        return f"Locale {self.locale} is awaiting legal approval."


class LocaleApprovalRegistry:
    def __init__(self, approvals: Mapping[str, LocaleApprovalStatus]) -> None:
        self._approvals: dict[str, LocaleApprovalStatus] = dict(approvals)

    def get_status(self, locale: str | None) -> LocaleApprovalStatus:
        normalized = (locale or DEFAULT_LOCALE).strip() or DEFAULT_LOCALE
        status = self._approvals.get(normalized)
        if status:
            return status
        return LocaleApprovalStatus(
            locale=normalized,
            approved=False,
            evidence_link=DEFAULT_EVIDENCE_LINK,
        )


def _repo_root() -> Path:
    current = Path(__file__).resolve()
    for parent in current.parents:
        if (parent / ".git").exists():
            return parent
    return current.parents[-1]


def _load_locale_rows() -> dict[str, LocaleApprovalStatus]:
    approval_doc = _repo_root() / "docs" / "qa" / "onboarding-checklist.md"
    if not approval_doc.exists():
        return {}

    content = approval_doc.read_text(encoding="utf-8")
    pattern = re.compile(r"^\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|")
    approvals: dict[str, LocaleApprovalStatus] = {}

    for raw_line in content.splitlines():
        line = raw_line.strip()
        if not line.startswith("|"):
            continue
        match = pattern.match(line)
        if not match:
            continue
        locale = match.group(1).strip()
        if locale.lower() == "locale":
            continue
        reviewer = match.group(2).strip() or None
        role = match.group(3).strip() or None
        decision_date = match.group(4).strip() or None
        evidence = match.group(5).strip()
        if evidence.startswith("`") and evidence.endswith("`"):
            evidence = evidence[1:-1]
        evidence = evidence or DEFAULT_EVIDENCE_LINK
        approvals[locale] = LocaleApprovalStatus(
            locale=locale,
            approved=bool(reviewer and decision_date),
            reviewer=reviewer,
            role=role,
            decision_date=decision_date,
            evidence_link=evidence,
        )

    return approvals


@cache
def get_locale_registry() -> LocaleApprovalRegistry:
    approvals = _load_locale_rows()
    if not approvals:
        approvals = {
            DEFAULT_LOCALE: LocaleApprovalStatus(
                locale=DEFAULT_LOCALE,
                approved=True,
                reviewer="Default reviewer",
                role="Legal",
                decision_date=None,
                evidence_link=DEFAULT_EVIDENCE_LINK,
            ),
        }
    return LocaleApprovalRegistry(approvals)


__all__ = ["LocaleApprovalRegistry", "LocaleApprovalStatus", "get_locale_registry"]
