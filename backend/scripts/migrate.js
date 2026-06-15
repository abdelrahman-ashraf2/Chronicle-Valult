import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import { env } from "../src/config/env.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(currentDir, "../../database/migrations");

const connection = await mysql.createConnection({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.name,
  multipleStatements: true
});

try {
  await connection.query(
    `CREATE TABLE IF NOT EXISTS SchemaMigrations (
       migration_name VARCHAR(255) PRIMARY KEY,
       applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
     ) ENGINE=InnoDB`
  );

  const files = (await fs.readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const [rows] = await connection.execute(
      `SELECT migration_name FROM SchemaMigrations WHERE migration_name = ? LIMIT 1`,
      [file]
    );

    if (rows.length) {
      console.log(`Skipping ${file}`);
      continue;
    }

    const sql = (await fs.readFile(path.join(migrationsDir, file), "utf8"))
      .replaceAll("ADD COLUMN IF NOT EXISTS", "ADD COLUMN");
    const statements = sql
      .split(";")
      .map((statement) => statement.trim())
      .filter(Boolean);
    console.log(`Applying ${file}`);

    for (const statement of statements) {
      try {
        await connection.query(statement);
      } catch (error) {
        if (!["ER_DUP_FIELDNAME", "ER_TABLE_EXISTS_ERROR"].includes(error.code)) {
          throw error;
        }
      }
    }

    await connection.execute(
      `INSERT INTO SchemaMigrations (migration_name) VALUES (?)`,
      [file]
    );
  }

  console.log("Database migrations are up to date.");
} finally {
  await connection.end();
}
