import { TryoutError } from "@can/db";
import { notFound, redirect } from "next/navigation";
import ExamClient from "@/components/ExamClient";
import { tryout } from "@/lib/db";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ruang ujian", robots: { index: false } };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { session } = await requireUser(`/ujian/${id}`);
  let view;
  try {
    view = await tryout.view(id, session.user.id);
  } catch (e) {
    if (e instanceof TryoutError) notFound();
    throw e;
  }
  if (view.status !== "in_progress") redirect(`/hasil/${id}`);
  return (
    <ExamClient
      attemptId={view.id}
      eventName={view.eventName}
      deadlineAt={view.deadlineAt.toISOString()}
      serverNow={view.serverNow.toISOString()}
      questions={view.questions}
      answers={view.answers}
    />
  );
}
