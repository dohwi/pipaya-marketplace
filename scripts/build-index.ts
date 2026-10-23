#!/usr/bin/env bun
// Reads marketplace.json and each extension's own files, writes index.json.
//   bun scripts/build-index.ts           write index.json
//   bun scripts/build-index.ts --check   exit 1 when index.json is stale (CI)
// Name, version and description come from the extension (package.json or the client package's manifest);
// the license comes from the GitHub repository. Set GITHUB_TOKEN to avoid API rate limits.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { type Catalog, type Entry, INDEX_FILE, LISTING_FILE, type Listings, ROOT, readJson, sha256Hex, validateListings } from "./lib.ts";

const authorName = (a: unknown) => (typeof a === "string" ? a : (a as { name?: string } | undefined)?.name);

export async function buildIndex(src: Listings, o: { root?: string; fetch?: typeof fetch; token?: string } = {}): Promise<Catalog> {
	const root = o.root ?? ROOT, get = o.fetch ?? fetch;
	const errs = validateListings(src, root);
	if (errs.length) throw new Error(errs.join("\n"));
	const extensions: Entry[] = [];
	for (const l of src.extensions) {
		if (l.path) {
			const pkg = JSON.parse(readFileSync(join(root, l.path, "package.json"), "utf8"));
			extensions.push({
				id: l.id, kind: "server", name: pkg.pipaya?.title ?? pkg.name ?? l.id, description: pkg.description ?? "", version: pkg.version,
				...(authorName(pkg.author) ? { author: authorName(pkg.author) } : {}), ...(pkg.license ? { license: pkg.license } : {}),
				source: { type: "path", path: l.path },
			});
			continue;
		}
		const url = `https://raw.githubusercontent.com/${l.repo}/${l.ref}/dist/${l.id}.json`;
		const res = await get(url);
		if (!res.ok) throw new Error(`${l.id}: cannot download ${url} (${res.status})`);
		const text = await res.text();
		const got = sha256Hex(text);
		if (got !== l.sha256) throw new Error(`${l.id}: sha256 mismatch (listed ${l.sha256}, got ${got})`);
		const m = JSON.parse(text).manifest;
		if (m?.id !== l.id) throw new Error(`${l.id}: package id is "${m?.id}"`);
		const headers: Record<string, string> = { Accept: "application/vnd.github+json", ...(o.token ? { Authorization: `Bearer ${o.token}` } : {}) };
		const lr = await get(`https://api.github.com/repos/${l.repo}/license?ref=${l.ref}`, { headers });
		const spdx = lr.ok ? ((await lr.json()) as { license?: { spdx_id?: string } }).license?.spdx_id : undefined;
		extensions.push({
			id: l.id, kind: "client", name: m.name, description: m.description ?? "", version: m.version,
			author: l.repo!.split("/")[0], ...(spdx && spdx !== "NOASSERTION" ? { license: spdx } : {}),
			homepage: `https://github.com/${l.repo}`, source: { type: "url", url, sha256: l.sha256! },
		});
	}
	return { name: src.name, ...(src.description ? { description: src.description } : {}), extensions };
}

if (import.meta.main) {
	const next = JSON.stringify(await buildIndex(readJson<Listings>(LISTING_FILE), { token: process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN }), null, 2) + "\n";
	if (process.argv.includes("--check")) {
		let cur = "";
		try { cur = readFileSync(INDEX_FILE, "utf8"); } catch { /* missing */ }
		if (cur !== next) { console.error("index.json is stale: run `bun scripts/build-index.ts` and commit it"); process.exit(1); }
		console.log("index.json up to date");
	} else {
		writeFileSync(INDEX_FILE, next);
		console.log("wrote index.json");
	}
}
