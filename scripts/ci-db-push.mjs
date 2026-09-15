#!/usr/bin/env node
/**
 * CI `prisma db push` helper.
 *
 * Prisma treats adding `User.facebookId` UNIQUE as "data loss" and, without a TTY,
 * aborts unless `--accept-data-loss`. That flag is too broad for a live game DB.
 *
 * Add the column + unique index explicitly (NULLs allowed; empty strings nulled),
 * then run a normal `db push` for the rest of the schema (Chat, etc.).
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const prismaBin = join(root, "node_modules/.bin/prisma");

function run(args) {
  const result = spawnSync(prismaBin, args, {
    cwd: root,
    encoding: "utf8",
    env: process.env,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  return result;
}

const sql = join(root, "scripts/ensure-facebook-unique.sql");
const ensure = run(["db", "execute", "--file", sql, "--schema", "prisma/schema.prisma"]);
if (ensure.status !== 0) {
  process.exit(ensure.status ?? 1);
}

const push = run(["db", "push"]);
process.exit(push.status ?? 1);
