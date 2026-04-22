import { NextResponse } from "next/server";
import { generateUpcoming } from "@/features/recurrences/generator";

// Daily cron entry point wired in vercel.json. Vercel Cron sends:
//   Authorization: Bearer <CRON_SECRET>
// We reject anything else.
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await generateUpcoming("all", 30);
    return NextResponse.json({
      ok: true,
      createdCount: result.createdCount,
      recurrencesProcessed: result.recurrencesProcessed,
      ranAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "generation failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
