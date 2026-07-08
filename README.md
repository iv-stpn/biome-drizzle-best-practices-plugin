# biome-drizzle-best-practices-plugin

A [Biome](https://biomejs.dev) plugin (written in [GritQL](https://biomejs.dev/blog/gritql-biome)) that
enforces [Drizzle ORM](https://orm.drizzle.team) best practices — catching the query-chain mistakes that
quietly turn into cartesian products or SQL injection at runtime.

It adds three checks that Biome does not ship itself: `enforce-join-with-condition`, `no-empty-where`, and
`no-sql-raw-interpolation`.

> **Missing delete/update guards?** The `.delete()` / `.update().set()`-without-`.where()` checks that earlier
> versions of this plugin provided are now built into Biome's [`drizzle` domain](https://biomejs.dev/linter/domains/#drizzle)
> as `noDrizzleDeleteWithoutWhere` and `noDrizzleUpdateWithoutWhere`. Enable them there instead — see
> [Delete/update without `.where()`](#deleteupdate-without-where) below.

```ts
// flagged
db.select().from(users).leftJoin(posts);       // cartesian product — no `on`
query.where();                                 // empty filter matches all rows
sql.raw(`SELECT * FROM users WHERE id = ${id}`); // SQL injection

// safe
db.select().from(users).leftJoin(posts, eq(users.id, posts.userId));
query.where(eq(users.id, id));
sql`SELECT * FROM users WHERE id = ${id}`;
```

## Rules

| Rule | Flags | Why |
| --- | --- | --- |
| `drizzle/enforce-join-with-condition` | `.leftJoin(t)` / `.rightJoin(t)` / `.innerJoin(t)` / `.fullJoin(t)` called with only the table | A join with no `on` predicate produces a cartesian product. |
| `drizzle/no-empty-where` | `.where()` with no argument | An empty filter silently matches every row. |
| `drizzle/no-sql-raw-interpolation` | `sql.raw(` … `${value}` … `)` | `sql.raw` bypasses parameterisation, so an interpolated value is spliced straight into the SQL string. |

All rules report a diagnostic only (severity `error`, category `plugin`); none apply an auto-fix, because the
correct repair is query-specific — the plugin flags the hazard and leaves the fix to you.

### Delete/update without `.where()`

A bare `.delete()` removes **every** row in the table, and a bare `.update(t).set(v)` rewrites every row. These
hazards are no longer checked by this plugin — Biome now ships them in its built-in
[`drizzle` domain](https://biomejs.dev/linter/domains/#drizzle):

- `noDrizzleDeleteWithoutWhere` — flags `.delete()` with no `.where()`.
- `noDrizzleUpdateWithoutWhere` — flags `.update().set()` with no `.where()`.

The domain activates automatically once `drizzle-orm` `>=0.9.0` is a dependency, but both rules are **nursery**,
so enabling the domain as `"recommended"` turns nothing on. Enable them explicitly:

```jsonc
{
  "linter": {
    "domains": {
      "drizzle": "all"          // or turn each rule on individually
    }
  }
}
```

Unlike this plugin's structural matching, the built-in rules are type-aware, so they only fire on real Drizzle
queries — no need to scope them to Drizzle files by hand.

### enforce-join-with-condition

```ts
// flagged — no `on` condition, yields a cartesian product
db.select().from(users).leftJoin(posts);

// safe
db.select().from(users).leftJoin(posts, eq(users.id, posts.userId));
```

Matches the four join methods whose second argument is the `on` predicate (`leftJoin`, `rightJoin`,
`innerJoin`, `fullJoin`) when called with exactly one argument. The correct two-argument form is left untouched.

### no-empty-where

```ts
db.select().from(users).where();   // flagged
db.update(users).set({ x: 1 }).where(); // flagged
db.select().from(users).where(eq(users.id, 1)); // safe
```

### no-sql-raw-interpolation

```ts
sql.raw(`SELECT * FROM users WHERE id = ${userId}`); // flagged
sql.raw("SELECT * FROM users");                      // safe — constant string
sql.raw(`SELECT * FROM users`);                      // safe — no interpolation
sql`SELECT * FROM users WHERE id = ${userId}`;       // safe — parameterised tagged template
```

Only `sql.raw(...)` whose argument is a template literal **with an interpolation** is flagged. A plain string
constant (including a template literal with no `${}`) is left alone, and the tagged `sql` template escapes its
interpolations safely, so it is never flagged.

## Limitations

The plugin matches structure, not types, so it keys off method *names*. If you have an unrelated object with a
`.where()` method (or a `.leftJoin` / `sql.raw` call), it will also be flagged. `eslint-plugin-drizzle` avoids
this with a `drizzleObjectName` option, but Biome's GritQL plugins cannot yet take configuration — so the match
is intentionally broad. Scope the plugin with Biome's `includes`/`overrides` to the files that use Drizzle if
false positives are a problem. (Biome's built-in `drizzle` domain rules are type-aware and don't have this
caveat.)

## Usage

Install the plugin as a dev dependency:

```sh
npm install -D biome-drizzle-best-practices-plugin
```

Reference it from your Biome configuration:

```jsonc
{
  "plugins": ["biome-drizzle-best-practices-plugin/drizzle.grit"],
  "linter": {
    "rules": { "recommended": true }
  }
}
```

Then run the linter:

```sh
npx @biomejs/biome lint <files>
```

Requires Biome **2.0+** (GritQL plugins landed in v2.0). Developed and tested against Biome 2.5.

> Using it directly from this repo instead? Set `"plugins": ["./drizzle.grit"]` and point the path at the
> checked-out file.

## Try it

```sh
npm install
npx @biomejs/biome lint example.ts
```

## Tests

Snapshot tests live in [tests/](tests/). Each case is a pair: `tests/fixtures/<name>.ts` (the source to lint)
and `<name>.expected.json` (the diagnostics it should produce, as an order-independent array of
`{ "line": <number>, "rule": "<slug>" }`). The runner ([scripts/run-tests.mjs](scripts/run-tests.mjs)) runs
`biome lint --reporter=json` on each fixture with only the plugin enabled and compares the extracted
diagnostics against the expectation.

```sh
npm test
```

Covered cases include each rule's flagged form and its safe counterpart: all four join methods without a
condition vs. the two-argument form, empty vs. populated `.where()`, and `sql.raw` with interpolation vs.
constant strings vs. the safe tagged `sql` template.

## How it works

The plugin is one Biome GritQL file, [drizzle.grit](drizzle.grit). The empty-`where` call is matched with a
code-snippet pattern (`` `$obj.where()` ``). The join rule matches a `JsCallExpression` whose member name is
one of the four join methods and whose argument list has exactly one element (`$args <: [$table]`). The
`sql.raw` rule matches when the argument is a `JsTemplateExpression` containing a `JsTemplateElement` (an
interpolation), so constant strings are left alone.

## Releasing

Versions and the changelog are managed with [Changesets](https://github.com/changesets/changesets).

1. Add a changeset describing a change: `npx changeset`.
2. Commit the changeset to your branch.
3. On merge to `main`, the [Release workflow](.github/workflows/release.yml) opens a "Version Packages" pull
   request that bumps the version and updates `CHANGELOG.md`.
4. Merge that PR and the workflow publishes the new version to npm.

The workflow needs an `NPM_TOKEN` secret in the repo. CI runs the test suite on every push and pull request
([.github/workflows/ci.yml](.github/workflows/ci.yml)).

---

Inspired by [`biome-plugin-drizzle`](https://www.npmjs.com/package/biome-plugin-drizzle) and
[`eslint-plugin-drizzle`](https://github.com/drizzle-team/drizzle-orm/tree/main/eslint-plugin-drizzle) from the
Drizzle Team.
