import "server-only";
import { TryoutError } from "@can/db";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { getSession } from "./session";
import { errText } from "./log";

/** Tolak permintaan lintas-situs (CSRF): Origin harus sama dengan host yang diminta. */
export function sameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

const STATUS: Record<TryoutError["code"], number> = {
  event_not_found: 404,
  attempt_not_found: 404,
  not_open_yet: 409,
  join_closed: 409,
  already_submitted: 409,
  deadline_passed: 409,
  invalid_answer: 400,
  results_not_ready: 409,
  package_incomplete: 409,
};

export async function handle(req: NextRequest, fn: (userId: string) => Promise<unknown>) {
  if (!sameOrigin(req))
    return NextResponse.json({ error: "asal permintaan tidak sah" }, { status: 403 });
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "sesi berakhir, silakan masuk lagi" }, { status: 401 });
  try {
    const data = await fn(s.user.id);
    return NextResponse.json(data ?? { ok: true }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    if (e instanceof TryoutError)
      return NextResponse.json({ error: e.message, code: e.code }, { status: STATUS[e.code] });
    if (
      e instanceof ZodError ||
      e instanceof SyntaxError ||
      (e instanceof Error && e.message === "payload terlalu besar")
    ) {
      return NextResponse.json({ error: "data jawaban tidak valid" }, { status: 400 });
    }
    console.error("[api]", errText(e));
    return NextResponse.json({ error: "terjadi kesalahan di server" }, { status: 500 });
  }
}
