import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();

const sqlHost = process.env.SQL_HOST;
const sqlDbName = process.env.SQL_DB_NAME;
const user = process.env.SQL_ADMIN_USER;
const password = process.env.SQL_ADMIN_PASSWORD;

if (!sqlHost || !sqlDbName || !user || !password) {
  // We don't throw here to avoid build failures if env vars are missing during CI/CD, 
  // but Drizzle Kit will fail if it's actually run.
  console.warn("Database environment variables are missing.");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  schemaFilter: ["public"],
  dbCredentials: {
    host: sqlHost || "localhost",
    user: user || "admin",
    password: password || "password",
    database: sqlDbName || "boya",
    ssl: false,
  },
  verbose: true,
});
