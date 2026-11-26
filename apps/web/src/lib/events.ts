import "server-only";
import { events } from "@can/db";
import { and, asc, desc, eq, gt, lte } from "drizzle-orm";
import { db } from "./db";

/** Event yang sedang berlangsung, atau yang akan datang terdekat, atau yang terakhir selesai. */
export async function currentEvent(now = new Date()) {
  const [ongoing] = await db
    .select()
    .from(events)
    .where(and(eq(events.status, "published"), lte(events.startsAt, now), gt(events.endsAt, now)))
    .orderBy(asc(events.startsAt))
    .limit(1);
  if (ongoing) return ongoing;
  const [next] = await db
    .select()
    .from(events)
    .where(and(eq(events.status, "published"), gt(events.startsAt, now)))
    .orderBy(asc(events.startsAt))
    .limit(1);
  if (next) return next;
  const [last] = await db
    .select()
    .from(events)
    .where(eq(events.status, "published"))
    .orderBy(desc(events.startsAt))
    .limit(1);
  return last;
}

export type EventPhase = "upcoming" | "open" | "running" | "finished";
export function phase(
  ev: { startsAt: Date; joinUntil: Date; endsAt: Date },
  now = new Date(),
): EventPhase {
  if (now < ev.startsAt) return "upcoming";
  if (now <= ev.joinUntil) return "open";
  if (now < ev.endsAt) return "running";
  return "finished";
}
