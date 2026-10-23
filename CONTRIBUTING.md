# Contributing

1. **Server extension**: add a folder with `index.ts` and a `package.json` (`name`, `version`, `description`, `license`, `author`), plus a README stating what it reads, runs and sends, to a GitHub repository (the default ones are in [pipaya-extensions](https://github.com/dohwi/pipaya-extensions), under `extensions/<id>/`) and tag a release `<id>-v<version>`. **Client extension**: the same, with `dist/<id>.json` in the folder.
2. Add one entry to `marketplace.json` (`repo`, `dir`, `ref`; see the README). Use an OSI license; client extensions get it from their GitHub repo.
3. `bun scripts/pin.ts <id> <tag>` (records the commit of a server extension, the `sha256` of a client one).
4. `bun scripts/build-index.ts`, then `bun test && bun scripts/validate.ts`, and commit `index.json`.
5. Open a PR. Reviewers check: no network calls or file access that the README does not state, no secrets, no obfuscated code.
6. Updates: bump the version (server) or pin the new tag (client).
