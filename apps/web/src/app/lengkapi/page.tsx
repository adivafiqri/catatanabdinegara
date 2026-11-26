import { redirect } from "next/navigation";
import { CompleteProfileView } from "@/components/AccountForms";
import { Band, Footer } from "@/components/Site";
import { getProfile, getSession } from "@/lib/session";

export const metadata = { title: "Lengkapi profil" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ galat?: string }>;
}) {
  const s = await getSession();
  if (!s) redirect("/masuk");
  if (await getProfile(s.user.id)) redirect("/");
  const { galat } = await searchParams;
  return (
    <>
      <Band>
        <h1 className="display" style={{ marginTop: 14 }}>
          Lengkapi profil
        </h1>
      </Band>
      <main className="wrap stack">
        <div className="card">
          <CompleteProfileView
            note={
              galat === "nama-dipakai"
                ? "Akunmu sudah dibuat, tapi nama panggilan tadi sudah dipakai orang lain. Pilih nama lain, ya."
                : undefined
            }
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
