import { NextRequest, NextResponse } from "next/server";
import { parseM3U } from "@/lib/m3u";
import { isSafeUrl as isSafe } from "@/lib/safeUrl";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url");
  if (!raw) return NextResponse.json({ error: "Missing playlist url." }, { status: 400 });

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: "That is not a valid URL." }, { status: 400 });
  }
  if (!isSafe(target)) {
    return NextResponse.json({ error: "This playlist address is not allowed." }, { status: 400 });
  }

  try {
    const res = await fetch(target.toString(), {
      signal: AbortSignal.timeout(25000),
      headers: { "User-Agent": "AirwaveTV/1.0" },
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `The playlist server answered with ${res.status}.` },
        { status: 502 }
      );
    }
    const text = await res.text();
    const channels = parseM3U(text);
    if (!channels.length) {
      return NextResponse.json(
        { error: "No channels were found in this playlist." },
        { status: 422 }
      );
    }
    return NextResponse.json(
      { channels },
      { headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" } }
    );
  } catch {
    return NextResponse.json(
      { error: "Could not download the playlist. Check the address and try again." },
      { status: 504 }
    );
  }
}
