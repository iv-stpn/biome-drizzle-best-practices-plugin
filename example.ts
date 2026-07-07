// Run `npx @biomejs/biome lint example.ts` to see the plugin flag each hazard.
// (These are illustrative snippets; `db`, `users`, `posts`, `sql`, `eq` are assumed imported.)

// enforce-delete-with-where — deletes every row
db.delete(users);
await db.delete(posts);
db.delete(users).returning();

// enforce-update-with-where — updates every row
db.update(users).set({ active: false });

// enforce-join-with-condition — cartesian product, no `on`
db.select().from(users).leftJoin(posts);
db.select().from(users).innerJoin(posts);

// no-empty-where — empty filter matches all rows
db.select().from(users).where();

// no-sql-raw-interpolation — SQL injection risk
const q = sql.raw(`SELECT * FROM users WHERE id = ${userId}`);

// --- safe forms below: the plugin leaves these alone ---
db.delete(users).where(eq(users.id, 1));
db.update(users).set({ active: false }).where(eq(users.id, 1));
db.select().from(users).leftJoin(posts, eq(users.id, posts.userId));
db.select().from(users).where(eq(users.id, 1));
const safe = sql`SELECT * FROM users WHERE id = ${userId}`;
