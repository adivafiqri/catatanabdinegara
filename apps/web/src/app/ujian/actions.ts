"use server";
import { TryoutError } from "@can/db";
import { redirect } from "next/navigation";
import { tryout } from "@/lib/db";
import { requireUser } from "@/lib/session";

export async function startExam(form: FormData) {
  const slug = String(form.get("event") ?? "");
  const { session } = await requireUser("/");
  let id: string;
  try {
    id = (await tryout.start(session.user.id, slug)).id;
  } catch (e) {
    if (e instanceof TryoutError) redirect(`/?info=${e.code}`);
    throw e;
  }
  redirect(`/ujian/${id}`);
}
