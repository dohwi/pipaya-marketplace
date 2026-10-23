# Contributing

1. Server extension: add `extensions/<id>/index.ts` (+ README stating what it reads, runs and sends). Client extension: publish a built package in your own repo.
2. Add an entry to `marketplace.json` (MIT or another OSI license required).
3. `bun test && bun scripts/validate.ts`.
4. Open a PR. Reviewers check: no network calls or file access that the README does not state, no secrets, no obfuscated code.
5. Updates: bump `version`. A new `url` source must point at an immutable tag or commit where possible.
