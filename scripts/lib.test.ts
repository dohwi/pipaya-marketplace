import { expect, test } from "bun:test";
import { type Catalog, loadCatalog, validate } from "./lib.ts";

test("shipped catalog is valid", () => {
	expect(validate(loadCatalog())).toEqual([]);
});

test("catches bad entries", () => {
	const base = loadCatalog().extensions[0];
	const c: Catalog = { name: "x", extensions: [
		{ ...base, id: "Bad_Id" },
		{ ...base, version: "1" },
		{ ...base, source: { type: "path", path: "../etc" } },
		{ ...base, kind: "client", source: { type: "url", url: "http://x" } },
		base, base,
	] };
	const errs = validate(c).join("\n");
	for (const s of ["id must be", "semver", "inside the repo", "url must be https", "duplicate id"]) expect(errs).toContain(s);
});

test("sha256 must be 64 hex characters", () => {
	const base = loadCatalog().extensions[1];
	const errs = validate({ name: "x", extensions: [{ ...base, source: { type: "url", url: "https://x.dev/a.json", sha256: "abc" } }] });
	expect(errs.join()).toContain("sha256");
});
