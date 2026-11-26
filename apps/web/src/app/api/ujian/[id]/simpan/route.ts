import type { NextRequest } from "next/server";
import { z } from "zod";
import { tryout } from "@/lib/db";
import { handle } from "@/lib/api";

const Body = z.object({
  answers: z
    .record(
      z.string().uuid(),
      z.object({ o: z.enum(["A", "B", "C", "D", "E"]).nullable(), f: z.boolean() }),
    )
    .refine((r) => Object.keys(r).length <= 200),
});

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return handle(req, async (userId) => {
    const text = await req.text();
    if (text.length > 64_000) throw new Error("payload terlalu besar");
    const body = Body.parse(JSON.parse(text));
    await tryout.save(id, userId, body.answers);
    return { ok: true, savedAt: new Date().toISOString() };
  });
}
