// Applies the database/*.sql files, in order, to a Supabase Postgres database.

// Usage (run from an interactive terminal):
//   npm install pg
//   node scripts/apply-schema.mjs

// The database password is a secret, so the script asks for it in the terminal with the
// input hidden. It is never written to a file or your shell history.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import pg from "pg";

// Not secret: this is the subdomain of your project URL (https://<ref>.supabase.co),
// also under Project Settings -> General. Safe to commit.
const PROJECT_REF = "djmphalanxapojkiuigf";

// Direct connection. It is IPv6-only on most plans; if connecting fails, replace this
// with the "Session pooler" host from the dashboard (Connect), e.g.
// "aws-0-us-west-1.pooler.supabase.com". The username below adjusts automatically.
const DB_HOST = `db.${PROJECT_REF}.supabase.co`;

// The pooler needs the project ref in the username; the direct connection does not.
const DB_USER = DB_HOST.includes("pooler.supabase.com") ? `postgres.${PROJECT_REF}` : "postgres";

// Order matters: everything refers to tables created in schema.sql, and policies use
// a function defined in functions.sql. hooks.sql and triggers.sql only need the tables.
const FILES = ["schema.sql", "functions.sql", "hooks.sql", "triggers.sql", "policies.sql"];

// --- hidden password prompt -----------------------------------------------
function promptHidden(question) {
  return new Promise((resolve, reject) => {
    const { stdin, stdout } = process;
    stdout.write(question);
    stdin.setRawMode(true); // Means it won't echo input into shell history
    stdin.resume();
    stdin.setEncoding("utf8");
    let value = "";

    const cleanup = () => { // Put terminal backed into "cooked" mode
      stdin.setRawMode(false);
      stdin.pause();
      stdin.off("data", onData);
      stdout.write("\n");
    };

    const onData = (chunk) => {
      for (const c of chunk) {
        if (c === "\r" || c === "\n") { // Pressing "Enter"
          cleanup();
          return resolve(value);
        }
        if (c === "\u0003") { // Pressing "Ctrl + C"
          cleanup();
          return reject(new Error("Cancelled"));
        }
        if (c === "\u007f" || c === "\b") value = value.slice(0, -1); // "Pressing "Delete" or backspace
        else value += c;
      }
    };

    stdin.on("data", onData); // Call onData when a "data" event happens (terminal recieved input)
  });
}

// --- run -------------------------------------------------------------------
let client;
try {
  if (!process.stdin.isTTY) {
    throw new Error("Run this from an interactive terminal so it can prompt for the password.");
  }

  const password = await promptHidden("Database password (input hidden): ");
  if (!password) throw new Error("Empty password.");

  client = new pg.Client({
    host: DB_HOST,
    port: 5432,
    user: DB_USER,
    password,
    database: "postgres",
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  for (const name of FILES) {
    const sql = readFileSync(fileURLToPath(new URL(`../database/${name}`, import.meta.url)), "utf8");
    console.log(`Applying ${name}...`);
    await client.query(sql);
  }
  const { rows } = await client.query(
    "select table_name from information_schema.tables where table_schema='public' order by 1"
  );
  console.log("Done. Tables in public:", rows.map((r) => r.table_name).join(", "));
} catch (err) {
  console.error("Failed:", err.message);
  process.exitCode = 1;
} finally {
  await client?.end();
}
