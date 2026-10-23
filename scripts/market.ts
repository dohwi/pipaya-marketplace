#!/usr/bin/env bun
// Usage: bun scripts/market.ts <list | install <id> | remove <id>> [--dir <extensions dir>] [--out <file>]
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { type Catalog, ROOT, loadCatalog, validate } from "./lib.ts";

const args = process.argv.slice(2);
const flag = (n: string) => { const i = args.indexOf(n); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
const dir = resolve(flag("--dir") ?? join(homedir(), ".pipaya", "extensions"));
const out = flag("--out");
const [cmd, id] = args;
const MARKET = process.env.PIPAYA_MARKET_URL; // set to a raw marketplace.json URL to use a remote catalog

async function catalog(): Promise<Catalog> {
	if (!MARKET) return loadCatalog();
	return (await (await fetch(MARKET)).json()) as Catalog;
}

const c = await catalog();
const find = () => {
	const e = c.extensions.find((x) => x.id === id);
	if (!e) { console.error(`unknown extension "${id}"`); process.exit(1); }
	return e;
};

if (cmd === "list") {
	for (const e of c.extensions) console.log(`${e.id.padEnd(18)} ${e.kind.padEnd(7)} ${e.version.padEnd(8)} ${e.description}`);
} else if (cmd === "install") {
	const e = find();
	if (e.source.type === "path") {
		if (MARKET) { console.error("path sources need a local checkout; run without PIPAYA_MARKET_URL"); process.exit(1); }
		if (validate(c).length) { console.error("catalog is invalid"); process.exit(1); }
		const to = join(dir, e.id);
		mkdirSync(dir, { recursive: true });
		rmSync(to, { recursive: true, force: true });
		cpSync(join(ROOT, e.source.path), to, { recursive: true });
		console.log(`installed ${e.id}@${e.version} → ${to}\nreload: POST /server-extensions/reload (admin token)`);
	} else {
		const file = resolve(out ?? `${e.id}.json`);
		const res = await fetch(e.source.url);
		if (!res.ok) { console.error(`download failed: ${res.status}`); process.exit(1); }
		const text = await res.text();
		if (e.source.sha256) {
			const got = new Bun.CryptoHasher("sha256").update(text).digest("hex");
			if (got !== e.source.sha256) { console.error("sha256 mismatch; refusing to save"); process.exit(1); }
		}
		const pkg = JSON.parse(text) as { manifest?: { id?: string; version?: string } };
		if (pkg.manifest?.id !== e.id) { console.error("downloaded package id does not match the catalog"); process.exit(1); }
		writeFileSync(file, text);
		console.log(`saved ${file} (${e.id}@${pkg.manifest?.version}). Import it in pipaya: Extensions → add package file.`);
	}
} else if (cmd === "remove") {
	const e = find();
	const to = join(dir, e.id);
	if (e.kind !== "server" || !existsSync(to)) { console.error("nothing to remove (client extensions are removed in the pipaya UI)"); process.exit(1); }
	rmSync(to, { recursive: true });
	console.log(`removed ${to}`);
} else {
	console.error("usage: market.ts <list | install <id> | remove <id>> [--dir <dir>] [--out <file>]");
	process.exit(1);
}
