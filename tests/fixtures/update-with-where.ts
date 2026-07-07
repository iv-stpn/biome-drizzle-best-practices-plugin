db.update(users).set({ name: "John" }).where(eq(users.id, 1));
db.update(users).set({ email: "new@email.com" }).returning().where(eq(users.id, 1));
