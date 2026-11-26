import { DEFAULT_RULE_SET, coverage } from "@can/shared";
import Link from "next/link";
import { AdminShell } from "./AdminNav";
import { fmtWib } from "@/components/Site";
import { bank, tryout } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin", robots: { index: false } };

export default async function Page() {
  await requireAdmin();
  const sum = await bank.summary();
  const n = (sub: string, st: string) =>
    sum.find((r) => r.subtest === sub && r.status === st)?.n ?? 0;
  const published = sum
    .filter((r) => r.status === "published")
    .flatMap((r) => Array.from({ length: r.n }, () => ({ subtest: r.subtest as "TWK" })));
  const cov = coverage(published, DEFAULT_RULE_SET.config.subtests);
  const evs = await tryout.listEvents();
  return (
    <AdminShell title="Ringkasan">
      <div className="card scroll" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>Subtes</th>
              <th className="n">Draf</th>
              <th className="n">Ditinjau</th>
              <th className="n">Terbit</th>
              <th className="n">Arsip</th>
              <th className="n">Butuh untuk 1 paket</th>
            </tr>
          </thead>
          <tbody>
            {cov.map((c) => (
              <tr key={c.code}>
                <td>{c.code}</td>
                <td className="n">{n(c.code, "draft")}</td>
                <td className="n">{n(c.code, "review")}</td>
                <td className="n">
                  <b>{n(c.code, "published")}</b>
                </td>
                <td className="n">{n(c.code, "archived")}</td>
                <td className="n">
                  {c.missing === 0 ? (
                    <span className="chip ok">lengkap</span>
                  ) : (
                    <span className="chip red">kurang {c.missing}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card stack">
        <h2 className="h2">Event</h2>
        {evs.length === 0 && (
          <p className="muted">
            Belum ada event. Buat di <Link href="/admin/event">Paket & event</Link>.
          </p>
        )}
        {evs.map((e) => (
          <div key={e.id}>
            {e.name} · {fmtWib(e.startsAt)}
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
