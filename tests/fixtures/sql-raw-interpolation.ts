const a = sql.raw(`SELECT * FROM users WHERE id = ${userId}`);
const b = sql.raw("SELECT * FROM users");
const c = sql`SELECT * FROM users WHERE id = ${userId}`;
const d = sql.raw(`SELECT * FROM users`);
