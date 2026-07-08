---
"biome-drizzle-best-practices-plugin": major
---

Remove the `enforce-delete-with-where` and `enforce-update-with-where` rules. These `.delete()` / `.update().set()`-without-`.where()` guards are now built into Biome's [`drizzle` domain](https://biomejs.dev/linter/domains/#drizzle) as `noDrizzleDeleteWithoutWhere` and `noDrizzleUpdateWithoutWhere`, so the plugin no longer duplicates them. Enable them in the built-in domain instead (`"domains": { "drizzle": "all" }` — both are nursery rules, so `"recommended"` won't turn them on). The plugin now ships only the three checks Biome does not: `enforce-join-with-condition`, `no-empty-where`, and `no-sql-raw-interpolation`.
