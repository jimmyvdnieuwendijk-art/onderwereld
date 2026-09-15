-- Production/preview Neon never got User.facebookId: CI `db push` aborted
-- because Prisma treats the unique index as data loss without a TTY.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "facebookId" TEXT;
UPDATE "User" SET "facebookId" = NULL WHERE "facebookId" = '';
CREATE UNIQUE INDEX IF NOT EXISTS "User_facebookId_key" ON "User" ("facebookId");
