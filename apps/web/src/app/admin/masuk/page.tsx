import { AdminLoginView } from "@/components/AdminForms";
import { adminLogout } from "../actions";
import { getProfile, getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Masuk", robots: { index: false } };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ galat?: string }>;
}) {
  const { galat } = await searchParams;
  const s = await getSession();
  if (s) {
    const p = await getProfile(s.user.id);
    if (p?.role === "admin") redirect("/admin");
    return (
      <main className="wrap stack" style={{ paddingTop: 40 }}>
        <p className="error">Akun ini bukan admin.</p>
        <form action={adminLogout}>
          <button className="btn">Keluar</button>
        </form>
      </main>
    );
  }
  return (
    <main className="wrap stack" style={{ paddingTop: 40, maxWidth: 440 }}>
      <h1 className="h2">Masuk panel admin</h1>
      {galat === "bukan-admin" && <p className="error">Akun itu bukan admin.</p>}
      <div className="card">
        <AdminLoginView />
      </div>
    </main>
  );
}
