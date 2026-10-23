# Contributing

1. **Server extension**: create a repository `pipaya-extension-<id>` with `index.ts` and a `package.json` (`name`, `version`, `description`, `license`, `author`) at its root, plus a README stating what it reads, runs and sends, then tag a release. **Client extension**: publish a tagged release in your own repo with `dist/<id>.json`.
2. Add one line to `marketplace.json` (see the README). Use an OSI license; client extensions get it from their GitHub repo.
3. `bun scripts/pin.ts <id> <tag>` (records the commit of a server extension, the `sha256` of a client one).
4. `bun scripts/build-index.ts`, then `bun test && bun scripts/validate.ts`, and commit `index.json`.
5. Open a PR. Reviewers check: no network calls or file access that the README does not state, no secrets, no obfuscated code.
6. Updates: bump the version (server) or pin the new tag (client).
