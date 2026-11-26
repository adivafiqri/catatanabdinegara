"use server";
import { profiles } from "@can/db";
import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  LoginForm,
  PRIVACY_VERSION,
  ProfileForm,
  RegisterForm,
  firstError,
  isMinor,
  type FormState,
} from "@/lib/forms";
import { getSession } from "@/lib/session";

const raw = (f: FormData) => Object.fromEntries([...f.entries()].map(([k, v]) => [k, String(v)]));
const keep = (f: FormData) => {
  const { password: _p, ...rest } = raw(f);
  return rest;
};
/** Hanya izinkan tujuan internal (cegah open redirect). */
const safeNext = (v: string | undefined) =>
  v && v.startsWith("/") && !v.startsWith("//") ? v : "/";

async function insertProfile(userId: string, p: ReturnType<typeof ProfileForm.parse>) {
  const now = new Date();
  await db.insert(profiles).values({
    userId,
    nickname: p.nickname,
    city: p.city,
    targetSchool: p.targetSchool || null,
    birthYear: p.birthYear,
    consentPrivacyVersion: PRIVACY_VERSION,
    consentAt: now,
    guardianAckAt: isMinor(p.birthYear) ? now : null,
  });
}
const isUniqueViolation = (e: unknown) =>
  String(
    (e as { cause?: { code?: string }; code?: string })?.cause?.code ??
      (e as { code?: string })?.code,
  ) === "23505";

export async function register(_: FormState, form: FormData): Promise<FormState> {
  const parsed = RegisterForm.safeParse(raw(form));
  if (!parsed.success) return { error: firstError(parsed.error), fields: keep(form) };
  const v = parsed.data;
  try {
    const res = await auth.api.signUpEmail({
      body: { email: v.email, password: v.password, name: v.nickname },
      headers: await headers(),
    });
    await insertProfile(res.user.id, v);
  } catch (e) {
    if (isUniqueViolation(e)) {
      // Akun sudah dibuat tapi nama panggilan bentrok: arahkan melengkapi profil.
      redirect("/lengkapi?galat=nama-dipakai");
    }
    if (e instanceof APIError) {
      const msg = /exist/i.test(e.message)
        ? "Email itu sudah terdaftar. Silakan masuk."
        : "Pendaftaran gagal. Periksa isian lalu coba lagi.";
      return { error: msg, fields: keep(form) };
    }
    throw e;
  }
  redirect(safeNext(String(form.get("ke") ?? "")));
}

export async function completeProfile(_: FormState, form: FormData): Promise<FormState> {
  const s = await getSession();
  if (!s) redirect("/masuk");
  const parsed = ProfileForm.safeParse(raw(form));
  if (!parsed.success) return { error: firstError(parsed.error), fields: keep(form) };
  try {
    await insertProfile(s.user.id, parsed.data);
  } catch (e) {
    if (isUniqueViolation(e))
      return { error: "Nama panggilan itu sudah dipakai. Coba yang lain.", fields: keep(form) };
    throw e;
  }
  redirect("/");
}

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const parsed = LoginForm.safeParse(raw(form));
  if (!parsed.success) return { error: firstError(parsed.error), fields: keep(form) };
  try {
    await auth.api.signInEmail({ body: parsed.data, headers: await headers() });
  } catch (e) {
    if (e instanceof APIError) {
      const msg =
        e.status === "TOO_MANY_REQUESTS"
          ? "Terlalu banyak percobaan. Tunggu beberapa menit."
          : "Email atau kata sandi salah.";
      return { error: msg, fields: keep(form) };
    }
    throw e;
  }
  redirect(safeNext(String(form.get("ke") ?? "")));
}

export async function logout() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/");
}
