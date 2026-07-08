// Run `npx @biomejs/biome lint example.ts` to see the plugin flag each hazard.
// (These are illustrative snippets; `db`, `users`, `posts`, `sql`, `eq` are assumed imported.)
//
// Note: `.delete()` / `.update().set()` without a `.where()` are caught by
// Biome's built-in `drizzle` domain (noDrizzleDeleteWithoutWhere,
// noDrizzleUpdateWithoutWhere), not by this plugin.

// enforce-join-with-condition — cartesian product, no `on`
db.select().from(users).leftJoin(posts);
db.select().from(users).innerJoin(posts);

// no-empty-where — empty filter matches all rows
db.select().from(users).where();

// no-sql-raw-interpolation — SQL injection risk
const q = sql.raw(`SELECT * FROM users WHERE id = ${userId}`);

// --- safe forms below: the plugin leaves these alone ---
db.select().from(users).leftJoin(posts, eq(users.id, posts.userId));
db.select().from(users).where(eq(users.id, 1));
const safe = sql`SELECT * FROM users WHERE id = ${userId}`;
