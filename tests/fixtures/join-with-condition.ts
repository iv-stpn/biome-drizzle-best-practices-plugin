db.select().from(users).leftJoin(posts, eq(users.id, posts.userId));
db.select().from(users).innerJoin(posts, eq(users.id, posts.userId));
