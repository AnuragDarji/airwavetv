/** Basic SSRF guard: only public http(s) hosts. */
export function isSafeUrl(u: URL) {
  if (!/^https?:$/.test(u.protocol)) return false;
  const h = u.hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return false;
  if (/^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h)) return false;
  if (h === "::1" || h.startsWith("[")) return false;
  return true;
}
