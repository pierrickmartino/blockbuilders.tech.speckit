from __future__ import annotations

import hashlib
from typing import Iterable, Sequence

from app.schemas.ohlcv import Candle


class ChecksumHelper:
    """Generate deterministic checksums over sorted canonical candle rows."""

    def canonical_payload(self, candles: Iterable[Candle]) -> str:
        return "\n".join(
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
            for candle in sorted(candles, key=lambda c: (c.asset_symbol, c.interval.value, c.bucket_start))
        )

    def compute(self, candles: Sequence[Candle]) -> tuple[str, int]:
        payload = self.canonical_payload(candles).encode()
        digest = hashlib.sha256(payload).hexdigest()
        return digest, len(candles)


__all__ = ["ChecksumHelper"]
