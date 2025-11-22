#!/usr/bin/env node
/*
 * Latency harness for /lineage endpoint.
 * Run with `node apps/backend/tests/perf/lineage_load.js --base-url http://localhost:8000 --samples 20 --concurrency 5 --threshold 200`.
 */

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';

const args = new URLSearchParams(process.argv.slice(2).join('&'));
const BASE_URL = args.get('base-url') || process.env.BASE_URL || 'http://localhost:8000';
const SAMPLES = Number(args.get('samples') || process.env.SAMPLES || 20);
const CONCURRENCY = Number(args.get('concurrency') || process.env.CONCURRENCY || 5);
const THRESHOLD = Number(args.get('threshold') || process.env.THRESHOLD_MS || 200);
const OUTPUT = args.get('output') || process.env.OUTPUT || 'docs/qa/ohlcv/perf/lineage-latency.json';
const ASSET = args.get('asset') || process.env.ASSET || 'BTC';
const INTERVAL = args.get('interval') || process.env.INTERVAL || 'minute';
const START = args.get('start') || process.env.START || '2025-01-01T00:00:00Z';
const END = args.get('end') || process.env.END || '2025-01-01T01:00:00Z';

const endpoint = `${BASE_URL.replace(/\/$/, '')}/lineage?asset=${encodeURIComponent(ASSET)}&interval=${INTERVAL}&start=${encodeURIComponent(START)}&end=${encodeURIComponent(END)}`;

async function hitOnce() {
  const start = performance.now();
  const res = await fetch(endpoint);
  const ms = performance.now() - start;
  if (!res.ok) {
    throw new Error(`Request failed (${res.status})`);
  }
  await res.json();
  return ms;
}

async function collectSamples() {
  const latencies = [];
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (latencies.length < SAMPLES) {
      latencies.push(await hitOnce());
    }
  });
  await Promise.all(workers);
  return latencies.slice(0, SAMPLES);
}

function percentile(values, pct) {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) throw new Error('No latency samples captured');
  const idx = (sorted.length - 1) * pct;
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
}

function writeSummary(latencies) {
  const p95 = percentile(latencies, 0.95);
  const average = latencies.reduce((sum, v) => sum + v, 0) / latencies.length;
  const summary = {
    generatedAt: new Date().toISOString(),
    source: endpoint,
    samples: latencies.length,
    thresholdMs: THRESHOLD,
    averageMs: Number(average.toFixed(2)),
    p95Ms: Number(p95.toFixed(2)),
    maxMs: Number(Math.max(...latencies).toFixed(2)),
    latenciesMs: latencies.map((v) => Number(v.toFixed(2))),
  };

  const outPath = resolve(OUTPUT);
  writeFileSync(outPath, JSON.stringify(summary, null, 2) + '\n');
  if (p95 > THRESHOLD) {
    throw new Error(`/lineage p95 ${p95.toFixed(2)}ms exceeds threshold ${THRESHOLD}ms`);
  }

  console.log(`[lineage-load] samples=${latencies.length} p95=${p95.toFixed(2)}ms avg=${average.toFixed(2)}ms`);
}

async function main() {
  const samples = await collectSamples();
  writeSummary(samples);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
