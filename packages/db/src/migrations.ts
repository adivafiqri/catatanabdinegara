// Lokasi folder migrasi SQL. Dipisah dari index.ts agar bundler web (Next.js) tidak ikut memprosesnya.
export const botMigrationsFolder = new URL("../migrations/bot", import.meta.url).pathname;
export const webMigrationsFolder = new URL("../migrations/web", import.meta.url).pathname;
/** @deprecated nama lama; sama dengan botMigrationsFolder. */
export const migrationsFolder = botMigrationsFolder;
