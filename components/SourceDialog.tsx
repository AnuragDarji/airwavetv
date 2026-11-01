"use client";
import { useEffect, useState } from "react";
import { Globe2, Link2, X } from "lucide-react";
import { COUNTRIES } from "@/lib/sources";
import type { Source } from "@/lib/types";

type Props = { open: boolean; current: Source; onClose: () => void; onApply: (s: Source) => void };

export default function SourceDialog({ open, current, onClose, onApply }: Props) {
  const [country, setCountry] = useState(current.kind === "country" ? current.value : "in");
  const [url, setUrl] = useState(current.kind === "custom" ? current.value : "");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setCountry(current.kind === "country" ? current.value : "in");
    setUrl(current.kind === "custom" ? current.value : "");
    setError("");
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, current, onClose]);

  if (!open) return null;

  const applyCountry = () => {
    const c = COUNTRIES.find((x) => x.code === country);
    onApply({ kind: "country", value: country, label: c?.name ?? country.toUpperCase() });
  };

  const applyUrl = () => {
    try {
      const u = new URL(url.trim());
      if (!/^https?:$/.test(u.protocol)) throw new Error();
      onApply({ kind: "custom", value: u.toString(), label: u.hostname });
    } catch {
      setError("Enter a full playlist address that starts with http:// or https://");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm pb-[env(safe-area-inset-bottom)] sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="source-title"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full max-w-lg animate-pop overflow-y-auto rounded-t-2xl border border-line bg-surface p-4 shadow-2xl sm:rounded-2xl sm:p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="source-title" className="text-lg font-bold">Choose a playlist</h2>
          <button onClick={onClose} className="btn-icon" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-line p-4">
            <label htmlFor="country" className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Globe2 className="h-4 w-4 text-accent" /> Channels by country
            </label>
            <div className="flex gap-2">
              <select
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 text-base sm:text-sm"
              >
                {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
              <button onClick={applyCountry} className="h-10 rounded-xl bg-accent px-4 text-sm font-semibold text-white hover:opacity-90">
                Load
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-line p-4">
            <label htmlFor="m3u" className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Link2 className="h-4 w-4 text-accent" /> Your own M3U playlist
            </label>
            <div className="flex gap-2">
              <input
                id="m3u"
                value={url}
                onChange={(e) => { setUrl(e.target.value); setError(""); }}
                placeholder="https://example.com/playlist.m3u"
                inputMode="url"
                className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 text-base sm:text-sm placeholder:text-muted"
              />
              <button onClick={applyUrl} className="h-10 rounded-xl bg-accent px-4 text-sm font-semibold text-white hover:opacity-90">
                Load
              </button>
            </div>
            {error && <p role="alert" className="mt-2 text-xs text-live">{error}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
