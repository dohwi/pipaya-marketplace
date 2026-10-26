<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset=".github/assets/banner-dark.svg" />
    <img src=".github/assets/banner.svg" alt="pipaya marketplace" width="100%" />
  </picture>

  <p><b>English</b> · <a href="README.ko.md">한국어</a></p>

  <p>
    <a href="https://github.com/dohwi/pipaya" target="_blank" rel="noreferrer"><img src="https://img.shields.io/badge/Made_for-pipaya-F08A24?style=flat-square" alt="pipaya" /></a>
    <a href="https://bun.sh" target="_blank" rel="noreferrer"><img src="https://img.shields.io/badge/Bun-1.3-000000?style=flat-square&logo=bun&logoColor=white" alt="Bun" /></a>
    <a href="https://www.typescriptlang.org" target="_blank" rel="noreferrer"><img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" /></a>
    <a href="https://github.com/dohwi/pipaya-marketplace/actions/workflows/validate.yml" target="_blank" rel="noreferrer"><img src="https://img.shields.io/github/actions/workflow/status/dohwi/pipaya-marketplace/validate.yml?branch=main&style=flat-square&label=validate" alt="validate" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" alt="MIT License" /></a>
  </p>
</div>

The public catalog of [pipaya](https://github.com/dohwi/pipaya) extensions. `marketplace.json` is the index; each extension is listed as one folder of a GitHub repository. The default ones all live in one repository, [pipaya-extensions](https://github.com/dohwi/pipaya-extensions).

> [!WARNING]
> Server extensions run **with the server's full privileges**. Read the code before you install one.

## Catalog

| Extension | Kind | Version | What it does |
|---|---|---|---|
| [guard](https://github.com/dohwi/pipaya-extensions/tree/main/guard) | server | 0.1.2 | Blocks destructive shell commands (`rm -rf /`, `mkfs`, fork bombs) before they run |
| [ask-user](https://github.com/dohwi/pipaya-extensions/tree/main/ask-user) | server | 0.1.2 | Lets the agent ask you a question (options, recommended choice) and wait for the answer |
| [peer-tools](https://github.com/dohwi/pipaya-extensions/tree/main/peer-tools) | server | 0.4.1 | Lets agents message (`peer_send`) and read (`peer_read`) each other's chats |
| [prompt-templates](https://github.com/dohwi/pipaya-extensions/tree/main/prompt-templates) | server | 0.2.1 | Save a long prompt as a Markdown file and call it with `/prompt:name` |
| [quota-monitor](https://github.com/dohwi/pipaya-extensions/tree/main/quota-monitor) | client | 0.6.1 | Claude, GPT and Antigravity quota gauges in the header (needs the `ui-components` permission) |
| [peer-names](https://github.com/dohwi/pipaya-extensions/tree/main/peer-names) | client | 0.2.1 | Shows chats' `@names` in the sidebar, `@` completion and message bubbles; pairs with peer-tools |

## Features

- **Two kinds**: `server` extensions (hooks, tools, `/commands`) and `client` extensions (UI packages)
- **Single index**: a tiny `marketplace.json` plus a generated `index.json`, no registry service to run
- **Reviewed in CI**: duplicate ids, folder paths, pinned tags and commits or `sha256` are checked, and `index.json` must match its sources
- **Plain CLI**: `list`, `install`, `remove`; no dependencies besides Bun

## Install an extension

In the pipaya app: **Settings → Extensions → Marketplace**. Client extensions install from there (permissions are shown first); server extensions show the command below.

Requires [Bun](https://bun.sh).

```bash
git clone https://github.com/dohwi/pipaya-marketplace && cd pipaya-marketplace

bun scripts/market.ts list
bun scripts/market.ts install guard          # copies one extension's folder to ~/.pipaya/extensions/guard
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" http://<server>/server-extensions/reload

bun scripts/market.ts install quota-monitor  # saves quota-monitor.json, import it in the pipaya app
bun scripts/market.ts remove guard
```

Set `PIPAYA_MARKET_URL` to a raw `index.json` URL to read a remote catalog.

## Adding an extension

`marketplace.json` only says **where** an extension lives. Name, version, description and author are read from the extension itself, and the license from its GitHub repository.

```json
{ "id": "my-ext", "kind": "server", "repo": "me/my-extensions", "dir": "my-ext", "ref": "my-ext-v1.0.0", "commit": "…" }
{ "id": "my-ui", "repo": "me/my-extensions", "dir": "my-ui", "ref": "my-ui-v1.0.0", "sha256": "…" }
{ "id": "solo", "kind": "server", "repo": "me/pipaya-extension-solo", "ref": "v1.0.0", "commit": "…" }
```

`repo` is the repository and `dir` a folder inside it; leave `dir` out when the extension is the whole repository. When one repository holds several extensions, tag releases `<id>-v<version>` so each one versions on its own.

- **Server extension**: put `index.ts` and `package.json` (`name`, `version`, `description`, `license`, `author`) in the folder (or at the repository root). Tag a release, then run `bun scripts/pin.ts my-ext my-ext-v1.0.0` to record the commit the tag points to; CI and the installer refuse it if the tag later moves. Installing copies that folder only.
- **Client extension**: tag a release that contains `<dir>/dist/<id>.json`, then run `bun scripts/pin.ts my-ui my-ui-v1.0.0` to record the tag and its `sha256`. `ref` must be a tag or commit, never a branch.
- Run `bun scripts/build-index.ts` and commit the generated `index.json` (the app reads it; CI fails when it is stale).

## Project structure

```
pipaya-marketplace/
├── marketplace.json      # where each extension lives (hand-written)
├── index.json            # generated: names, versions, licenses
├── scripts/              # market.ts CLI, build-index.ts, pin.ts, tests
└── .github/              # CI and README assets
```

## Contributing

Add your extension and an entry to `marketplace.json`, run `bun test && bun scripts/validate.ts`, then open a PR. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
