import { attempts, events, packages, profiles } from "@can/db";
import { DEFAULT_RULE_SET, coverage } from "@can/shared";
import { and, desc, eq } from "drizzle-orm";
import { AdminShell } from "../AdminNav";
import { setFlag } from "../actions";
import { EventView, PackageView } from "@/components/AdminForms";
import { fmtDur, fmtWib } from "@/components/Site";
import { bank, db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Paket & event", robots: { index: false } };

export default async function Page() {
  await requireAdmin();
  const pkgs = await db.select().from(packages).orderBy(desc(packages.id));
  const evs = await db.select().from(events).orderBy(desc(events.startsAt));
  const published = (await bank.exportAll("published")).map((q) => ({ subtest: q.subtest }));
  const cov = coverage(published, DEFAULT_RULE_SET.config.subtests);
  const flagged = await db
    .select({
      id: attempts.id,
      nickname: profiles.nickname,
      total: attempts.scoreTotal,
      dur: attempts.durationSeconds,
      reasons: attempts.flagReasons,
      ev: events.name,
    })
    .from(attempts)
    .innerJoin(profiles, eq(profiles.userId, attempts.userId))
    .innerJoin(events, eq(events.id, attempts.eventId))
    .where(and(eq(attempts.flagStatus, "flagged")));
  const counts = await Promise.all(
    evs.map(
      async (e) =>
        (await db.select({ id: attempts.id }).from(attempts).where(eq(attempts.eventId, e.id)))
          .length,
    ),
  );
  return (
    <AdminShell title="Paket & event">
      <div className="card stack">
        <h2 className="h2">1. Paket soal</h2>
        <p className="small">
          Soal terbit: {cov.map((c) => `${c.code} ${c.have}/${c.need}`).join(" · ")}
        </p>
        {pkgs.map((p) => (
          <div key={p.id} className="small">
            • {p.name} <span className="muted">({p.slug})</span>
          </div>
        ))}
        <PackageView />
      </div>
      <div className="card stack">
        <h2 className="h2">2. Event</h2>
        {evs.map((e, i) => (
          <div key={e.id} className="small">
            • <b>{e.name}</b> ({e.slug}) · mulai {fmtWib(e.startsAt)} · masuk s.d.{" "}
            {fmtWib(e.joinUntil)} · selesai {fmtWib(e.endsAt)} · {counts[i]} peserta
          </div>
        ))}
        <EventView packages={pkgs.map((p) => ({ id: p.id, name: p.name }))} />
      </div>
      <div className="card stack">
        <h2 className="h2">3. Skor janggal ({flagged.length})</h2>
        {flagged.length === 0 && <p className="small muted">Tidak ada.</p>}
        {flagged.map((f) => (
          <div key={f.id} className="row small">
            <span>
              <b>{f.nickname}</b> · {f.ev} · skor {f.total} · {fmtDur(f.dur ?? 0)} ·{" "}
              {f.reasons.join(", ")}
            </span>
            <form action={setFlag}>
              <input type="hidden" name="attemptId" value={f.id} />
              <button className="btn sm" name="to" value="cleared">
                Sahkan
              </button>
            </form>
            <form action={setFlag}>
              <input type="hidden" name="attemptId" value={f.id} />
              <button className="btn sm danger" name="to" value="excluded">
                Keluarkan dari peringkat
              </button>
            </form>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
