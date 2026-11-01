import type { Channel } from "./types";

const attr = (line: string, key: string): string | undefined => {
  const m = line.match(new RegExp(`${key}="([^"]*)"`, "i"));
  return m?.[1]?.trim() || undefined;
};

/** Parse an M3U / M3U8 playlist into channels. */
export function parseM3U(text: string): Channel[] {
  const lines = text.split(/\r?\n/);
  const out: Channel[] = [];
  const seen = new Set<string>();
  let meta: Omit<Channel, "url" | "id"> | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith("#EXTINF")) {
      const comma = line.lastIndexOf(",");
      const title = comma >= 0 ? line.slice(comma + 1).trim() : "";
      const group = attr(line, "group-title") ?? "";
      const categories = group
        .split(/[;|]/)
        .map((g) => g.trim())
        .filter(Boolean);
      meta = {
        name: title || attr(line, "tvg-name") || "Unnamed channel",
        logo: attr(line, "tvg-logo"),
        categories: categories.length ? categories : ["Uncategorized"],
        country: attr(line, "tvg-country"),
        language: attr(line, "tvg-language"),
      };
      continue;
    }

    if (line.startsWith("#")) continue; // other directives

    if (meta && /^https?:\/\//i.test(line)) {
      if (!seen.has(line)) {
        seen.add(line);
        out.push({ ...meta, url: line, id: line });
      }
      meta = null;
    }
  }
  return out;
}
