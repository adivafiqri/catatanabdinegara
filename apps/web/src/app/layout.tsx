import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Tryout SKD · Catatan Abdi Negara", template: "%s · Catatan Abdi Negara" },
  description:
    "Tryout SKD gratis dengan format mirip CAT: 110 soal, 100 menit, skor langsung keluar.",
  icons: { icon: "/img/pet-hormat.svg" },
};

export const viewport: Viewport = {
  themeColor: "#5A3B20",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
