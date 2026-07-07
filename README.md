# biome-drizzle-best-practices-plugin

A [Biome](https://biomejs.dev) plugin (written in [GritQL](https://biomejs.dev/blog/gritql-biome)) that
enforces [Drizzle ORM](https://orm.drizzle.team) best practices — catching the query-chain mistakes that
quietly turn into data loss, cartesian products, or SQL injection at runtime.

It ports the two rules from [`eslint-plugin-drizzle`](https://github.com/drizzle-team/drizzle-orm/tree/main/eslint-plugin-drizzle)
/ [`biome-plugin-drizzle`](https://www.npmjs.com/package/biome-plugin-drizzle) (`enforce-delete-with-where`,
`enforce-update-with-where`) and adds three more (`enforce-join-with-condition`, `no-empty-where`,
`no-sql-raw-interpolation`).

```ts
// flagged
db.delete(users);                              // deletes every row
db.update(users).set({ active: false });       // updates every row
db.select().from(users).leftJoin(posts);       // cartesian product — no `on`
query.where();                                 // empty filter matches all rows
sql.raw(`SELECT * FROM users WHERE id = ${id}`); // SQL injection

// safe
db.delete(users).where(eq(users.id, id));
db.update(users).set({ active: false }).where(eq(users.id, id));
db.select().from(users).leftJoin(posts, eq(users.id, posts.userId));
query.where(eq(users.id, id));
sql`SELECT * FROM users WHERE id = ${id}`;
```

## Rules

| Rule | Flags | Why |
| --- | --- | --- |
| `drizzle/enforce-delete-with-where` | `.delete()` with no `.where()` in the chain | A bare delete removes **every** row in the table. |
| `drizzle/enforce-update-with-where` | `.update(t).set(v)` with no `.where()` | A bare update rewrites **every** row in the table. |
| `drizzle/enforce-join-with-condition` | `.leftJoin(t)` / `.rightJoin(t)` / `.innerJoin(t)` / `.fullJoin(t)` called with only the table | A join with no `on` predicate produces a cartesian product. |
| `drizzle/no-empty-where` | `.where()` with no argument | An empty filter silently matches every row, defeating the delete/update guards. |
| `drizzle/no-sql-raw-interpolation` | `sql.raw(` … `${value}` … `)` | `sql.raw` bypasses parameterisation, so an interpolated value is spliced straight into the SQL string. |

All rules report a diagnostic only (severity `error`, category `plugin`); none apply an auto-fix, because the
correct repair is query-specific — the plugin flags the hazard and leaves the fix to you.

### enforce-delete-with-where / enforce-update-with-where

```ts
// flagged
db.delete(users);
await db.delete(posts);
db.delete(users).returning();
db.update(users).set({ name: "John" });

// safe — `.where()` can sit anywhere in the chain
db.delete(users).where(eq(users.id, 1));
db.delete(users).returning().where(eq(users.id, 1));
db.update(users).set({ name: "John" }).where(eq(users.id, 1));
```

A chain like `db.delete(t).where(c)` parses with the `.delete(t)` call nested *inside* the `.where(c)` call, so
the rule treats a delete/update as unguarded only when no `.where()` is an ancestor anywhere along the chain.
Note that an **empty** `.where()` does satisfy this guard on its own — but `no-empty-where` catches that case
separately, so the hazard is still reported.

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
db.delete(users).where();          // flagged
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
`.delete()` / `.update()` / `.where()` method, its calls will also be flagged. `eslint-plugin-drizzle` avoids
this with a `drizzleObjectName` option, but Biome's GritQL plugins cannot yet take configuration — so the match
is intentionally broad. Scope the plugin with Biome's `includes`/`overrides` to the files that use Drizzle if
false positives are a problem.

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

Covered cases include each rule's flagged form and its safe counterpart: delete/update with and without
`.where()` (including `await` and `.returning()` chains), all four join methods without a condition vs. the
two-argument form, empty vs. populated `.where()`, and `sql.raw` with interpolation vs. constant strings vs.
the safe tagged `sql` template.

## How it works

The plugin is one Biome GritQL file, [drizzle.grit](drizzle.grit). Delete and empty-`where` calls are matched
with code-snippet patterns (`` `$obj.delete($args)` ``); the update rule matches at the `.set(...)` link every
update chain reaches. The delete/update guards use `not $call <: within \`$_.where($_)\`` — because a chained
`.where()` is always an *ancestor* of the earlier link in the AST. The join rule matches a `JsCallExpression`
whose member name is one of the four join methods and whose argument list has exactly one element
(`$args <: [$table]`). The `sql.raw` rule matches when the argument is a `JsTemplateExpression` containing a
`JsTemplateElement` (an interpolation), so constant strings are left alone.

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
