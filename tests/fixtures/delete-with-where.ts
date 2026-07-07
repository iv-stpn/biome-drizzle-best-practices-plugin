db.delete(users).where(eq(users.id, 1));
db.delete(users).returning().where(eq(users.id, 1));
db.with(someCte).delete(users).where(eq(users.id, 1));
