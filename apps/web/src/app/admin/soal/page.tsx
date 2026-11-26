import { DEFAULT_SUB_TOPICS } from "@can/shared";
import { QUESTION_STATUSES, type QuestionStatus } from "@can/db";
import Link from "next/link";
import { AdminShell } from "../AdminNav";
import { BulkBar, ImportView } from "@/components/AdminForms";
import { bank } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Bank soal", robots: { index: false } };

const LABEL: Record<string, string> = {
  draft: "draf",
  review: "ditinjau",
  published: "terbit",
  archived: "arsip",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const subtest = ["TWK", "TIU", "TKP"].includes(sp.subtes ?? "")
    ? (sp.subtes as "TWK")
    : undefined;
  const status = (QUESTION_STATUSES as readonly string[]).includes(sp.status ?? "")
    ? (sp.status as QuestionStatus)
    : undefined;
  const subTopic = DEFAULT_SUB_TOPICS.some((t) => t.slug === sp.materi) ? sp.materi : undefined;
  const page = Math.max(1, Number(sp.hal) || 1);
  const { rows, total } = await bank.list({
    ...(subtest ? { subtest } : {}),
    ...(status ? { status } : {}),
    ...(subTopic ? { subTopic } : {}),
    ...(sp.cari ? { search: sp.cari } : {}),
    limit: 200,
    offset: (page - 1) * 200,
  });
  return (
    <AdminShell title="Bank soal">
      <details className="card">
        <summary style={{ fontWeight: 600, cursor: "pointer" }}>Impor CSV/JSON</summary>
        <div style={{ marginTop: 12 }}>
          <ImportView />
        </div>
      </details>
      <form className="row card" method="get">
        <select name="subtes" defaultValue={subtest ?? ""} style={{ width: "auto" }}>
          <option value="">Semua subtes</option>
          <option>TWK</option>
          <option>TIU</option>
          <option>TKP</option>
        </select>
        <select name="status" defaultValue={status ?? ""} style={{ width: "auto" }}>
          <option value="">Semua status</option>
          {QUESTION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {LABEL[s]}
            </option>
          ))}
        </select>
        <select name="materi" defaultValue={subTopic ?? ""} style={{ width: "auto" }}>
          <option value="">Semua sub-materi</option>
          {DEFAULT_SUB_TOPICS.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.slug}
            </option>
          ))}
        </select>
        <input
          name="cari"
          placeholder="Cari kode / teks"
          defaultValue={sp.cari ?? ""}
          style={{ width: 200 }}
        />
        <button className="btn sm">Saring</button>
        <span className="small muted">{total} soal</span>
      </form>
      <form className="stack">
        <BulkBar />
        <div className="card scroll" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th>
                  <span className="small">✓</span>
                </th>
                <th>Kode</th>
                <th>Status</th>
                <th>Tk</th>
                <th>Soal</th>
                <th>Kunci</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((q) => (
                <tr key={q.code}>
                  <td>
                    <input
                      type="checkbox"
                      name="code"
                      value={q.code}
                      aria-label={`Pilih ${q.code}`}
                    />
                  </td>
                  <td>
                    <Link href={`/admin/soal/${q.code}`}>{q.code}</Link>
                    <div className="small muted">{q.subTopic}</div>
                  </td>
                  <td>
                    <span className={`chip${q.status === "published" ? " ok" : ""}`}>
                      {LABEL[q.status]}
                    </span>
                    {q.version > 1 && <div className="small muted">v{q.version}</div>}
                  </td>
                  <td className="n">{q.difficulty}</td>
                  <td style={{ maxWidth: 480 }}>
                    {q.stem.length > 140 ? `${q.stem.slice(0, 140)}…` : q.stem}
                  </td>
                  <td>
                    {q.subtest === "TKP" ? (
                      <span className="small">{q.options.map((o) => o.weight).join(" ")}</span>
                    ) : (
                      q.options.find((o) => o.correct)?.label
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </form>
      {total > page * 200 && (
        <Link
          className="btn sm"
          href={`?${new URLSearchParams({ ...sp, hal: String(page + 1) } as Record<string, string>)}`}
        >
          Halaman berikutnya
        </Link>
      )}
    </AdminShell>
  );
}
