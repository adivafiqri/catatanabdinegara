import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginFormView } from "@/components/AccountForms";
import { Band, Footer } from "@/components/Site";
import { getSession } from "@/lib/session";

export const metadata = { title: "Masuk" };

export default async function Page({ searchParams }: { searchParams: Promise<{ ke?: string }> }) {
  const { ke } = await searchParams;
  if (await getSession()) redirect(ke ?? "/");
  return (
    <>
      <Band>
        <h1 className="display" style={{ marginTop: 14 }}>
          Masuk
        </h1>
      </Band>
      <main className="wrap stack">
        <div className="card">
          <LoginFormView next={ke ?? "/"} />
        </div>
        <p className="small">
          Belum punya akun?{" "}
          <Link href={`/daftar${ke ? `?ke=${encodeURIComponent(ke)}` : ""}`}>Daftar gratis</Link>
        </p>
        <p className="small muted">
          Lupa kata sandi? Hubungi admin lewat grup Telegram. Reset otomatis lewat email menyusul.
        </p>
      </main>
      <Footer />
    </>
  );
}
