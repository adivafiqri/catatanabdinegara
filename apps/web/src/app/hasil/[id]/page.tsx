import { RuleSetConfigSchema, maxScore, passingStatus } from "@can/shared";
import { TryoutError } from "@can/db";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Band, Footer, fmtDur, fmtWib } from "@/components/Site";
import { tryout } from "@/lib/db";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Hasil tryout", robots: { index: false } };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { session } = await requireUser(`/hasil/${id}`);
  let r;
  try {
    r = await tryout.result(id, session.user.id);
  } catch (e) {
    if (e instanceof TryoutError) notFound();
    throw e;
  }
  const a = r.attempt;
  if (a.status === "in_progress") redirect(`/ujian/${id}`);
  const cfg = RuleSetConfigSchema.parse(r.ruleSet.config);
  const sub = { TWK: a.scoreTwk ?? 0, TIU: a.scoreTiu ?? 0, TKP: a.scoreTkp ?? 0 };
  const maxTotal = cfg.subtests.reduce((n, s) => n + maxScore(s), 0);
  const pct = (a.scoreTotal ?? 0) / maxTotal;
  const face = pct >= 0.75 ? "pet-ketawa" : pct >= 0.5 ? "pet-senyum" : "pet-mikir";
  const pass = passingStatus(cfg, sub);
  const now = new Date();
  const reviewOpen = now >= r.event.resultsAt;
  const review = reviewOpen ? await tryout.review(id, session.user.id, now) : [];

  return (
    <>
      <Band>
        <div style={{ textAlign: "center", paddingTop: 10 }}>
          <img src={`/img/${face}.svg`} alt="Maskot" width={150} height={158} />
          <div className="bigscore">
            {a.scoreTotal}
            <small
              style={{
                fontSize: 22,
                color: "var(--card)",
                WebkitTextStroke: 0,
                textShadow: "none",
              }}
            >
              {" "}
              / {maxTotal}
            </small>
          </div>
          <p className="hand">{r.event.name}</p>
        </div>
      </Band>
      <main className="wrap stack">
        <div className="medals" style={{ margin: "6px 4px" }}>
          {cfg.subtests.map((s) => (
            <div className="medal" key={s.code}>
              <div className="disc">{sub[s.code]}</div>
              <span className="small" style={{ fontWeight: 600 }}>
                {s.code} / {maxScore(s)}
              </span>
            </div>
          ))}
        </div>
        <div className="card stack">
          <span>
            Waktu pengerjaan: <b>{fmtDur(a.durationSeconds ?? 0)}</b>
            {a.status === "expired_submitted" ? " (dikumpulkan otomatis saat waktu habis)" : ""}
          </span>
          {pass.shown ? (
            <span>
              Status ambang batas: <b>{pass.passed ? "aman" : "belum aman"}</b>
            </span>
          ) : (
            <span className="small muted">
              Status &quot;aman/belum aman&quot; tidak ditampilkan karena ambang batas tahun ini
              belum diumumkan resmi.
            </span>
          )}
          {a.flagStatus === "flagged" && (
            <span className="notice">
              Hasilmu sedang ditinjau admin karena waktu pengerjaannya sangat singkat.
            </span>
          )}
        </div>
        {!reviewOpen && (
          <div className="notice">
            Pembahasan & papan peringkat dibuka setelah tryout selesai ({fmtWib(r.event.resultsAt)}
            ), supaya adil untuk peserta yang masih mengerjakan.
          </div>
        )}
        <div className="row">
          <Link className="btn main" href={`/peringkat/${r.event.slug}`}>
            Papan peringkat
          </Link>
          <Link className="btn" href="/">
            Beranda
          </Link>
        </div>
        {reviewOpen && (
          <section className="stack">
            <h2 className="h2">Pembahasan</h2>
            {review.map((q) => (
              <details key={q.no} className="card">
                <summary style={{ cursor: "pointer", fontWeight: 600 }}>
                  {q.no}. {q.subtest} · {q.chosen ? `jawabanmu ${q.chosen}` : "tidak dijawab"}
                  {q.subtest !== "TKP" &&
                    q.chosen &&
                    (q.options.find((o) => o.label === q.chosen)?.correct ? " ✓" : " ✗")}
                </summary>
                <div className="stack" style={{ marginTop: 10 }}>
                  <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{q.stem}</p>
                  {q.options.map((o) => (
                    <div
                      key={o.label}
                      className={`rev-opt${o.correct || o.weight === 5 ? " good" : ""}${q.chosen === o.label ? " mine" : ""}`}
                    >
                      <b>{o.label}.</b> {o.text}
                      {q.subtest === "TKP" && (
                        <span className="chip" style={{ marginLeft: 6 }}>
                          nilai {o.weight}
                        </span>
                      )}
                    </div>
                  ))}
                  <p className="notice" style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                    {q.explanation || "Pembahasan belum tersedia."}
                  </p>
                </div>
              </details>
            ))}
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
