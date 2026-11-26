import type { NextRequest } from "next/server";
import { tryout } from "@/lib/db";
import { handle } from "@/lib/api";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return handle(req, async (userId) => {
    const a = await tryout.submit(id, userId);
    return { ok: true, status: a.status };
  });
}
