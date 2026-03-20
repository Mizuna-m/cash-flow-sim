import { readFile } from "node:fs/promises";
import process from "node:process";
import pg from "pg";

const { Client } = pg;

async function loadDotEnv() {
  try {
    const envFile = await readFile(".env", "utf8");

    for (const line of envFile.split("\n")) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmed.indexOf("=");

      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, separatorIndex);
      const value = trimmed.slice(separatorIndex + 1);

      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") {
      throw error;
    }
  }
}

async function main() {
  const [, , ...files] = process.argv;

  if (files.length === 0) {
    throw new Error("SQL file path is required");
  }

  await loadDotEnv();

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  await client.connect();

  try {
    for (const file of files) {
      const sql = await readFile(file, "utf8");
      process.stdout.write(`Applying ${file}\n`);
      await client.query(sql);
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
