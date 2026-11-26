import "server-only";
import { profiles } from "@can/db";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { db } from "./db";

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function getProfile(userId: string) {
  const [p] = await db.select().from(profiles).where(eq(profiles.userId, userId));
  return p;
}

/** Peserta login + profil lengkap. Belum login → /masuk; profil belum ada → /lengkapi. */
export async function requireUser(next = "/") {
  const s = await getSession();
  if (!s) redirect(`/masuk?ke=${encodeURIComponent(next)}`);
  const profile = await getProfile(s.user.id);
  if (!profile) redirect("/lengkapi");
  return { session: s, profile };
}

/** Admin: login, peran admin, dan 2FA aktif (wajib). */
export async function requireAdmin() {
  const s = await getSession();
  if (!s) redirect("/admin/masuk");
  const profile = await getProfile(s.user.id);
  if (!profile || profile.role !== "admin") redirect("/admin/masuk?galat=bukan-admin");
  if (!(s.user as { twoFactorEnabled?: boolean | null }).twoFactorEnabled)
    redirect("/admin/keamanan");
  return { session: s, profile };
}
