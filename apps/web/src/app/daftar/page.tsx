import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterFormView } from "@/components/AccountForms";
import { Band, Footer } from "@/components/Site";
import { getSession } from "@/lib/session";

export const metadata = { title: "Daftar" };

export default async function Page({ searchParams }: { searchParams: Promise<{ ke?: string }> }) {
  const { ke } = await searchParams;
  if (await getSession()) redirect(ke ?? "/");
  return (
    <>
      <Band>
        <h1 className="display" style={{ marginTop: 14 }}>
          Daftar tryout
        </h1>
        <p className="hand">gratis, cukup sekali daftar</p>
      </Band>
      <main className="wrap stack">
        <div className="card">
          <RegisterFormView next={ke ?? "/"} />
        </div>
        <p className="small">
          Sudah punya akun?{" "}
          <Link href={`/masuk${ke ? `?ke=${encodeURIComponent(ke)}` : ""}`}>Masuk di sini</Link>
        </p>
      </main>
      <Footer />
    </>
  );
}
