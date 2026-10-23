import { expect, test } from "bun:test";
import { type Listings, readJson, LISTING_FILE, sha256Hex, validateListings } from "./lib.ts";
import { buildIndex } from "./build-index.ts";

const good = readJson<Listings>(LISTING_FILE);
const H = "a".repeat(64);

test("shipped listing is valid", () => {
	expect(validateListings(good)).toEqual([]);
});

test("catches bad entries", () => {
	const c: Listings = { name: "x", extensions: [
		{ id: "Bad_Id", path: "extensions/guard" },
		{ id: "a", path: "../etc" },
		{ id: "b", repo: "o/r", ref: "main", sha256: H },
		{ id: "c", repo: "o/r", ref: "v1.0.0", sha256: "abc" },
		{ id: "d" },
		{ id: "d", path: "extensions/guard" },
	] };
	const errs = validateListings(c).join("\n");
	for (const s of ["id must be", "inside the repo", "not a branch", "sha256 must be", "exactly one of", "duplicate id"]) expect(errs).toContain(s);
});

test("index is built from the extension's own files and the repo license", async () => {
	const pkg = JSON.stringify({ manifest: { id: "qm", name: "QM", version: "1.2.3", description: "d" }, code: "x" });
	const fake = (async (url: string) => {
		if (String(url).includes("raw.githubusercontent.com")) return new Response(pkg);
		if (String(url).includes("/license")) return Response.json({ license: { spdx_id: "MIT" } });
		return new Response("", { status: 404 });
	}) as unknown as typeof fetch;
	const idx = await buildIndex({ name: "m", extensions: [{ id: "guard", path: "extensions/guard" }, { id: "qm", repo: "o/r", ref: "v1.2.3", sha256: sha256Hex(pkg) }] }, { fetch: fake });
	const [g, q] = idx.extensions;
	expect(g).toMatchObject({ kind: "server", version: "0.1.0", license: "MIT", author: "dohwi" });
	expect(q).toMatchObject({ kind: "client", name: "QM", version: "1.2.3", license: "MIT", author: "o", homepage: "https://github.com/o/r" });
});

test("a changed package is refused", async () => {
	const fake = (async () => new Response("{}")) as unknown as typeof fetch;
	await expect(buildIndex({ name: "m", extensions: [{ id: "qm", repo: "o/r", ref: "v1", sha256: H }] }, { fetch: fake })).rejects.toThrow("sha256 mismatch");
});
