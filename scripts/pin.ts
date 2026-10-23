#!/usr/bin/env bun
// Usage: bun scripts/pin.ts <id> <ref>   point a client extension at a tag/commit and record its sha256
import { writeFileSync } from "node:fs";
import { LISTING_FILE, type Listings, readJson, sha256Hex } from "./lib.ts";

const [id, ref] = process.argv.slice(2);
const src = readJson<Listings>(LISTING_FILE);
const l = src.extensions.find((e) => e.id === id);
if (!l?.repo || !ref) { console.error("usage: pin.ts <id> <ref>  (id must be a repo-based entry)"); process.exit(1); }
const url = `https://raw.githubusercontent.com/${l.repo}/${ref}/dist/${id}.json`;
const res = await fetch(url);
if (!res.ok) { console.error(`cannot download ${url} (${res.status})`); process.exit(1); }
l.ref = ref;
l.sha256 = sha256Hex(await res.text());
writeFileSync(LISTING_FILE, JSON.stringify(src, null, 2) + "\n");
console.log(`${id} → ${ref} sha256 ${l.sha256}\nnow run: bun scripts/build-index.ts`);
