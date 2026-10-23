import { expect, test } from "bun:test";
import { type Listings, readJson, LISTING_FILE, sha256Hex, validateListings } from "./lib.ts";
import { buildIndex } from "./build-index.ts";

const good = readJson<Listings>(LISTING_FILE);
const H = "a".repeat(64);
const C = "a".repeat(40);

test("shipped listing is valid", () => {
	expect(validateListings(good)).toEqual([]);
});

test("catches bad entries", () => {
	const c = { name: "x", extensions: [
		{ id: "Bad_Id", repo: "o/r", ref: "v1", sha256: H },
		{ id: "a", repo: "o/r", dir: "../etc", ref: "v1", sha256: H },
		{ id: "e", repo: "o/r", dir: "/abs", ref: "v1", sha256: H },
		{ id: "b", repo: "o/r", ref: "main", sha256: H },
		{ id: "c", repo: "o/r", ref: "v1.0.0", sha256: "abc" },
		{ id: "d" },
		{ id: "d", repo: "o/r", ref: "v1", sha256: H },
		{ id: "f", kind: "server", repo: "o/r", ref: "v1.0.0" },
	] } as unknown as Listings;
	const errs = validateListings(c).join("\n");
	for (const s of ["id must be", "dir must be a folder", "not a branch", "sha256 must be", "\"repo\" is required", "duplicate id", "commit must be 40"]) expect(errs).toContain(s);
});

test("a folder inside a repository is accepted", () => {
	expect(validateListings({ name: "x", extensions: [{ id: "a", kind: "server", repo: "o/r", dir: "a", ref: "a-v1.0.0", commit: C }] })).toEqual([]);
});

test("a client extension is read from its folder of a monorepo, with the repo license", async () => {
	const pkg = JSON.stringify({ manifest: { id: "qm", name: "QM", version: "1.2.3", description: "d" }, code: "x" });
	const urls: string[] = [];
	const fake = (async (url: string) => {
		urls.push(String(url));
		if (String(url).includes("raw.githubusercontent.com")) return new Response(pkg);
		if (String(url).includes("/license")) return Response.json({ license: { spdx_id: "MIT" } });
		return new Response("", { status: 404 });
	}) as unknown as typeof fetch;
	const idx = await buildIndex({ name: "m", extensions: [{ id: "qm", repo: "o/r", dir: "qm", ref: "qm-v1.2.3", sha256: sha256Hex(pkg) }] }, { fetch: fake });
	expect(urls[0]).toBe("https://raw.githubusercontent.com/o/r/qm-v1.2.3/qm/dist/qm.json");
	expect(idx.extensions[0]).toMatchObject({ kind: "client", name: "QM", version: "1.2.3", license: "MIT", author: "o", homepage: "https://github.com/o/r/tree/qm-v1.2.3/qm" });
});

test("a server extension is read from its folder and pinned to a commit", async () => {
	const urls: string[] = [];
	const fake = (async (url: string) => {
		urls.push(String(url));
		if (String(url).includes("raw.githubusercontent.com")) return new Response(JSON.stringify({ name: "pipaya-extension-x", version: "1.0.0", description: "d", license: "MIT", author: "me", pipaya: { title: "X" } }));
		if (String(url).includes("/commits/")) return Response.json({ sha: C });
		return new Response("", { status: 404 });
	}) as unknown as typeof fetch;
	const idx = await buildIndex({ name: "m", extensions: [{ id: "x", kind: "server", repo: "o/r", dir: "x", ref: "x-v1.0.0", commit: C }] }, { fetch: fake });
	expect(urls[0]).toBe("https://raw.githubusercontent.com/o/r/x-v1.0.0/x/package.json");
	expect(idx.extensions[0]).toMatchObject({ id: "x", kind: "server", name: "X", version: "1.0.0", license: "MIT", source: { type: "git", repo: "o/r", dir: "x", ref: "x-v1.0.0", commit: C } });
});

test("a server extension that is a whole repository has no dir", async () => {
	const fake = (async (url: string) => String(url).includes("/commits/") ? Response.json({ sha: C }) : new Response(JSON.stringify({ version: "1.0.0" }))) as unknown as typeof fetch;
	const idx = await buildIndex({ name: "m", extensions: [{ id: "x", kind: "server", repo: "o/r", ref: "v1.0.0", commit: C }] }, { fetch: fake });
	expect(idx.extensions[0]!.source).toEqual({ type: "git", repo: "o/r", ref: "v1.0.0", commit: C });
});

test("a tag that moved to another commit is refused", async () => {
	const fake = (async (url: string) => String(url).includes("/commits/") ? Response.json({ sha: "b".repeat(40) }) : new Response(JSON.stringify({ version: "1.0.0" }))) as unknown as typeof fetch;
	await expect(buildIndex({ name: "m", extensions: [{ id: "x", kind: "server", repo: "o/r", ref: "v1", commit: C }] }, { fetch: fake })).rejects.toThrow("points to");
});

test("a changed package is refused", async () => {
	const fake = (async () => new Response("{}")) as unknown as typeof fetch;
	await expect(buildIndex({ name: "m", extensions: [{ id: "qm", repo: "o/r", ref: "v1", sha256: H }] }, { fetch: fake })).rejects.toThrow("sha256 mismatch");
});

test("translations come from pipaya.descriptions of package.json", async () => {
	const pkg = { name: "pipaya-extension-x", version: "1.0.0", description: "d", pipaya: { title: "X", descriptions: { ko: "디", "bad tag": "x", en: 1 } } };
	const fetcher = (async (url: string) => {
		if (String(url).includes("raw.githubusercontent.com")) return new Response(JSON.stringify(pkg));
		return new Response(JSON.stringify({ sha: C }));
	}) as unknown as typeof fetch;
	const out = await buildIndex({ name: "x", extensions: [{ id: "x", kind: "server", repo: "o/r", ref: "x-v1.0.0", commit: C }] }, { fetch: fetcher });
	expect(out.extensions[0]!.descriptions).toEqual({ ko: "디" });
});
