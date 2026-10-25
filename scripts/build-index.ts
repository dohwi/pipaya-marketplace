#!/usr/bin/env bun
// Reads marketplace.json and each extension's own files, writes index.json.
//   bun scripts/build-index.ts           write index.json
//   bun scripts/build-index.ts --check   exit 1 when index.json is stale (CI)
// Name, version and description come from the extension (package.json or the client package's manifest);
// the license comes from the GitHub repository. Set GITHUB_TOKEN to avoid API rate limits.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { type Catalog, type Entry, ID, INDEX_FILE, LISTING_FILE, type Listings, ROOT, readJson, sha256Hex, validateListings } from "./lib.ts";

/** `pipaya.descriptions` of package.json: `{ "ko": "...", "en": "..." }`; anything malformed is dropped. */
const translations = (pkg: any): { descriptions?: Record<string, string> } => {
	const raw = pkg?.pipaya?.descriptions;
	if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
	const d = Object.fromEntries(Object.entries(raw).filter(([k, v]) => /^[A-Za-z]{2,3}(-[A-Za-z0-9]+)*$/.test(k) && typeof v === "string" && v.length > 0 && v.length <= 500));
	return Object.keys(d).length ? { descriptions: d as Record<string, string> } : {};
};

const authorName = (a: unknown) => (typeof a === "string" ? a : (a as { name?: string } | undefined)?.name);

export async function buildIndex(src: Listings, o: { root?: string; fetch?: typeof fetch; token?: string } = {}): Promise<Catalog> {
	const root = o.root ?? ROOT, get = o.fetch ?? fetch;
	const errs = validateListings(src, root);
	if (errs.length) throw new Error(errs.join("\n"));
	const extensions: Entry[] = [];
	for (const l of src.extensions) {
		const headers: Record<string, string> = { Accept: "application/vnd.github+json", ...(o.token ? { Authorization: `Bearer ${o.token}` } : {}) };
		if (l.kind === "server") {
			const at0 = l.dir ? `${l.dir}/` : "";
			const raw = await get(`https://raw.githubusercontent.com/${l.repo}/${l.ref}/${at0}package.json`);
			if (!raw.ok) throw new Error(`${l.id}: cannot read ${at0}package.json of ${l.repo}@${l.ref} (${raw.status})`);
			const pkg = JSON.parse(await raw.text());
			const at = await get(`https://api.github.com/repos/${l.repo}/commits/${l.ref}`, { headers });
			const sha = at.ok ? ((await at.json()) as { sha?: string }).sha : undefined;
			if (sha !== l.commit) throw new Error(`${l.id}: ${l.ref} points to ${sha ?? "an unknown commit"}, listed ${l.commit} (run scripts/pin.ts)`);
			extensions.push({
				id: l.id, kind: "server", name: pkg.pipaya?.title ?? pkg.name ?? l.id, description: pkg.description ?? "", ...translations(pkg), version: pkg.version,
				...(typeof pkg.pipaya?.companion === "string" && ID.test(pkg.pipaya.companion) && pkg.pipaya.companion.length <= 80 ? { companion: pkg.pipaya.companion } : {}),
				author: authorName(pkg.author) ?? l.repo!.split("/")[0], ...(pkg.license ? { license: pkg.license } : {}),
				homepage: `https://github.com/${l.repo}${l.dir ? `/tree/${l.ref}/${l.dir}` : ""}`, source: { type: "git", repo: l.repo!, ...(l.dir ? { dir: l.dir } : {}), ref: l.ref!, commit: l.commit! },
			});
			continue;
		}
		const url = `https://raw.githubusercontent.com/${l.repo}/${l.ref}/${l.dir ? `${l.dir}/` : ""}dist/${l.id}.json`;
		const res = await get(url);
		if (!res.ok) throw new Error(`${l.id}: cannot download ${url} (${res.status})`);
		const text = await res.text();
		const got = sha256Hex(text);
		if (got !== l.sha256) throw new Error(`${l.id}: sha256 mismatch (listed ${l.sha256}, got ${got})`);
		const m = JSON.parse(text).manifest;
		if (m?.id !== l.id) throw new Error(`${l.id}: package id is "${m?.id}"`);
		const pr = await get(`https://raw.githubusercontent.com/${l.repo}/${l.ref}/${l.dir ? `${l.dir}/` : ""}package.json`);
		let pkgJson: unknown;
		try { pkgJson = pr.ok ? JSON.parse(await pr.text()) : undefined; } catch { /* optional */ }
		const lr = await get(`https://api.github.com/repos/${l.repo}/license?ref=${l.ref}`, { headers });
		const spdx = lr.ok ? ((await lr.json()) as { license?: { spdx_id?: string } }).license?.spdx_id : undefined;
		extensions.push({
			id: l.id, kind: "client", name: m.name, description: m.description ?? "", ...translations(pkgJson), version: m.version,
			author: l.repo!.split("/")[0], ...(spdx && spdx !== "NOASSERTION" ? { license: spdx } : {}),
			homepage: `https://github.com/${l.repo}${l.dir ? `/tree/${l.ref}/${l.dir}` : ""}`, source: { type: "url", url, sha256: l.sha256! },
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
