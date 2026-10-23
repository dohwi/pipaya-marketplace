import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const ROOT = join(import.meta.dir, "..");
export const LISTING_FILE = join(ROOT, "marketplace.json");
export const INDEX_FILE = join(ROOT, "index.json");

/** What a maintainer writes: only where the extension lives. Everything else is read from the source. */
export type Listing = { id: string; kind?: "server" | "client"; path?: string; repo?: string; ref?: string; sha256?: string; commit?: string };
export type Listings = { name: string; description?: string; extensions: Listing[] };

/** What the app and the CLI read (generated into index.json). */
export type Source = { type: "path"; path: string } | { type: "url"; url: string; sha256: string } | { type: "git"; repo: string; ref: string; commit: string };
export type Entry = {
	id: string; kind: "server" | "client"; name: string; description: string; version: string;
	author?: string; license?: string; homepage?: string; source: Source;
};
export type Catalog = { name: string; description?: string; extensions: Entry[] };

export const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const REPO = /^[\w.-]+\/[\w.-]+$/;
export const REF = /^[\w][\w./-]*$/;
export const HEX64 = /^[0-9a-f]{64}$/;
export const HEX40 = /^[0-9a-f]{40}$/;

export const readJson = <T>(file: string): T => JSON.parse(readFileSync(file, "utf8"));
export const sha256Hex = (text: string) => new Bun.CryptoHasher("sha256").update(text).digest("hex");

/** Problems in the hand-written file; empty = valid. Works offline. */
export function validateListings(c: Listings, root = ROOT): string[] {
	const errs: string[] = [];
	const seen = new Set<string>();
	if (!c.name) errs.push("name is required");
	if (!Array.isArray(c.extensions)) return [...errs, "extensions must be an array"];
	for (const e of c.extensions) {
		const at = `extension "${e.id}"`;
		if (!ID.test(e.id ?? "")) errs.push(`${at}: id must be lowercase letters, digits and dashes`);
		if (seen.has(e.id)) errs.push(`${at}: duplicate id`);
		seen.add(e.id);
		if (!!e.path === !!e.repo) { errs.push(`${at}: give exactly one of "path" or "repo"`); continue; }
		if (e.path) {
			if (e.path.includes("..") || e.path.startsWith("/")) errs.push(`${at}: path must stay inside the repo`);
			else if (!existsSync(join(root, e.path, "package.json"))) errs.push(`${at}: ${e.path}/package.json is missing`);
			else if (!["index.ts", "index.js"].some((f) => existsSync(join(root, e.path!, f))) && !readFileSync(join(root, e.path, "package.json"), "utf8").includes('"extensions"')) errs.push(`${at}: ${e.path} has no index.ts or index.js`);
		} else {
			if (!REPO.test(e.repo!)) errs.push(`${at}: repo must be owner/name`);
			if (!e.ref || !REF.test(e.ref) || e.ref === "main" || e.ref === "master") errs.push(`${at}: ref must be a tag or commit, not a branch`);
			if (e.kind === "server") {
				// A server extension is the repository itself: pin the exact commit the tag points to.
				if (!HEX40.test(e.commit ?? "")) errs.push(`${at}: commit must be 40 lowercase hex characters (run scripts/pin.ts)`);
			} else if (!HEX64.test(e.sha256 ?? "")) errs.push(`${at}: sha256 must be 64 lowercase hex characters (run scripts/pin.ts)`);
		}
	}
	return errs;
}

export function loadIndex(): Catalog {
	return readJson<Catalog>(INDEX_FILE);
}
