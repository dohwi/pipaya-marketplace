#!/usr/bin/env bun
// Usage: bun scripts/pin.ts <id> <ref>   point a client extension at a tag/commit and record its sha256
import { writeFileSync } from "node:fs";
import { LISTING_FILE, type Listings, readJson, sha256Hex } from "./lib.ts";

const [id, ref] = process.argv.slice(2);
const src = readJson<Listings>(LISTING_FILE);
const l = src.extensions.find((e) => e.id === id);
if (!l?.repo || !ref) { console.error("usage: pin.ts <id> <ref>  (id must be a repo-based entry)"); process.exit(1); }
if (l.kind === "server") {
	// the tag is only a name: record the commit it points to now, so a moved tag is caught
	const headers: Record<string, string> = { Accept: "application/vnd.github+json", ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) };
	const r = await fetch(`https://api.github.com/repos/${l.repo}/commits/${ref}`, { headers });
	const sha = r.ok ? ((await r.json()) as { sha?: string }).sha : undefined;
	if (!sha) { console.error(`cannot resolve ${l.repo}@${ref} (${r.status})`); process.exit(1); }
	l.ref = ref;
	l.commit = sha;
	writeFileSync(LISTING_FILE, JSON.stringify(src, null, 2) + "\n");
	console.log(`${id} → ${ref} commit ${sha}\nnow run: bun scripts/build-index.ts`);
	process.exit(0);
}
const url = `https://raw.githubusercontent.com/${l.repo}/${ref}/${l.dir ? `${l.dir}/` : ""}dist/${id}.json`;
const res = await fetch(url);
if (!res.ok) { console.error(`cannot download ${url} (${res.status})`); process.exit(1); }
l.ref = ref;
l.sha256 = sha256Hex(await res.text());
writeFileSync(LISTING_FILE, JSON.stringify(src, null, 2) + "\n");
console.log(`${id} → ${ref} sha256 ${l.sha256}\nnow run: bun scripts/build-index.ts`);
