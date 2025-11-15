"""Onboarding API latency harness.

Run via `uv run python apps/backend/tests/perf/onboarding_load_test.py`.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import math
import statistics
import time
from pathlib import Path
from typing import Iterable, List

import httpx

DEFAULT_THRESHOLD_MS = 200
DEFAULT_SAMPLES = 25
DEFAULT_CONCURRENCY = 5
DEFAULT_BASE_URL = "http://localhost:8000/api"
EVIDENCE_PATH = Path("docs/qa/onboarding-checklist/perf/onboarding-api-latency.json")


def percentile(values: Iterable[float], pct: float) -> float:
    ordered = sorted(values)
    if not ordered:
        raise ValueError("No latency samples captured")
    k = (len(ordered) - 1) * pct
    f = math.floor(k)
    c = math.ceil(k)
    if f == c:
        return ordered[int(k)]
    d0 = ordered[int(f)] * (c - k)
    d1 = ordered[int(c)] * (k - f)
    return d0 + d1


async def exercise_get_checklist(client: httpx.AsyncClient, endpoint: str) -> float:
    start = time.perf_counter()
    response = await client.get(endpoint)
    response.raise_for_status()
    return (time.perf_counter() - start) * 1000


async def collect_live_samples(base_url: str, samples: int, concurrency: int) -> List[float]:
    endpoint = f"{base_url.rstrip('/')}/onboarding/checklist"
    sem = asyncio.Semaphore(concurrency)
    results: List[float] = []

    async with httpx.AsyncClient(timeout=10.0) as client:
        async def worker() -> None:
            async with sem:
                latency = await exercise_get_checklist(client, endpoint)
                results.append(latency)

        await asyncio.gather(*[worker() for _ in range(samples)])

    return results


def load_fixture(path: Path) -> List[float]:
    payload = json.loads(path.read_text())
    if isinstance(payload, dict):
        data = payload.get("latenciesMs") or payload.get("samples")
    else:
        data = payload
    if not data:
        raise ValueError(f"Fixture {path} missing latency data")
    return [float(value) for value in data]


def write_summary(summary: dict, output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(summary, indent=2) + "\n")


async def main() -> None:
    parser = argparse.ArgumentParser(description="Onboarding API load validation")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--samples", type=int, default=DEFAULT_SAMPLES)
    parser.add_argument("--concurrency", type=int, default=DEFAULT_CONCURRENCY)
    parser.add_argument("--threshold-ms", type=float, default=DEFAULT_THRESHOLD_MS)
    parser.add_argument("--fixture", type=Path)
    parser.add_argument("--output", type=Path, default=EVIDENCE_PATH)
    args = parser.parse_args()

    if args.fixture:
        latency_samples = load_fixture(args.fixture.resolve())
        mode = "fixture"
        source = str(args.fixture)
    else:
        latency_samples = await collect_live_samples(
            base_url=args.base_url,
            samples=args.samples,
            concurrency=args.concurrency,
        )
        mode = "live"
        source = args.base_url

    if not latency_samples:
        raise RuntimeError("No latency measurements were gathered")

    p95 = percentile(latency_samples, 0.95)
    average = statistics.fmean(latency_samples)
    maximum = max(latency_samples)

    summary = {
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "mode": mode,
        "source": source,
        "thresholdMs": args.threshold_ms,
        "samples": len(latency_samples),
        "averageMs": round(average, 2),
        "p95Ms": round(p95, 2),
        "maxMs": round(maximum, 2),
        "latenciesMs": [round(value, 2) for value in latency_samples],
    }

    write_summary(summary, args.output.resolve())

    if p95 > args.threshold_ms:
        raise SystemExit(
            f"Onboarding API p95 latency {p95:.2f}ms exceeds threshold {args.threshold_ms}ms",
        )

    print(
        f"[onboarding-load-test] Captured {len(latency_samples)} samples. p95={p95:.2f}ms",
    )


if __name__ == "__main__":
    asyncio.run(main())
