import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/web-schema.ts",
  out: "./migrations/web",
});
