#!/usr/bin/env bun
// Usage: bun scripts/bump.ts   move every listing to the newest `<id>-v<version>` tag of its repo, then rebuild index.json
//
// The release of an extension is its tag: once `<id>-v1.2.3` exists, this pins it (commit or sha256, same as pin.ts)
// and the catalog follows. CI runs it on a timer, so a maintainer only bumps the version in the extension's package.json.
import { writeFileSync } from "node:fs";
import { type Listing, type Listings, LISTING_FILE, INDEX_FILE, readJson, sha256Hex } from "./lib.ts";
import { buildIndex } from "./build-index.ts";

/** `1.2.3` or `1.2.3-rc.1` as comparable parts; null for anything else. Pre-releases are never picked. */
const semver = (v: string): number[] | null => {
	const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(v);
	return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
};
const newer = (a: number[], b: number[]) => a[0]! - b[0]! || a[1]! - b[1]! || a[2]! - b[2]!;

/** The newest release tag of `id` among `tags` (`<id>-v<x.y.z>`), or undefined. */
export function latestTag(id: string, tags: string[]): string | undefined {
	let best: { tag: string; v: number[] } | undefined;
	for (const tag of tags) {
		if (!tag.startsWith(`${id}-v`)) continue;
		const v = semver(tag.slice(id.length + 2));
		if (v && (!best || newer(v, best.v) > 0)) best = { tag, v };
	}
	return best?.tag;
}

/** The version a listing's ref names, when it is a release tag of its id. */
const refVersion = (l: Listing) => (l.ref.startsWith(`${l.id}-v`) ? semver(l.ref.slice(l.id.length + 2)) : null);

type Get = typeof fetch;

async function tagsOf(repo: string, id: string, get: Get, headers: Record<string, string>): Promise<string[]> {
	const r = await get(`https://api.github.com/repos/${repo}/git/matching-refs/tags/${id}-v`, { headers });
	if (!r.ok) throw new Error(`${id}: cannot list tags of ${repo} (${r.status})`);
	return ((await r.json()) as { ref: string }[]).map((t) => t.ref.replace(/^refs\/tags\//, ""));
}

/** Move each listing to its newest tag. Returns what moved (`id old -> new`); `src` is changed in place. */
export async function bump(src: Listings, o: { fetch?: Get; token?: string } = {}): Promise<string[]> {
	const get = o.fetch ?? fetch;
	const headers: Record<string, string> = { Accept: "application/vnd.github+json", ...(o.token ? { Authorization: `Bearer ${o.token}` } : {}) };
	const moved: string[] = [];
	for (const l of src.extensions) {
		const tag = latestTag(l.id, await tagsOf(l.repo, l.id, get, headers));
		const have = refVersion(l);
		const want = tag ? semver(tag.slice(l.id.length + 2)) : null;
		// Never move back, and leave a listing pinned to something other than a release tag alone.
		if (!tag || !want || !have || newer(want, have) <= 0) continue;
		if (l.kind === "server") {
			const r = await get(`https://api.github.com/repos/${l.repo}/commits/${tag}`, { headers });
			const sha = r.ok ? ((await r.json()) as { sha?: string }).sha : undefined;
			if (!sha) throw new Error(`${l.id}: cannot resolve ${l.repo}@${tag} (${r.status})`);
			l.commit = sha;
		} else {
			const url = `https://raw.githubusercontent.com/${l.repo}/${tag}/${l.dir ? `${l.dir}/` : ""}dist/${l.id}.json`;
			const r = await get(url);
			if (!r.ok) throw new Error(`${l.id}: cannot download ${url} (${r.status})`);
			l.sha256 = sha256Hex(await r.text());
		}
		moved.push(`${l.id} ${l.ref} -> ${tag}`);
		l.ref = tag;
	}
	return moved;
}

if (import.meta.main) {
	const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
	const src = readJson<Listings>(LISTING_FILE);
	const moved = await bump(src, { token });
	if (!moved.length) { console.log("every listing is on its newest tag"); process.exit(0); }
	// Build first: a tag whose package does not read stops here, before anything is written.
	const index = await buildIndex(src, { token });
	writeFileSync(LISTING_FILE, JSON.stringify(src, null, 2) + "\n");
	writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2) + "\n");
	console.log(moved.join("\n"));
}
