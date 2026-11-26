"use client";
// Ruang ujian mirip CAT: panel nomor, ragu-ragu, timer server, simpan otomatis + antrean offline.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Opt = { label: string; text: string };
type Q = {
  id: string;
  no: number;
  subtest: "TWK" | "TIU" | "TKP";
  stem: string;
  image: string | null;
  options: Opt[];
};
type Ans = Record<string, { o: string | null; f: boolean }>;

export interface ExamProps {
  attemptId: string;
  eventName: string;
  deadlineAt: string;
  serverNow: string;
  questions: Q[];
  answers: Ans;
}

const SAVE_DEBOUNCE = 2000;
const storeKey = (id: string) => `can-ujian-${id}`;
const readPending = (id: string): Ans => {
  try {
    return JSON.parse(localStorage.getItem(storeKey(id)) ?? "{}") as Ans;
  } catch {
    return {};
  }
};
const writePending = (id: string, v: Ans) => {
  try {
    if (Object.keys(v).length) localStorage.setItem(storeKey(id), JSON.stringify(v));
    else localStorage.removeItem(storeKey(id));
  } catch {
    /* penyimpanan lokal tidak tersedia: tetap jalan, hanya tanpa cadangan offline */
  }
};

export default function ExamClient(p: ExamProps) {
  const offset = useMemo(() => new Date(p.serverNow).getTime() - Date.now(), [p.serverNow]);
  const deadline = useMemo(() => new Date(p.deadlineAt).getTime(), [p.deadlineAt]);
  const [answers, setAnswers] = useState<Ans>(p.answers);
  const [idx, setIdx] = useState(0);
  const [left, setLeft] = useState(() => Math.max(0, deadline - (Date.now() + offset)));
  const [saveState, setSaveState] = useState<"ok" | "saving" | "offline" | "error">("ok");
  const [confirm, setConfirm] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [fatal, setFatal] = useState<string | null>(null);
  const pending = useRef<Ans>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflight = useRef(false);

  const go = useCallback((url: string) => window.location.assign(url), []);

  const flush = useCallback(async (): Promise<boolean> => {
    if (inflight.current) return false;
    const batch = { ...pending.current };
    if (!Object.keys(batch).length) return true;
    inflight.current = true;
    setSaveState("saving");
    try {
      const r = await fetch(`/api/ujian/${p.attemptId}/simpan`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ answers: batch }),
        keepalive: true,
      });
      if (r.ok) {
        for (const k of Object.keys(batch))
          if (pending.current[k] === batch[k]) delete pending.current[k];
        writePending(p.attemptId, pending.current);
        setSaveState(Object.keys(pending.current).length ? "saving" : "ok");
        return true;
      }
      if (r.status === 409) {
        // Sudah dikumpulkan / waktu habis: ke halaman hasil.
        writePending(p.attemptId, {});
        go(`/hasil/${p.attemptId}`);
        return false;
      }
      if (r.status === 401)
        setFatal(
          "Sesi berakhir. Muat ulang halaman lalu masuk lagi; jawabanmu tersimpan di HP ini.",
        );
      setSaveState("error");
      return false;
    } catch {
      setSaveState("offline");
      return false;
    } finally {
      inflight.current = false;
    }
  }, [p.attemptId, go]);

  const schedule = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), SAVE_DEBOUNCE);
  }, [flush]);

  // Saat dibuka: gabungkan jawaban yang belum terkirim (mis. sinyal putus / HP mati).
  useEffect(() => {
    const local = readPending(p.attemptId);
    if (Object.keys(local).length) {
      pending.current = { ...local };
      setAnswers((a) => ({ ...a, ...local }));
      void flush();
    }
  }, [p.attemptId, flush]);

  // Timer + coba kirim ulang berkala saat offline.
  useEffect(() => {
    const t = setInterval(() => {
      const l = Math.max(0, deadline - (Date.now() + offset));
      setLeft(l);
      if (Object.keys(pending.current).length && !inflight.current) void flush();
    }, 1000);
    return () => clearInterval(t);
  }, [deadline, offset, flush]);

  // Simpan saat tab disembunyikan / ditutup.
  useEffect(() => {
    const h = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    document.addEventListener("visibilitychange", h);
    window.addEventListener("online", h);
    return () => {
      document.removeEventListener("visibilitychange", h);
      window.removeEventListener("online", h);
    };
  }, [flush]);

  const finish = useCallback(async () => {
    setFinishing(true);
    for (let i = 0; i < 3 && Object.keys(pending.current).length; i++) await flush();
    try {
      const r = await fetch(`/api/ujian/${p.attemptId}/selesai`, { method: "POST" });
      if (r.ok || r.status === 409) {
        writePending(p.attemptId, {});
        go(`/hasil/${p.attemptId}`);
        return;
      }
    } catch {
      /* jatuh ke pesan di bawah */
    }
    setFinishing(false);
    setFatal(
      "Gagal mengumpulkan karena koneksi. Jawabanmu aman di HP ini; tekan Selesai lagi saat sinyal kembali.",
    );
  }, [flush, go, p.attemptId]);

  // Waktu habis: kumpulkan otomatis.
  useEffect(() => {
    if (left === 0 && !finishing) void finish();
  }, [left, finishing, finish]);

  const q = p.questions[idx]!;
  const cur = answers[q.id] ?? { o: null, f: false };
  const update = (v: { o: string | null; f: boolean }) => {
    setAnswers((a) => ({ ...a, [q.id]: v }));
    pending.current[q.id] = v;
    writePending(p.attemptId, pending.current);
    schedule();
  };
  const answered = p.questions.filter((x) => answers[x.id]?.o).length;
  const flagged = p.questions.filter((x) => answers[x.id]?.f).length;
  const mm = Math.floor(left / 60000);
  const hh = Math.floor(mm / 60);
  const clock = `${String(hh).padStart(2, "0")}:${String(mm % 60).padStart(2, "0")}:${String(Math.floor(left / 1000) % 60).padStart(2, "0")}`;
  const saveLabel = {
    ok: "Tersimpan",
    saving: "Menyimpan…",
    offline: "Offline: jawaban disimpan di HP",
    error: "Gagal menyimpan, mencoba lagi…",
  }[saveState];

  return (
    <div className="exam">
      <div className="ex-top">
        <span className="ex-sub">
          {q.subtest} · Soal {q.no} dari {p.questions.length}
        </span>
        <span
          className={`ex-timer${left < 5 * 60_000 ? " low" : ""}`}
          aria-label="Sisa waktu"
          role="timer"
        >
          {clock}
        </span>
        <span
          className={`ex-save${saveState === "ok" || saveState === "saving" ? "" : " bad"}`}
          aria-live="polite"
        >
          {saveLabel}
        </span>
      </div>
      {fatal && (
        <p className="error" role="alert" style={{ margin: 12 }}>
          {fatal}
        </p>
      )}
      <div className="ex-layout">
        <div className="ex-body">
          <p className="ex-stem">{q.stem}</p>
          {q.image && (
            <img
              src={q.image}
              alt={`Gambar soal nomor ${q.no}`}
              style={{
                maxWidth: "100%",
                background: "#fff",
                border: "1.5px solid var(--line)",
                borderRadius: 8,
              }}
            />
          )}
          <ul className="opts">
            {q.options.map((o) => (
              <li key={o.label}>
                <button
                  type="button"
                  className="opt"
                  aria-pressed={cur.o === o.label}
                  onClick={() => update({ ...cur, o: cur.o === o.label ? null : o.label })}
                >
                  <span className="k">{o.label}</span>
                  <span>{o.text}</span>
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="flagbtn"
            aria-pressed={cur.f}
            onClick={() => update({ ...cur, f: !cur.f })}
          >
            {cur.f ? "✓ Ditandai ragu-ragu" : "Tandai ragu-ragu"}
          </button>
          <div className="row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
            <button
              type="button"
              className="btn"
              disabled={idx === 0}
              onClick={() => setIdx((i) => i - 1)}
            >
              Sebelumnya
            </button>
            <button
              type="button"
              className="btn dark"
              disabled={idx === p.questions.length - 1}
              onClick={() => setIdx((i) => i + 1)}
            >
              Berikutnya
            </button>
          </div>
        </div>
        <nav className="ex-nav" aria-label="Nomor soal">
          <div className="row small" style={{ justifyContent: "space-between", fontWeight: 600 }}>
            <span>Nomor soal</span>
            <span className="muted">
              {answered} dijawab · {flagged} ragu
            </span>
          </div>
          <div className="legend">
            <span>
              <i style={{ background: "var(--brown)" }} />
              Dijawab
            </span>
            <span>
              <i style={{ background: "var(--gold-l)" }} />
              Ragu
            </span>
            <span>
              <i style={{ background: "#fff" }} />
              Belum
            </span>
          </div>
          {(["TWK", "TIU", "TKP"] as const).map((sub) => (
            <div key={sub} className="stack" style={{ gap: 6 }}>
              <span className="small" style={{ fontWeight: 600 }}>
                {sub}
              </span>
              <div className="grid-n">
                {p.questions
                  .map((x, i) => [x, i] as const)
                  .filter(([x]) => x.subtest === sub)
                  .map(([x, i]) => {
                    const a = answers[x.id];
                    const cls = [a?.f ? "r" : a?.o ? "a" : "", i === idx ? "c" : ""]
                      .join(" ")
                      .trim();
                    return (
                      <button
                        key={x.id}
                        type="button"
                        className={cls}
                        onClick={() => setIdx(i)}
                        aria-label={`Soal ${x.no}${a?.o ? ", dijawab" : ""}${a?.f ? ", ragu" : ""}`}
                      >
                        {x.no}
                      </button>
                    );
                  })}
              </div>
            </div>
          ))}
          <button
            type="button"
            className="btn danger block"
            onClick={() => setConfirm(true)}
            disabled={finishing}
          >
            Selesai &amp; kumpulkan
          </button>
        </nav>
      </div>
      {confirm && (
        <div className="modal-back" role="dialog" aria-modal="true" aria-labelledby="konf">
          <div className="modal">
            <h2 id="konf" className="h2">
              Kumpulkan sekarang?
            </h2>
            <p style={{ margin: 0 }}>
              Kamu sudah menjawab <b>{answered}</b> dari {p.questions.length} soal
              {flagged ? `, dan ${flagged} soal masih ditandai ragu` : ""}. Setelah dikumpulkan,
              jawaban tidak bisa diubah.
            </p>
            {answered < p.questions.length && (
              <p className="notice" style={{ margin: 0 }}>
                Soal kosong bernilai 0. Masih ada waktu {clock}.
              </p>
            )}
            <div className="row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
              <button
                type="button"
                className="btn"
                onClick={() => setConfirm(false)}
                disabled={finishing}
              >
                Kembali
              </button>
              <button
                type="button"
                className="btn dark"
                onClick={() => void finish()}
                disabled={finishing}
              >
                {finishing ? "Mengumpulkan…" : "Ya, kumpulkan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
