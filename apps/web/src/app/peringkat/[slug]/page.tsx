import { DEFAULT_SCHOOLS } from "@can/shared";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Band, Footer, fmtWib } from "@/components/Site";
import { tryout } from "@/lib/db";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Papan peringkat" };

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sekolah?: string }>;
}) {
  const { slug } = await params;
  const { sekolah } = await searchParams;
  const ev = await tryout.getEvent(slug);
  if (!ev || ev.status !== "published") notFound();
  const now = new Date();
  const s = await getSession();
  if (now < ev.resultsAt) {
    return (
      <>
        <Band>
          <h1 className="display" style={{ marginTop: 14 }}>
            Papan peringkat
          </h1>
        </Band>
        <main className="wrap stack">
          <p className="notice">
            Peringkat {ev.name} diumumkan setelah tryout selesai, {fmtWib(ev.resultsAt)}.
          </p>
          <Link className="btn" href="/">
            Beranda
          </Link>
        </main>
        <Footer />
      </>
    );
  }
  const school = DEFAULT_SCHOOLS.some((x) => x.code === sekolah) ? sekolah : undefined;
  const rows = await tryout.leaderboard(ev.id, { limit: 500, ...(school ? { school } : {}) });
  const mineIdx = s ? rows.findIndex((r) => r.userId === s.user.id) : -1;
  return (
    <>
      <Band>
        <h1 className="display" style={{ marginTop: 14 }}>
          Papan peringkat
        </h1>
        <p className="hand">{ev.name}</p>
      </Band>
      <main className="wrap stack">
        <div className="row small">
          <Link className={`chip${!school ? " ok" : ""}`} href={`/peringkat/${slug}`}>
            Semua sekolah
          </Link>
          {DEFAULT_SCHOOLS.filter((x) => x.code !== "LAINNYA").map((x) => (
            <Link
              key={x.code}
              className={`chip${school === x.code ? " ok" : ""}`}
              href={`/peringkat/${slug}?sekolah=${x.code}`}
            >
              {x.code}
            </Link>
          ))}
        </div>
        {mineIdx >= 0 && (
          <p className="notice">
            Peringkatmu: <b>#{mineIdx + 1}</b> dari {rows.length} peserta
            {school ? ` (${school})` : ""}.
          </p>
        )}
        <div className="card scroll" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th className="n">#</th>
                <th>Peserta</th>
                <th className="n">TWK</th>
                <th className="n">TIU</th>
                <th className="n">TKP</th>
                <th className="n">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={r.userId}
                  style={i === mineIdx ? { background: "var(--gold-l)" } : undefined}
                >
                  <td className="n">{i + 1}</td>
                  <td>
                    {r.nickname}
                    <div className="small muted">{r.city}</div>
                  </td>
                  <td className="n">{r.twk}</td>
                  <td className="n">{r.tiu}</td>
                  <td className="n">{r.tkp}</td>
                  <td className="n">
                    <b>{r.total}</b>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted">
                    Belum ada peserta.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="small muted">
          Hanya menampilkan nama panggilan & kota. Nilai seri diurutkan dari TKP, TIU, TWK, lalu
          waktu pengerjaan tercepat.
        </p>
      </main>
      <Footer />
    </>
  );
}
