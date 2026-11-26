import { NextResponse, type NextRequest } from "next/server";

// Satu aplikasi, dua host:
//  - tryout.catatanabdinegara.site → halaman peserta (admin diblokir)
//  - admin.catatanabdinegara.site  → hanya /admin (+ API login)
// Ditambah CSP dengan nonce per permintaan & header keamanan.
const ADMIN_HOST = new URL(process.env.ADMIN_ORIGIN ?? "https://admin.catatanabdinegara.site").host;

export function proxy(req: NextRequest) {
  const url = req.nextUrl;
  // Hanya header Host (diisi Cloudflare Tunnel sesuai hostname). JANGAN memakai X-Forwarded-Host:
  // nilainya bisa dipalsukan pengunjung untuk "menyamar" sebagai host admin.
  const host = (req.headers.get("host") ?? "").toLowerCase();
  const isAdminHost = host === ADMIN_HOST;
  const isDevLocal = host.startsWith("127.0.0.1") || host.startsWith("localhost");
  const path = url.pathname;

  if (isAdminHost) {
    // Bangun URL dari Host asli (bukan alamat internal server) agar benar di balik Cloudflare Tunnel.
    if (path === "/")
      return NextResponse.redirect(
        new URL(
          "/admin",
          `${isDevLocal || process.env.ADMIN_ORIGIN?.startsWith("http:") ? "http" : "https"}://${host}`,
        ),
      );
    const ok =
      path.startsWith("/admin") || path.startsWith("/api/auth") || path.startsWith("/api/admin");
    if (!ok) return new NextResponse("Tidak ditemukan", { status: 404 });
  } else if (!isDevLocal && (path.startsWith("/admin") || path.startsWith("/api/admin"))) {
    return new NextResponse("Tidak ditemukan", { status: 404 });
  }

  const nonce = btoa(crypto.randomUUID());
  const dev = process.env.NODE_ENV !== "production";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'unsafe-inline'`,
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src 'self'${dev ? " ws:" : ""}`,
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
  ].join("; ");

  const reqHeaders = new Headers(req.headers);
  reqHeaders.set("x-nonce", nonce);
  reqHeaders.set("content-security-policy", csp);
  const res = NextResponse.next({ request: { headers: reqHeaders } });
  res.headers.set("Content-Security-Policy", csp);
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (!dev) res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  if (isAdminHost) res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|fonts/|img/|favicon).*)"],
};
