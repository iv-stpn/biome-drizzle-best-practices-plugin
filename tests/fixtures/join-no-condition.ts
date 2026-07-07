db.select().from(users).leftJoin(posts);
db.select().from(users).rightJoin(posts);
db.select().from(users).innerJoin(posts);
db.select().from(users).fullJoin(posts);
