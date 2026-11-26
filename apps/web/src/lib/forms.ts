import { DEFAULT_SCHOOLS } from "@can/shared";
import { z } from "zod";

export const PRIVACY_VERSION = "2026-12";
const THIS_YEAR = 2026;

/** Nama panggilan yang bisa disalahgunakan untuk menyamar. */
const RESERVED =
  /(admin|official|resmi|moderator|catatan.?abdi|abdinegara|bkn|polri|kemen|pemerintah|panitia)/i;
const RUDE = /(anjing|bangsat|kontol|memek|goblok|tolol|babi|jancok|asu\b)/i;

export const ProfileForm = z
  .object({
    nickname: z
      .string()
      .trim()
      .min(3, "Nama panggilan minimal 3 karakter")
      .max(20, "Nama panggilan maksimal 20 karakter")
      .regex(/^[a-zA-Z0-9._]+$/, "Pakai huruf, angka, titik, atau garis bawah saja (tanpa spasi)")
      .refine((v) => !RESERVED.test(v), "Nama panggilan itu tidak boleh dipakai")
      .refine((v) => !RUDE.test(v), "Nama panggilan mengandung kata yang tidak pantas"),
    city: z.string().trim().min(3, "Isi kota/kabupaten").max(60),
    targetSchool: z
      .string()
      .refine(
        (v) => v === "" || DEFAULT_SCHOOLS.some((s) => s.code === v),
        "Pilihan sekolah tidak valid",
      ),
    birthYear: z.coerce
      .number({ message: "Pilih tahun lahir" })
      .int()
      .min(1985, "Tahun lahir tidak valid")
      .max(THIS_YEAR - 10, "Tahun lahir tidak valid"),
    consent: z.literal("on", { message: "Setujui kebijakan privasi untuk melanjutkan" }),
    guardian: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (isMinor(v.birthYear) && v.guardian !== "on") {
      ctx.addIssue({
        code: "custom",
        path: ["guardian"],
        message: "Peserta di bawah 18 tahun wajib mendapat izin orang tua/wali",
      });
    }
  });

export const RegisterForm = z
  .object({
    // Rapikan dulu (keyboard HP sering menambah spasi), baru cek format.
    email: z.string().trim().toLowerCase().max(200).pipe(z.email("Alamat email tidak valid")),
    password: z.string().min(8, "Kata sandi minimal 8 karakter").max(128),
  })
  .and(ProfileForm);

export const LoginForm = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Alamat email tidak valid")),
  password: z.string().min(1, "Isi kata sandi"),
});

/** Dihitung dari tahun saja (data minimal): bisa jadi sudah 18 di akhir tahun, sengaja dibuat hati-hati. */
export function isMinor(birthYear: number) {
  return THIS_YEAR - birthYear < 18;
}

export type FormState = { error?: string; fields?: Record<string, string> } | undefined;

export const firstError = (e: z.ZodError) => e.issues[0]?.message ?? "Isian belum lengkap";
export const BIRTH_YEARS = Array.from(
  { length: THIS_YEAR - 10 - 1985 + 1 },
  (_, i) => THIS_YEAR - 10 - i,
);
