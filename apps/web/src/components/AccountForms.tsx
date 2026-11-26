"use client";
import { DEFAULT_SCHOOLS } from "@can/shared";
import Link from "next/link";
import { useActionState, useState } from "react";
import { completeProfile, login, register } from "@/app/akun/actions";
import { BIRTH_YEARS, type FormState } from "@/lib/forms";

function ProfileFields({ f }: { f?: Record<string, string> }) {
  const [year, setYear] = useState(f?.birthYear ?? "");
  const minor = year !== "" && 2026 - Number(year) < 18;
  return (
    <>
      <div className="field">
        <label htmlFor="nickname">Nama panggilan (tampil di peringkat)</label>
        <input
          id="nickname"
          name="nickname"
          required
          minLength={3}
          maxLength={20}
          pattern="[a-zA-Z0-9._]+"
          autoComplete="nickname"
          defaultValue={f?.nickname}
          placeholder="mis. rafi_stis"
        />
        <span className="hint">
          3–20 karakter: huruf, angka, titik, garis bawah. Jangan pakai nama lengkap.
        </span>
      </div>
      <div className="field">
        <label htmlFor="city">Kota/kabupaten</label>
        <input
          id="city"
          name="city"
          required
          maxLength={60}
          autoComplete="address-level2"
          defaultValue={f?.city}
          placeholder="mis. Kab. Bogor"
        />
      </div>
      <div className="field">
        <label htmlFor="targetSchool">Sekolah tujuan (boleh dikosongkan)</label>
        <select id="targetSchool" name="targetSchool" defaultValue={f?.targetSchool ?? ""}>
          <option value="">Belum menentukan</option>
          {DEFAULT_SCHOOLS.map((s) => (
            <option key={s.code} value={s.code}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="birthYear">Tahun lahir</label>
        <select
          id="birthYear"
          name="birthYear"
          required
          value={year}
          onChange={(e) => setYear(e.target.value)}
        >
          <option value="" disabled>
            Pilih tahun
          </option>
          {BIRTH_YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <span className="hint">
          Hanya tahun, untuk mengetahui perlu tidaknya izin orang tua/wali.
        </span>
      </div>
      <label className="check">
        <input type="checkbox" name="consent" required defaultChecked={f?.consent === "on"} />
        <span>
          Saya sudah membaca dan menyetujui{" "}
          <Link href="/privasi" target="_blank">
            kebijakan privasi
          </Link>
          .
        </span>
      </label>
      {minor && (
        <label className="check">
          <input type="checkbox" name="guardian" required defaultChecked={f?.guardian === "on"} />
          <span>
            Saya berusia di bawah 18 tahun dan sudah mendapat izin dari orang tua/wali untuk
            mendaftar.
          </span>
        </label>
      )}
    </>
  );
}

const Err = ({ s }: { s: FormState }) =>
  s?.error ? (
    <p className="error" role="alert">
      {s.error}
    </p>
  ) : null;

export function RegisterFormView({ next }: { next: string }) {
  const [state, action, pending] = useActionState(register, undefined);
  const f = state?.fields;
  return (
    <form action={action} className="stack">
      <Err s={state} />
      <input type="hidden" name="ke" value={next} />
      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={f?.email}
        />
      </div>
      <div className="field">
        <label htmlFor="password">Kata sandi</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
        <span className="hint">
          Minimal 8 karakter. Simpan baik-baik: reset kata sandi lewat email belum tersedia.
        </span>
      </div>
      <ProfileFields f={f} />
      <button className="btn main block" disabled={pending}>
        {pending ? "Mendaftarkan…" : "Daftar"}
      </button>
    </form>
  );
}

export function LoginFormView({ next }: { next: string }) {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="stack">
      <Err s={state} />
      <input type="hidden" name="ke" value={next} />
      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={state?.fields?.email}
        />
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
      <button className="btn main block" disabled={pending}>
        {pending ? "Memeriksa…" : "Masuk"}
      </button>
    </form>
  );
}

export function CompleteProfileView({ note }: { note?: string }) {
  const [state, action, pending] = useActionState(completeProfile, undefined);
  return (
    <form action={action} className="stack">
      {note && !state?.error && <p className="notice">{note}</p>}
      <Err s={state} />
      <ProfileFields f={state?.fields} />
      <button className="btn main block" disabled={pending}>
        {pending ? "Menyimpan…" : "Simpan profil"}
      </button>
    </form>
  );
}
