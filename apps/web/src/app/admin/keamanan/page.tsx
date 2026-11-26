import { redirect } from "next/navigation";
import { TwoFactorSetupView } from "@/components/AdminForms";
import { getProfile, getSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Keamanan", robots: { index: false } };

export default async function Page() {
  const s = await getSession();
  if (!s) redirect("/admin/masuk");
  const p = await getProfile(s.user.id);
  if (p?.role !== "admin") redirect("/admin/masuk?galat=bukan-admin");
  if ((s.user as { twoFactorEnabled?: boolean | null }).twoFactorEnabled) redirect("/admin");
  return (
    <main className="wrap stack" style={{ paddingTop: 40, maxWidth: 520 }}>
      <h1 className="h2">Pasang verifikasi dua langkah</h1>
      <div className="card">
        <TwoFactorSetupView />
      </div>
    </main>
  );
}
