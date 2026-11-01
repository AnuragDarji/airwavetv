import { NextRequest, NextResponse } from "next/server";
import { isSafeUrl } from "@/lib/safeUrl";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const proxied = (abs: string) => `/api/stream?url=${encodeURIComponent(abs)}`;

/** Rewrite every URL inside an HLS manifest so segments also go through this relay. */
function rewriteManifest(text: string, base: string) {
  const abs = (u: string) => {
    try { return new URL(u, base).toString(); } catch { return u; }
  };
  return text
    .split(/\r?\n/)
    .map((line) => {
      const t = line.trim();
      if (!t) return line;
      if (t.startsWith("#")) {
        return line.replace(/URI="([^"]+)"/g, (_m, u) => `URI="${proxied(abs(u))}"`);
      }
      return proxied(abs(t));
    })
    .join("\n");
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Range",
  "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url");
  if (!raw) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  let target: URL;
  try { target = new URL(raw); } catch { return NextResponse.json({ error: "Bad url" }, { status: 400 }); }
  if (!isSafeUrl(target)) return NextResponse.json({ error: "Not allowed" }, { status: 400 });

  const headers: Record<string, string> = { "User-Agent": UA, Accept: "*/*" };
  const range = req.headers.get("range");
  if (range) headers.Range = range;

  // Abort upstream when the viewer leaves; time out only while waiting for headers.
  const ctrl = new AbortController();
  req.signal.addEventListener("abort", () => ctrl.abort());
  const timer = setTimeout(() => ctrl.abort(), 15000);

  let up: Response;
  try {
    up = await fetch(target.toString(), { headers, redirect: "follow", signal: ctrl.signal, cache: "no-store" });
  } catch {
    clearTimeout(timer);
    return NextResponse.json({ error: "Upstream unreachable" }, { status: 502, headers: CORS });
  }
  clearTimeout(timer);

  if (!up.ok && up.status !== 206) {
    return NextResponse.json({ error: `Upstream ${up.status}` }, { status: up.status, headers: CORS });
  }

  const ct = up.headers.get("content-type") ?? "";
  const finalUrl = up.url || target.toString();
  const looksManifest = /mpegurl/i.test(ct) || /\.m3u8(\?|$)/i.test(finalUrl);

  if (looksManifest) {
    const text = await up.text();
    if (text.trimStart().startsWith("#EXTM3U")) {
      return new NextResponse(rewriteManifest(text, finalUrl), {
        status: 200,
        headers: { ...CORS, "Content-Type": "application/vnd.apple.mpegurl", "Cache-Control": "no-store" },
      });
    }
    return new NextResponse(text, { status: 200, headers: { ...CORS, "Content-Type": ct || "text/plain" } });
  }

  const out: Record<string, string> = { ...CORS, "Cache-Control": "public, max-age=30" };
  for (const h of ["content-type", "content-length", "content-range", "accept-ranges"]) {
    const v = up.headers.get(h);
    if (v) out[h] = v;
  }
  return new NextResponse(up.body, { status: up.status, headers: out });
}
