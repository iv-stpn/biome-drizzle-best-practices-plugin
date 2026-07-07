db.update(users).set({ name: "John" });
await db.update(posts).set({ views: 0 });
db.update(users).set({ status: "active" }).returning();
