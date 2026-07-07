db.delete(users);
await db.delete(posts);
db.delete(users).returning();
