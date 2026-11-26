import { notFound } from "next/navigation";
import { AdminShell } from "../../AdminNav";
import { BulkBar } from "@/components/AdminForms";
import { bank } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Pratinjau soal", robots: { index: false } };

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  await requireAdmin();
  const { code } = await params;
  const q = await bank.getByCode(decodeURIComponent(code));
  if (!q) notFound();
  const revs = await bank.revisions(q.code);
  return (
    <AdminShell title={`${q.code} · ${q.subtest} · ${q.subTopic}`}>
      <div className="row">
        <span className="chip">status: {q.status}</span>
        <span className="chip">tingkat {q.difficulty}</span>
        <span className="chip">versi {q.version}</span>
        {q.allowQuiz && <span className="chip ok">boleh kuis</span>}
      </div>
      <div className="card stack" style={{ maxWidth: 760 }}>
        <p style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 17 }}>{q.stem}</p>
        {q.options.map((o) => (
          <div key={o.label} className={`rev-opt${o.correct || o.weight === 5 ? " good" : ""}`}>
            <b>{o.label}.</b> {o.text}{" "}
            {q.subtest === "TKP" && <span className="chip">nilai {o.weight}</span>}
          </div>
        ))}
        <p className="notice" style={{ margin: 0, whiteSpace: "pre-wrap" }}>
          <b>Pembahasan:</b> {q.explanation || "(kosong)"}
        </p>
        {q.quizExplanation && (
          <p className="small" style={{ margin: 0 }}>
            <b>Pembahasan kuis:</b> {q.quizExplanation}
          </p>
        )}
        <p className="small muted" style={{ margin: 0 }}>
          Sumber: {q.source}
        </p>
      </div>
      <form className="stack" style={{ maxWidth: 760 }}>
        <input type="hidden" name="code" value={q.code} />
        <BulkBar />
      </form>
      {revs.length > 0 && (
        <p className="small muted">{revs.length} versi lama tersimpan di riwayat.</p>
      )}
      <p className="small muted">
        Untuk mengubah isi soal: perbaiki di spreadsheet lalu impor ulang (kode yang sama → versi
        naik & kembali ke draf).
      </p>
    </AdminShell>
  );
}
