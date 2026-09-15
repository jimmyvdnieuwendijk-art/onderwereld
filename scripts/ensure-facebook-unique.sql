-- Facebook login: unique non-null ids. Multiple NULLs stay allowed (Postgres).
-- Empty strings would collide on UNIQUE; treat them as "no Facebook".
UPDATE "User" SET "facebookId" = NULL WHERE "facebookId" = '';

CREATE UNIQUE INDEX IF NOT EXISTS "User_facebookId_key" ON "User" ("facebookId");
