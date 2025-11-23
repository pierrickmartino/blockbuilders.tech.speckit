"""Deterministic OHLCV dataset for ingestion/backfill tests and dev tooling.

Re-uses the same deterministic timestamps and prices so checksum expectations
stay stable across environments. Two buckets per asset per interval keep
payloads small while exercising multi-asset aggregation.
"""

from __future__ import annotations

import hashlib
from collections.abc import Iterable
from datetime import UTC, datetime, timedelta
from decimal import Decimal

from app.config import ASSET_SYMBOLS
from app.schemas.ohlcv import Candle, Interval

START_DAY = datetime(2024, 1, 1, tzinfo=UTC)
START_MINUTE = datetime(2024, 2, 1, tzinfo=UTC)


def _canonical_payload(candles: Iterable[Candle]) -> str:
    parts: list[str] = []
    for candle in sorted(
        candles,
        key=lambda c: (c.asset_symbol, c.interval.value, c.bucket_start),
    ):
        parts.append(
            "|".join(
                [
                    candle.asset_symbol,
                    candle.interval.value,
                    candle.bucket_start.isoformat(),
                    str(candle.open),
                    str(candle.high),
                    str(candle.low),
                    str(candle.close),
                    str(candle.volume),
                ]
            )
        )
    return "\n".join(parts)


def _checksum(candles: Iterable[Candle]) -> str:
    payload = _canonical_payload(candles).encode()
    return hashlib.sha256(payload).hexdigest()


def make_day_candles() -> tuple[Candle, ...]:
    candles: list[Candle] = []
    for idx, asset in enumerate(ASSET_SYMBOLS):
        base = Decimal(100 + idx)
        for offset in range(2):
            bucket = START_DAY + timedelta(days=offset)
            candles.append(
                Candle(
                    asset_symbol=asset,
                    bucket_start=bucket,
                    interval=Interval.DAY,
                    open=base + Decimal(offset),
                    high=base + Decimal(offset) + Decimal("1.5"),
                    low=base + Decimal(offset) - Decimal("0.5"),
                    close=base + Decimal(offset) + Decimal("0.75"),
                    volume=Decimal("1000.0") + Decimal(idx * 10 + offset),
                    source_vendor="seed-vendor",
                    fetched_at=bucket + timedelta(hours=1),
                )
            )
    return tuple(candles)


def make_minute_candles() -> tuple[Candle, ...]:
    candles: list[Candle] = []
    for idx, asset in enumerate(ASSET_SYMBOLS):
        base = Decimal(200 + idx)
        for offset in range(2):
            bucket = START_MINUTE + timedelta(minutes=offset)
            candles.append(
                Candle(
                    asset_symbol=asset,
                    bucket_start=bucket,
                    interval=Interval.MINUTE,
                    open=base + Decimal(offset),
                    high=base + Decimal(offset) + Decimal("0.8"),
                    low=base + Decimal(offset) - Decimal("0.3"),
                    close=base + Decimal(offset) + Decimal("0.4"),
                    volume=Decimal("250.0") + Decimal(idx * 5 + offset),
                    source_vendor="seed-vendor",
                    fetched_at=bucket + timedelta(seconds=30),
                )
            )
    return tuple(candles)

SEED_CANDLES: dict[Interval, tuple[Candle, ...]] = {
    Interval.DAY: make_day_candles(),
    Interval.MINUTE: make_minute_candles(),
}

EXPECTED_ROW_COUNTS = {
    Interval.DAY: len(SEED_CANDLES[Interval.DAY]),
    Interval.MINUTE: len(SEED_CANDLES[Interval.MINUTE]),
}

# Pre-computed deterministic hashes for regression protection
EXPECTED_CHECKSUMS = {
    Interval.DAY: _checksum(SEED_CANDLES[Interval.DAY]),
    Interval.MINUTE: _checksum(SEED_CANDLES[Interval.MINUTE]),
}

__all__ = [
    "EXPECTED_CHECKSUMS",
    "EXPECTED_ROW_COUNTS",
    "SEED_CANDLES",
    "make_day_candles",
    "make_minute_candles",
]
