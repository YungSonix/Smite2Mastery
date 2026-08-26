#!/usr/bin/env node
/**
 * Pure-JS ability SFX similarity (duration, RMS, ZCR, coarse spectral bands).
 *
 * Usage:
 *   node scripts/analyze-ability-sfx-similarity.mjs [--shard=0] [--shards=2] [--top=8]
 *
 * Writes artifacts/sfx-sim/part-{shard}.json
 * Neighbors are ranked against the full catalog (all shards' clips).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CATALOG = path.join(ROOT, 'formative-web/src/lib/triviaMediaCatalog.json');
const OUT_DIR = path.join(ROOT, 'artifacts/sfx-sim');
const VOICE_ROOT = path.join(ROOT, 'app/data/VoiceAudio');

const TOP_K = 8;
const MAX_ANALYZE_SEC = 2.5;
const SPECTRAL_TARGET_RATE = 4000;
const BAND_EDGES_HZ = [0, 200, 500, 1000, 2000];

function parseArgs(argv) {
  let shard = 0;
  let shards = 1;
  let top = TOP_K;
  for (const a of argv) {
    const mShard = a.match(/^--shard=(\d+)$/);
    const mShards = a.match(/^--shards=(\d+)$/);
    const mTop = a.match(/^--top=(\d+)$/);
    if (mShard) shard = Number(mShard[1]);
    if (mShards) shards = Math.max(1, Number(mShards[1]));
    if (mTop) top = Math.max(1, Number(mTop[1]));
  }
  if (!Number.isFinite(shard) || shard < 0) shard = 0;
  if (shard >= shards) {
    console.error(`shard ${shard} out of range for shards=${shards}`);
    process.exit(1);
  }
  return { shard, shards, top };
}

function urlToFsPath(url) {
  const u = String(url || '');
  const marker = '/VoiceAudio/';
  const idx = u.indexOf(marker);
  if (idx < 0) return null;
  const rel = decodeURIComponent(u.slice(idx + marker.length).replace(/\//g, path.sep));
  return path.join(VOICE_ROOT, rel);
}

function readWavPcm(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.length < 44 || buf.toString('ascii', 0, 4) !== 'RIFF') {
    throw new Error('not RIFF');
  }
  let offset = 12;
  let sampleRate = 0;
  let channels = 0;
  let bitsPerSample = 0;
  let audioFormat = 1;
  let dataOffset = -1;
  let dataSize = 0;

  while (offset + 8 <= buf.length) {
    const id = buf.toString('ascii', offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;
    if (id === 'fmt ') {
      audioFormat = buf.readUInt16LE(chunkStart);
      channels = buf.readUInt16LE(chunkStart + 2);
      sampleRate = buf.readUInt32LE(chunkStart + 4);
      bitsPerSample = buf.readUInt16LE(chunkStart + 14);
    } else if (id === 'data') {
      dataOffset = chunkStart;
      dataSize = size;
      break;
    }
    offset = chunkStart + size + (size % 2);
  }

  if (dataOffset < 0 || !sampleRate || !channels) {
    throw new Error('missing fmt/data');
  }
  if (audioFormat !== 1 && audioFormat !== 3) {
    throw new Error(`unsupported format ${audioFormat}`);
  }

  const maxSamplesTotal = Math.floor(sampleRate * MAX_ANALYZE_SEC) * channels;
  const bytesPerSample = bitsPerSample / 8;
  if (![1, 2, 4].includes(bytesPerSample)) {
    throw new Error(`unsupported bits ${bitsPerSample}`);
  }
  const available = Math.floor(dataSize / bytesPerSample);
  const n = Math.min(available, maxSamplesTotal);
  const mono = new Float32Array(Math.floor(n / channels) || 0);

  for (let i = 0, m = 0; m < mono.length; m++) {
    let sum = 0;
    for (let c = 0; c < channels; c++, i++) {
      const o = dataOffset + i * bytesPerSample;
      let s = 0;
      if (audioFormat === 3 && bitsPerSample === 32) {
        s = buf.readFloatLE(o);
      } else if (bitsPerSample === 16) {
        s = buf.readInt16LE(o) / 32768;
      } else if (bitsPerSample === 8) {
        s = (buf.readUInt8(o) - 128) / 128;
      } else if (bitsPerSample === 32) {
        s = buf.readInt32LE(o) / 2147483648;
      } else {
        throw new Error(`unsupported pcm ${bitsPerSample}`);
      }
      sum += s;
    }
    mono[m] = sum / channels;
  }

  return { sampleRate, samples: mono };
}

function downsample(samples, sampleRate, targetRate) {
  if (sampleRate <= targetRate) return { samples, rate: sampleRate };
  const step = sampleRate / targetRate;
  const outLen = Math.floor(samples.length / step);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const start = Math.floor(i * step);
    const end = Math.min(samples.length, Math.floor((i + 1) * step));
    let sum = 0;
    for (let j = start; j < end; j++) sum += samples[j];
    out[i] = sum / Math.max(1, end - start);
  }
  return { samples: out, rate: targetRate };
}

/** Goertzel magnitude at one frequency (pure JS, O(n) per bin). */
function goertzelMag(samples, rate, freqHz) {
  const n = samples.length;
  if (n < 16 || freqHz <= 0 || freqHz >= rate / 2) return 0;
  const w = (2 * Math.PI * freqHz) / rate;
  const coeff = 2 * Math.cos(w);
  let s0 = 0;
  let s1 = 0;
  let s2 = 0;
  for (let i = 0; i < n; i++) {
    s0 = samples[i] + coeff * s1 - s2;
    s2 = s1;
    s1 = s0;
  }
  const power = s1 * s1 + s2 * s2 - coeff * s1 * s2;
  return Math.sqrt(Math.max(0, power)) / n;
}

function bandEnergies(samples, rate) {
  const n = Math.min(samples.length, 4096);
  if (n < 32) return BAND_EDGES_HZ.slice(0, -1).map(() => 0);
  const slice = samples.length === n ? samples : samples.subarray(0, n);
  const bands = [];
  for (let b = 0; b < BAND_EDGES_HZ.length - 1; b++) {
    const mid = (BAND_EDGES_HZ[b] + BAND_EDGES_HZ[b + 1]) / 2;
    // Two probe freqs per band for a bit more stability
    const lo = BAND_EDGES_HZ[b] * 0.75 + BAND_EDGES_HZ[b + 1] * 0.25;
    const hi = BAND_EDGES_HZ[b] * 0.25 + BAND_EDGES_HZ[b + 1] * 0.75;
    const e =
      (goertzelMag(slice, rate, mid) +
        goertzelMag(slice, rate, lo) +
        goertzelMag(slice, rate, hi)) /
      3;
    bands.push(e);
  }
  return bands;
}

function extractFeatures(filePath) {
  const { sampleRate, samples } = readWavPcm(filePath);
  if (!samples.length) throw new Error('empty pcm');

  let sumSq = 0;
  let peak = 0;
  let zc = 0;
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    sumSq += s * s;
    const a = Math.abs(s);
    if (a > peak) peak = a;
    if (i > 0 && ((samples[i - 1] >= 0 && s < 0) || (samples[i - 1] < 0 && s >= 0))) zc++;
  }
  const rms = Math.sqrt(sumSq / samples.length);
  const duration = samples.length / sampleRate;
  const zcr = zc / samples.length;

  const { samples: ds, rate } = downsample(samples, sampleRate, SPECTRAL_TARGET_RATE);
  const bands = bandEnergies(ds, rate);
  const bandSum = bands.reduce((a, b) => a + b, 0) || 1;
  const bandNorm = bands.map((b) => b / bandSum);

  // Rough spectral centroid in Hz from band midpoints
  let centroid = 0;
  for (let i = 0; i < bands.length; i++) {
    const mid = (BAND_EDGES_HZ[i] + BAND_EDGES_HZ[i + 1]) / 2;
    centroid += bandNorm[i] * mid;
  }

  return {
    duration,
    rms,
    peak,
    zcr,
    centroid,
    bands: bandNorm,
  };
}

function featureVector(f) {
  return [
    Math.log1p(f.duration),
    f.rms,
    f.peak,
    f.zcr * 10,
    f.centroid / 2000,
    ...f.bands,
  ];
}

function dist(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    s += d * d;
  }
  return Math.sqrt(s);
}

function clipMeta(row) {
  return {
    id: row.id,
    kind: row.kind,
    god: row.god,
    ability: row.ability,
    slot: row.slot,
    slots: row.slots,
    skin: row.skin,
    skinFolder: row.skinFolder,
    file: row.file,
    url: row.url,
    label: row.label,
  };
}

function main() {
  const { shard, shards, top } = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(CATALOG)) {
    console.error(`Missing catalog: ${CATALOG}`);
    process.exit(1);
  }
  const catalog = JSON.parse(fs.readFileSync(CATALOG, 'utf8'));
  const clips = Array.isArray(catalog.abilitySounds) ? [...catalog.abilitySounds] : [];
  clips.sort((a, b) => String(a.url || '').localeCompare(String(b.url || '')));

  const shardSize = Math.ceil(clips.length / shards) || 0;
  const start = shard * shardSize;
  const end = Math.min(clips.length, start + shardSize);
  const shardClips = clips.slice(start, end);

  console.log(
    `Catalog ${clips.length} clips; shard ${shard}/${shards} → indices [${start}, ${end}) = ${shardClips.length}`
  );

  const skipped = [];
  const analyzed = []; // { meta, vec, features }

  // Feature all clips so neighbors can cross shard boundaries
  for (let i = 0; i < clips.length; i++) {
    const row = clips[i];
    const fsPath = urlToFsPath(row.url);
    if (!fsPath || !fs.existsSync(fsPath)) {
      skipped.push({ id: row.id, url: row.url, reason: 'missing_file' });
      continue;
    }
    try {
      const features = extractFeatures(fsPath);
      analyzed.push({
        index: i,
        meta: clipMeta(row),
        features,
        vec: featureVector(features),
      });
    } catch (err) {
      skipped.push({
        id: row.id,
        url: row.url,
        reason: String(err?.message || err),
      });
    }
    if ((i + 1) % 50 === 0 || i + 1 === clips.length) {
      console.log(`  features ${i + 1}/${clips.length} (ok=${analyzed.length}, skip=${skipped.length})`);
    }
  }

  const byIndex = new Map(analyzed.map((a) => [a.index, a]));
  const results = [];
  for (let i = start; i < end; i++) {
    const self = byIndex.get(i);
    if (!self) continue;
    const neighbors = [];
    for (const other of analyzed) {
      if (other.index === self.index) continue;
      neighbors.push({
        ...other.meta,
        distance: dist(self.vec, other.vec),
      });
    }
    neighbors.sort((a, b) => a.distance - b.distance || String(a.url).localeCompare(String(b.url)));
    results.push({
      ...self.meta,
      features: {
        duration: Number(self.features.duration.toFixed(4)),
        rms: Number(self.features.rms.toFixed(5)),
        peak: Number(self.features.peak.toFixed(5)),
        zcr: Number(self.features.zcr.toFixed(5)),
        centroid: Number(self.features.centroid.toFixed(1)),
        bands: self.features.bands.map((x) => Number(x.toFixed(4))),
      },
      neighbors: neighbors.slice(0, top).map((n) => ({
        id: n.id,
        kind: n.kind,
        god: n.god,
        ability: n.ability,
        slot: n.slot,
        url: n.url,
        label: n.label,
        distance: Number(n.distance.toFixed(5)),
      })),
    });
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, `part-${shard}.json`);
  const payload = {
    generatedAt: new Date().toISOString(),
    shard,
    shards,
    top,
    catalogTotal: clips.length,
    shardRange: [start, end],
    analyzedInShard: results.length,
    featuresComputed: analyzed.length,
    skipped,
    results,
  };
  fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Wrote ${results.length} results → ${outPath}`);
}

main();
