import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/bot-schema.ts",
  out: "./migrations/bot",
});
