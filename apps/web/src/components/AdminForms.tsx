"use client";
import { useActionState } from "react";
import {
  adminLogin,
  adminVerifyTotp,
  bulkStatus,
  confirmTwoFactor,
  createEvent,
  createPackage,
  importQuestions,
  startTwoFactor,
  type AdminState,
} from "@/app/admin/actions";

function Msg({ s }: { s: AdminState }) {
  return (
    <>
      {s?.error && (
        <p className="error" role="alert">
          {s.error}
        </p>
      )}
      {s?.ok && (
        <p className="notice" role="status">
          {s.ok}
        </p>
      )}
      {s?.report && s.report.length > 0 && (
        <details open={!!s.error}>
          <summary className="small">Rincian ({s.report.length})</summary>
          <ul className="small" style={{ maxHeight: 240, overflow: "auto" }}>
            {s.report.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}

export function AdminLoginView() {
  const [s1, login, p1] = useActionState(adminLogin, undefined);
  const [s2, verify, p2] = useActionState(adminVerifyTotp, undefined);
  const totp = s1?.step === "totp" || s2?.step === "totp";
  if (totp)
    return (
      <form action={verify} className="stack">
        <Msg s={s2} />
        <div className="field">
          <label htmlFor="code">Kode 6 digit dari aplikasi autentikator (atau kode cadangan)</label>
          <input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            autoFocus
          />
        </div>
        <button className="btn main block" disabled={p2}>
          Verifikasi
        </button>
      </form>
    );
  return (
    <form action={login} className="stack">
      <Msg s={s1} />
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoComplete="username" />
      </div>
      <div className="field">
        <label htmlFor="password">Kata sandi</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
      </div>
      <button className="btn main block" disabled={p1}>
        Masuk
      </button>
    </form>
  );
}

export function TwoFactorSetupView() {
  const [s1, start, p1] = useActionState(startTwoFactor, undefined);
  const [s2, confirm, p2] = useActionState(confirmTwoFactor, undefined);
  if (!s1?.totpQr)
    return (
      <form action={start} className="stack">
        <Msg s={s1} />
        <p>
          Admin wajib memakai verifikasi dua langkah. Siapkan aplikasi autentikator (Google
          Authenticator, Aegis, atau 2FAS) di HP.
        </p>
        <div className="field">
          <label htmlFor="password">Kata sandi akun ini</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
          />
        </div>
        <button className="btn main" disabled={p1}>
          Mulai pasang
        </button>
      </form>
    );
  return (
    <form action={confirm} className="stack">
      <Msg s={s2} />
      <p>1. Pindai QR ini dengan aplikasi autentikator.</p>
      <img
        src={s1.totpQr}
        alt="Kode QR autentikator"
        width={220}
        height={220}
        style={{ background: "#fff", padding: 8, border: "2px solid var(--ink)", borderRadius: 8 }}
      />
      <p>
        2. Simpan <b>kode cadangan</b> ini di tempat aman (dipakai jika HP hilang). Tiap kode hanya
        sekali pakai:
      </p>
      <pre className="card" style={{ fontFamily: "var(--f-mono)", whiteSpace: "pre-wrap" }}>
        {s1.backupCodes?.join("\n")}
      </pre>
      <div className="field">
        <label htmlFor="code">3. Masukkan kode 6 digit yang tampil di aplikasi</label>
        <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" required />
      </div>
      <button className="btn main" disabled={p2}>
        Aktifkan
      </button>
    </form>
  );
}

export function ImportView() {
  const [s, action, pending] = useActionState(importQuestions, undefined);
  return (
    <form action={action} className="stack">
      <Msg s={s} />
      <div className="field">
        <label htmlFor="file">Berkas soal (.csv dari Google Sheets atau .json)</label>
        <input
          id="file"
          name="file"
          type="file"
          accept=".csv,.json,text/csv,application/json"
          required
        />
        <span className="hint">
          Semua baris dicek dulu. Jika ada satu error, tidak ada yang disimpan. Soal hasil impor
          berstatus draf.
        </span>
      </div>
      <button className="btn dark" disabled={pending}>
        {pending ? "Memeriksa…" : "Impor"}
      </button>
    </form>
  );
}

export function BulkBar() {
  const [s, action, pending] = useActionState(bulkStatus, undefined);
  return (
    <div className="stack" style={{ gap: 8 }}>
      <Msg s={s} />
      <div className="row">
        <span className="small">Soal tercentang:</span>
        <button
          className="btn sm main"
          formAction={action}
          name="to"
          value="published"
          disabled={pending}
        >
          Terbitkan
        </button>
        <button className="btn sm" formAction={action} name="to" value="review" disabled={pending}>
          Tandai ditinjau
        </button>
        <button className="btn sm" formAction={action} name="to" value="draft" disabled={pending}>
          Kembalikan ke draf
        </button>
        <button
          className="btn sm danger"
          formAction={action}
          name="to"
          value="archived"
          disabled={pending}
        >
          Arsipkan
        </button>
      </div>
    </div>
  );
}

export function PackageView() {
  const [s, action, pending] = useActionState(createPackage, undefined);
  return (
    <form action={action} className="stack">
      <Msg s={s} />
      <div className="row" style={{ alignItems: "end" }}>
        <div className="field" style={{ flex: 2 }}>
          <label htmlFor="pname">Nama paket</label>
          <input id="pname" name="name" defaultValue="Paket SKD Perdana" required />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="pslug">Kode</label>
          <input id="pslug" name="slug" defaultValue="skd-perdana" required />
        </div>
      </div>
      <button className="btn dark" disabled={pending}>
        Buat paket dari soal terbit (30/35/45)
      </button>
    </form>
  );
}

export function EventView({ packages }: { packages: { id: number; name: string }[] }) {
  const [s, action, pending] = useActionState(createEvent, undefined);
  return (
    <form action={action} className="stack">
      <Msg s={s} />
      <div className="field">
        <label htmlFor="ename">Nama event</label>
        <input id="ename" name="name" defaultValue="Tryout Perdana Catatan Abdi Negara" required />
      </div>
      <div className="row" style={{ alignItems: "end" }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="eslug">Kode (untuk link)</label>
          <input id="eslug" name="slug" defaultValue="perdana" required />
        </div>
        <div className="field" style={{ flex: 2 }}>
          <label htmlFor="pkg">Paket</label>
          <select id="pkg" name="packageId" required>
            {packages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="row" style={{ alignItems: "end" }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="date">Tanggal</label>
          <input id="date" name="date" type="date" defaultValue="2026-12-07" required />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="time">Jam mulai (WIB)</label>
          <input id="time" name="time" type="time" defaultValue="19:00" required />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="join">Batas masuk (menit)</label>
          <input id="join" name="join" type="number" min={0} max={100} defaultValue={30} required />
        </div>
      </div>
      <button className="btn dark" disabled={pending || packages.length === 0}>
        Buat event
      </button>
    </form>
  );
}
