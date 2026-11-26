import type { NextConfig } from "next";

const config: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // Paket workspace ditulis dalam TypeScript langsung.
  transpilePackages: ["@can/db", "@can/shared"],
  serverExternalPackages: ["pg", "postgres", "@electric-sql/pglite"],
  experimental: { serverActions: { bodySizeLimit: "2mb" } },
  // Paket workspace memakai impor bergaya NodeNext ("./x.js" → berkas x.ts).
  webpack: (cfg) => {
    cfg.resolve.extensionAlias = { ".js": [".ts", ".tsx", ".js"], ".mjs": [".mts", ".mjs"] };
    return cfg;
  },
};

export default config;
