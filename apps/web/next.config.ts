import type { NextConfig } from "next";

const config: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // Paket workspace ditulis dalam TypeScript langsung.
  transpilePackages: ["@can/db", "@can/shared"],
  serverExternalPackages: ["pg", "postgres", "@electric-sql/pglite"],
  experimental: { serverActions: { bodySizeLimit: "2mb" } },
  // Header keamanan bernilai tetap (CSP ber-nonce diatur di src/proxy.ts).
  async headers() {
    const prod = process.env.NODE_ENV === "production";
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          ...(prod
            ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
            : []),
        ],
      },
    ];
  },
  // Paket workspace memakai impor bergaya NodeNext ("./x.js" → berkas x.ts).
  webpack: (cfg) => {
    cfg.resolve.extensionAlias = { ".js": [".ts", ".tsx", ".js"], ".mjs": [".mts", ".mjs"] };
    return cfg;
  },
};

export default config;
