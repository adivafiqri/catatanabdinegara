"use server";
import {
  BankError,
  QUESTION_STATUSES,
  TryoutError,
  attempts,
  ruleSets,
  type QuestionStatus,
} from "@can/db";
import { importCsv, importJson } from "@can/shared";
import { APIError } from "better-auth/api";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { auth } from "@/lib/auth";
import { bank, db, tryout } from "@/lib/db";
import { getProfile, getSession, requireAdmin } from "@/lib/session";

export type AdminState =
  | {
      error?: string;
      ok?: string;
      step?: "totp";
      totpQr?: string;
      backupCodes?: string[];
      report?: string[];
    }
  | undefined;

// ---------- login admin (dengan TOTP) ----------
export async function adminLogin(_: AdminState, form: FormData): Promise<AdminState> {
  const email = String(form.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(form.get("password") ?? "");
  try {
    const r = (await auth.api.signInEmail({
      body: { email, password },
      headers: await headers(),
    })) as { twoFactorRedirect?: boolean };
    if (r?.twoFactorRedirect) return { step: "totp" };
  } catch (e) {
    if (e instanceof APIError)
      return {
        error:
          e.status === "TOO_MANY_REQUESTS"
            ? "Terlalu banyak percobaan. Tunggu beberapa menit."
            : "Email atau kata sandi salah.",
      };
    throw e;
  }
  redirect("/admin");
}

export async function adminVerifyTotp(_: AdminState, form: FormData): Promise<AdminState> {
  const code = String(form.get("code") ?? "").replace(/\s/g, "");
  try {
    if (/^\d{6}$/.test(code))
      await auth.api.verifyTOTP({ body: { code }, headers: await headers() });
    else await auth.api.verifyBackupCode({ body: { code }, headers: await headers() });
  } catch (e) {
    if (e instanceof APIError) return { step: "totp", error: "Kode salah atau kedaluwarsa." };
    throw e;
  }
  redirect("/admin");
}

// ---------- pasang 2FA (wajib untuk admin) ----------
async function requireAdminRoleOnly() {
  const s = await getSession();
  if (!s) redirect("/admin/masuk");
  const p = await getProfile(s.user.id);
  if (p?.role !== "admin") redirect("/admin/masuk?galat=bukan-admin");
  return s;
}

export async function startTwoFactor(_: AdminState, form: FormData): Promise<AdminState> {
  await requireAdminRoleOnly();
  try {
    const r = await auth.api.enableTwoFactor({
      body: { password: String(form.get("password") ?? "") },
      headers: await headers(),
    });
    if (r.method !== "totp") return { error: "Metode 2FA tidak didukung." };
    const totpQr = await QRCode.toDataURL(r.totpURI, { margin: 1, width: 220 });
    return { step: "totp", totpQr, backupCodes: r.backupCodes };
  } catch (e) {
    if (e instanceof APIError) return { error: "Kata sandi salah." };
    throw e;
  }
}

export async function confirmTwoFactor(prev: AdminState, form: FormData): Promise<AdminState> {
  await requireAdminRoleOnly();
  try {
    await auth.api.verifyTOTP({
      body: { code: String(form.get("code") ?? "").replace(/\s/g, "") },
      headers: await headers(),
    });
  } catch (e) {
    if (e instanceof APIError)
      return {
        ...prev,
        error: "Kode salah. Pastikan jam HP sudah otomatis lalu coba kode berikutnya.",
      };
    throw e;
  }
  redirect("/admin");
}

export async function adminLogout() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/admin/masuk");
}

// ---------- bank soal ----------
export async function importQuestions(_: AdminState, form: FormData): Promise<AdminState> {
  await requireAdmin();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Pilih berkas CSV atau JSON." };
  if (file.size > 2_000_000) return { error: "Berkas terlalu besar (maks. 2 MB)." };
  const text = await file.text();
  const ctx = await bank.validateContext();
  const r = file.name.toLowerCase().endsWith(".json")
    ? importJson(text, ctx)
    : importCsv(text, ctx);
  const report = r.issues
    .slice(0, 200)
    .map(
      (i) =>
        `${i.level === "error" ? "ERROR" : "Peringatan"} baris ${i.row}${i.code ? ` (${i.code})` : ""} · ${i.field}: ${i.message}`,
    );
  if (!r.ok)
    return {
      error: `Impor dibatalkan: ada ${r.issues.filter((i) => i.level === "error").length} error. Tidak ada yang disimpan.`,
      report,
    };
  try {
    const res = await bank.importQuestions(r.questions, null);
    revalidatePath("/admin/soal");
    return {
      ok: `Impor selesai: ${res.created} baru, ${res.updated} diperbarui (kembali ke draf), ${res.unchanged} tidak berubah.`,
      report,
    };
  } catch (e) {
    if (e instanceof BankError) return { error: e.message, report };
    throw e;
  }
}

export async function bulkStatus(_: AdminState, form: FormData): Promise<AdminState> {
  await requireAdmin();
  const to = String(form.get("to") ?? "") as QuestionStatus;
  if (!(QUESTION_STATUSES as readonly string[]).includes(to))
    return { error: "Status tidak valid." };
  const codes = form
    .getAll("code")
    .map(String)
    .filter((c) => /^[A-Z]{3}-[A-Z0-9]{2,8}-\d{3,5}$/.test(c));
  if (!codes.length) return { error: "Centang minimal satu soal." };
  const fails: string[] = [];
  for (const c of codes) {
    try {
      // Terbitkan langsung dari draf: lewati "ditinjau" otomatis (admin sudah meninjau).
      const q = await bank.getByCode(c);
      if (to === "published" && q?.status === "draft") await bank.setStatus(c, "review", null);
      await bank.setStatus(c, to, null);
    } catch (e) {
      fails.push(`${c}: ${e instanceof BankError ? e.message : "gagal"}`);
    }
  }
  revalidatePath("/admin/soal");
  return fails.length
    ? { error: `${codes.length - fails.length} berhasil, ${fails.length} gagal.`, report: fails }
    : { ok: `${codes.length} soal diubah menjadi ${to}.` };
}

// ---------- paket & event ----------
export async function createPackage(_: AdminState, form: FormData): Promise<AdminState> {
  await requireAdmin();
  const [rs] = await db.select().from(ruleSets).where(eq(ruleSets.status, "active"));
  if (!rs) return { error: "Aturan SKD aktif tidak ditemukan." };
  const name = String(form.get("name") ?? "").trim() || "Paket SKD";
  const slug = String(form.get("slug") ?? "")
    .trim()
    .toLowerCase();
  if (!/^[a-z0-9-]{3,40}$/.test(slug))
    return { error: "Kode paket: huruf kecil, angka, strip (3–40)." };
  try {
    const p = await tryout.createPackageFromPublished({ slug, name, ruleSetId: rs.id });
    revalidatePath("/admin/event");
    return { ok: `Paket "${p.name}" dibuat (110 soal).` };
  } catch (e) {
    if (e instanceof TryoutError) return { error: e.message };
    if (String((e as { cause?: { code?: string } }).cause?.code) === "23505")
      return { error: "Kode paket sudah dipakai." };
    throw e;
  }
}

export async function createEvent(_: AdminState, form: FormData): Promise<AdminState> {
  await requireAdmin();
  const name = String(form.get("name") ?? "").trim();
  const slug = String(form.get("slug") ?? "")
    .trim()
    .toLowerCase();
  const packageId = Number(form.get("packageId"));
  const date = String(form.get("date") ?? "");
  const time = String(form.get("time") ?? "");
  const join = Number(form.get("join") ?? 30);
  if (!name || !/^[a-z0-9-]{3,40}$/.test(slug))
    return { error: "Isi nama dan kode event (huruf kecil, angka, strip)." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time))
    return { error: "Tanggal/jam tidak valid." };
  if (!Number.isInteger(join) || join < 0 || join > 100)
    return { error: "Batas masuk 0–100 menit." };
  const startsAt = new Date(`${date}T${time}:00+07:00`);
  try {
    await tryout.createEvent({ slug, name, packageId, startsAt, joinWindowMinutes: join });
  } catch (e) {
    if (String((e as { cause?: { code?: string } }).cause?.code) === "23505")
      return { error: "Kode event sudah dipakai." };
    throw e;
  }
  revalidatePath("/admin/event");
  return { ok: `Event "${name}" dibuat.` };
}

export async function setFlag(form: FormData) {
  await requireAdmin();
  const id = String(form.get("attemptId") ?? "");
  const to = String(form.get("to") ?? "");
  if (!/^[0-9a-f-]{36}$/.test(id) || !["cleared", "excluded"].includes(to)) return;
  await db.update(attempts).set({ flagStatus: to }).where(eq(attempts.id, id));
  revalidatePath("/admin/event");
}
