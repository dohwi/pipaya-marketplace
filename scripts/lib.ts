import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const ROOT = join(import.meta.dir, "..");
export type Source = { type: "path"; path: string } | { type: "url"; url: string; sha256?: string };
export type Entry = {
	id: string; kind: "server" | "client"; name: string; description: string; version: string;
	author?: string; license?: string; homepage?: string; source: Source;
};
export type Catalog = { name: string; description?: string; extensions: Entry[] };

export const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const SEMVER = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;

export function loadCatalog(file = join(ROOT, "marketplace.json")): Catalog {
	return JSON.parse(readFileSync(file, "utf8"));
}

/** Returns a list of problems; empty = valid. */
export function validate(c: Catalog, root = ROOT): string[] {
	const errs: string[] = [];
	const seen = new Set<string>();
	if (!c.name) errs.push("catalog: name is required");
	if (!Array.isArray(c.extensions)) return [...errs, "catalog: extensions must be an array"];
	for (const e of c.extensions) {
		const at = `extension "${e.id}"`;
		if (!ID.test(e.id ?? "")) errs.push(`${at}: id must be lowercase letters, digits and dashes`);
		if (seen.has(e.id)) errs.push(`${at}: duplicate id`);
		seen.add(e.id);
		if (e.kind !== "server" && e.kind !== "client") errs.push(`${at}: kind must be "server" or "client"`);
		for (const k of ["name", "description"] as const) if (!e[k]) errs.push(`${at}: ${k} is required`);
		if (!SEMVER.test(e.version ?? "")) errs.push(`${at}: version must be semver`);
		if (!e.license) errs.push(`${at}: license is required`);
		const s = e.source;
		if (s?.type === "path") {
			if (e.kind !== "server") errs.push(`${at}: only server extensions can use a path source`);
			if (s.path.includes("..") || s.path.startsWith("/")) errs.push(`${at}: path must stay inside the repo`);
			else if (!["index.ts", "index.js", "package.json"].some((f) => existsSync(join(root, s.path, f)))) errs.push(`${at}: ${s.path} has no index.ts, index.js or package.json`);
		} else if (s?.type === "url") {
			if (!s.url.startsWith("https://")) errs.push(`${at}: url must be https`);
			if (e.kind !== "client") errs.push(`${at}: only client extensions can use a url source`);
			if (s.sha256 !== undefined && !/^[0-9a-f]{64}$/.test(s.sha256)) errs.push(`${at}: sha256 must be 64 lowercase hex characters`);
		} else errs.push(`${at}: source.type must be "path" or "url"`);
	}
	return errs;
}
