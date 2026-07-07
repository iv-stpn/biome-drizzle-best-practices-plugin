---
"biome-drizzle-best-practices-plugin": patch
---

Migrate dev tooling to TypeScript 6. Bump `typescript` to `^6`, pin `@biomejs/biome`, `@types/node`, and `biome-one-liner-plugin`, and consolidate the type-check configs (remove the redundant `scripts/tsconfig.json`, repoint the root `tsconfig.json` glob at `scripts/`, and simplify the `typecheck` script). No changes to the published plugin.
