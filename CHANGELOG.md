# biome-drizzle-best-practices-plugin

## 2.0.0

### Major Changes

- 910a9be: Remove the `enforce-delete-with-where` and `enforce-update-with-where` rules. These `.delete()` / `.update().set()`-without-`.where()` guards are now built into Biome's [`drizzle` domain](https://biomejs.dev/linter/domains/#drizzle) as `noDrizzleDeleteWithoutWhere` and `noDrizzleUpdateWithoutWhere`, so the plugin no longer duplicates them. Enable them in the built-in domain instead (`"domains": { "drizzle": "all" }` — both are nursery rules, so `"recommended"` won't turn them on). The plugin now ships only the three checks Biome does not: `enforce-join-with-condition`, `no-empty-where`, and `no-sql-raw-interpolation`.

### Patch Changes

- 7c984b2: Migrate dev tooling to TypeScript 6. Bump `typescript` to `^6`, pin `@biomejs/biome`, `@types/node`, and `biome-one-liner-plugin`, and consolidate the type-check configs (remove the redundant `scripts/tsconfig.json`, repoint the root `tsconfig.json` glob at `scripts/`, and simplify the `typecheck` script). No changes to the published plugin.
