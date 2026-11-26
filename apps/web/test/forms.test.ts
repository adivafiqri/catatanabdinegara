import { describe, expect, it } from "vitest";
import { ProfileForm, RegisterForm, isMinor } from "../src/lib/forms";

const base = {
  nickname: "rafi_stis",
  city: "Kab. Bogor",
  targetSchool: "STIS",
  birthYear: "2000",
  consent: "on",
};

describe("ProfileForm", () => {
  it("menerima profil dewasa tanpa centang wali", () => {
    expect(ProfileForm.safeParse(base).success).toBe(true);
  });
  it("< 18 tahun wajib centang izin wali", () => {
    const minor = { ...base, birthYear: "2010" };
    expect(isMinor(2010)).toBe(true);
    expect(ProfileForm.safeParse(minor).success).toBe(false);
    expect(ProfileForm.safeParse({ ...minor, guardian: "on" }).success).toBe(true);
  });
  it("persetujuan privasi wajib", () => {
    expect(ProfileForm.safeParse({ ...base, consent: undefined }).success).toBe(false);
  });
  it.each([
    "ab",
    "nama dengan spasi",
    "admin_can",
    "official1",
    "panitia",
    "x".repeat(21),
    "<script>",
  ])("nama panggilan ditolak: %s", (nickname) => {
    expect(ProfileForm.safeParse({ ...base, nickname }).success).toBe(false);
  });
  it("sekolah harus dari daftar atau kosong", () => {
    expect(ProfileForm.safeParse({ ...base, targetSchool: "" }).success).toBe(true);
    expect(ProfileForm.safeParse({ ...base, targetSchool: "HARVARD" }).success).toBe(false);
  });
});

describe("RegisterForm", () => {
  it("email dinormalisasi & kata sandi minimal 8", () => {
    const r = RegisterForm.safeParse({ ...base, email: " Rafi@Mail.COM ", password: "12345678" });
    expect(r.success && r.data.email).toBe("rafi@mail.com");
    expect(RegisterForm.safeParse({ ...base, email: "a@b.co", password: "1234567" }).success).toBe(
      false,
    );
  });
});
