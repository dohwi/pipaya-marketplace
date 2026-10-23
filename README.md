# pipaya-marketplace

A public catalog of [pipaya](https://github.com/dohwi/pipaya) extensions. One git repo: `marketplace.json` is the index, server extensions live in `extensions/<id>/`, client extensions are linked from their own repos.

> Server extensions run **with the server's full privileges**. Read the code before installing.

## Use

```bash
git clone https://github.com/dohwi/pipaya-marketplace && cd pipaya-marketplace
bun scripts/market.ts list
bun scripts/market.ts install guard          # copies to ~/.pipaya/extensions/guard
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" http://<server>/server-extensions/reload
bun scripts/market.ts install quota-monitor  # client: saves quota-monitor.json, import it in the pipaya UI
bun scripts/market.ts remove guard
```

## Layout

```
marketplace.json        catalog (validated in CI)
extensions/<id>/        server extensions (index.ts or package.json with "pipaya.extensions")
scripts/                market.ts CLI, validate.ts, tests
```

Catalog entry: `id`, `kind` (`server` | `client`), `name`, `description`, `version` (semver), `license`, `source`.
- `{ "type": "path", "path": "extensions/<id>" }` server only, code lives here.
- `{ "type": "url", "url": "https://…/<id>.json" }` client only, a built package from the author's repo.

## Maintaining

- Every change that touches an extension bumps its `version` in `marketplace.json` (patch for fixes).
- CI runs `bun test` and `bun scripts/validate.ts`; both must pass before merge.
- Submit via PR, see [CONTRIBUTING.md](CONTRIBUTING.md).
