"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw, Search, SearchX, Settings2, Tv, WifiOff, X, LayoutGrid, Heart, History, Hash, List, Grid3x3 } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import ChannelCard from "./ChannelCard";
import Player from "./Player";
import UpNext from "./UpNext";
import SourceDialog from "./SourceDialog";
import Credit from "./Credit";
import { iconFor } from "@/lib/categories";
import { fmtNum } from "@/lib/number";
import { useLocalStorage } from "@/lib/useLocalStorage";
import { DEFAULT_SOURCE, sourceUrl } from "@/lib/sources";
import { type View, viewKey } from "@/lib/view";
import type { Channel, Source } from "@/lib/types";

const PAGE = 48;
type Osd = { text: string; ok: boolean } | null;

export default function App() {
  const [source, setSource, sourceReady] = useLocalStorage<Source>("source", DEFAULT_SOURCE);
  const [favorites, setFavorites] = useLocalStorage<string[]>("favorites", []);
  const [recent, setRecent] = useLocalStorage<string[]>("recent", []);
  const [mode, setMode] = useLocalStorage<"grid" | "list">("viewMode", "grid");

  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [view, setView] = useState<View>({ type: "all" });
  const [query, setQuery] = useState("");
  const [current, setCurrent] = useState<Channel | null>(null);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [visible, setVisible] = useState(PAGE);
  const sentinel = useRef<HTMLDivElement>(null);
  const [dial, setDial] = useState("");
  const [osd, setOsd] = useState<Osd>(null);
  const [chInput, setChInput] = useState("");

  useEffect(() => {
    if (!sourceReady) return;
    const ctrl = new AbortController();
    setLoading(true);
    setError("");
    fetch(`/api/playlist?url=${encodeURIComponent(sourceUrl(source))}`, { signal: ctrl.signal })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Could not load channels.");
        setChannels(data.channels as Channel[]);
        setView({ type: "all" });
      })
      .catch((e) => {
        if (e.name !== "AbortError") { setChannels([]); setError(e.message || "Could not load channels."); }
      })
      .finally(() => !ctrl.signal.aborted && setLoading(false));
    return () => ctrl.abort();
  }, [source, sourceReady, reloadKey]);

  const categories = useMemo(() => {
    const m = new Map<string, number>();
    channels.forEach((c) => c.categories.forEach((k) => m.set(k, (m.get(k) ?? 0) + 1)));
    return [...m.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [channels]);

  const byId = useMemo(() => new Map(channels.map((c) => [c.id, c])), [channels]);
  // Permanent TV-style channel numbers: position in the playlist, starting at 1.
  const numbers = useMemo(() => new Map(channels.map((c, i) => [c.id, i + 1])), [channels]);
  const favSet = useMemo(() => new Set(favorites), [favorites]);
  const recentList = useMemo(() => recent.map((id) => byId.get(id)).filter(Boolean) as Channel[], [recent, byId]);

  const list = useMemo(() => {
    let base: Channel[];
    switch (view.type) {
      case "favorites": base = channels.filter((c) => favSet.has(c.id)); break;
      case "recent": base = recentList; break;
      case "category": base = channels.filter((c) => c.categories.includes(view.name)); break;
      default: base = channels;
    }
    const q = query.trim().toLowerCase();
    if (q) base = base.filter((c) => c.name.toLowerCase().includes(q) || c.categories.some((k) => k.toLowerCase().includes(q)));
    return base;
  }, [channels, view, query, favSet, recentList]);

  useEffect(() => setVisible(PAGE), [view, query, channels]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => e[0].isIntersecting && setVisible((v) => v + PAGE), { rootMargin: "700px" });
    io.observe(el);
    return () => io.disconnect();
  }, [list.length, loading, visible]);

  const play = useCallback((c: Channel) => {
    setCurrent(c);
    setRecent((r) => [c.id, ...r.filter((x) => x !== c.id)].slice(0, 30));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [setRecent]);

  const toggleFav = useCallback((id: string) => {
    setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [id, ...f]));
  }, [setFavorites]);

  const step = (dir: 1 | -1) => {
    if (!current) return;
    const src = list.some((c) => c.id === current.id) ? list : channels;
    if (!src.length) return;
    const i = src.findIndex((c) => c.id === current.id);
    const next = src[(i + dir + src.length) % src.length];
    if (next) play(next);
  };

  // Tune by number, like a TV remote.
  const channelsRef = useRef(channels);
  channelsRef.current = channels;
  const playRef = useRef(play);
  playRef.current = play;
  const osdTimer = useRef<number | null>(null);
  const flash = useCallback((o: Osd) => {
    setOsd(o);
    if (osdTimer.current) window.clearTimeout(osdTimer.current);
    if (o) osdTimer.current = window.setTimeout(() => setOsd(null), 1800);
  }, []);
  const tune = useCallback((n: number) => {
    const c = channelsRef.current[n - 1];
    if (c) { playRef.current(c); flash({ text: `${fmtNum(n)} · ${c.name}`, ok: true }); }
    else flash({ text: `No channel ${n}`, ok: false });
  }, [flash]);

  const dialRef = useRef("");
  const dialTimer = useRef<number | null>(null);
  useEffect(() => {
    const clear = () => { dialRef.current = ""; setDial(""); if (dialTimer.current) window.clearTimeout(dialTimer.current); };
    const commit = () => { const n = parseInt(dialRef.current, 10); clear(); if (n > 0) tune(n); };
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      if (document.querySelector('[role="dialog"]')) return;
      if (/^\d$/.test(e.key)) {
        const total = channelsRef.current.length;
        if (!total) return;
        dialRef.current = (dialRef.current + e.key).slice(0, String(total).length);
        setDial(dialRef.current);
        if (dialTimer.current) window.clearTimeout(dialTimer.current);
        // No longer number can start with these digits: tune right away.
        if (parseInt(dialRef.current, 10) * 10 > total) commit();
        else dialTimer.current = window.setTimeout(commit, 1600);
      } else if (e.key === "Enter" && dialRef.current) { e.preventDefault(); commit(); }
      else if (e.key === "Backspace" && dialRef.current) { dialRef.current = dialRef.current.slice(0, -1); setDial(dialRef.current); if (!dialRef.current) clear(); }
      else if (e.key === "Escape" && dialRef.current) clear();
    };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); if (dialTimer.current) window.clearTimeout(dialTimer.current); };
  }, [tune]);

  const submitCh = (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseInt(chInput, 10);
    if (n > 0) tune(n);
    setChInput("");
    (document.activeElement as HTMLElement | null)?.blur();
  };

  const title =
    view.type === "all" ? "All channels"
    : view.type === "favorites" ? "Favorites"
    : view.type === "recent" ? "Recently watched"
    : view.name;

  const k = viewKey(view);
  const tab = (active: boolean) =>
    `inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors sm:text-[13px] ${
      active ? "border-ink bg-ink text-bg" : "border-line bg-surface hover:bg-surface2"
    }`;
  const iconTab = (active: boolean) => `${tab(active)} max-sm:w-8 max-sm:justify-center max-sm:px-0`;

  return (
    <div className="min-h-dvh pb-[env(safe-area-inset-bottom)]">
      {/* Header: logo, search, tools + category tabs */}
      <header className="sticky top-0 z-40 border-b border-line bg-bg/90 pt-[env(safe-area-inset-top)] backdrop-blur-md" id="top">
        <div className="mx-auto flex h-12 max-w-[1600px] items-center gap-2 px-3 pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] sm:gap-3 sm:px-5">
          <a href="/" className="flex shrink-0 items-center gap-2" aria-label="Airwave TV home">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-live text-white">
              <Tv className="h-4 w-4" />
            </span>
            <span className="hidden leading-none min-[420px]:block">
              <span className="block text-sm font-extrabold tracking-tight">Airwave <span className="grad-text">TV</span></span>
              <span className="mt-0.5 hidden text-[10px] font-semibold text-muted sm:block">Made by <span className="grad-text">Anurag</span></span>
            </span>
          </a>

          <div className="relative min-w-0 flex-1 sm:ml-3 sm:max-w-md">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="search"
              placeholder="Search channels"
              aria-label="Search channels"
              className="h-9 w-full rounded-lg border border-line bg-surface pl-8 pr-8 text-base sm:text-sm outline-none transition placeholder:text-muted focus:border-accent [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted hover:text-ink">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={() => setMode(mode === "grid" ? "list" : "grid")}
              className="btn-icon"
              aria-label={mode === "grid" ? "Switch to list view" : "Switch to grid view"}
              title={mode === "grid" ? "List view" : "Grid view"}
            >
              {mode === "grid" ? <List className="h-4 w-4" /> : <Grid3x3 className="h-4 w-4" />}
            </button>
            <button onClick={() => setReloadKey((n) => n + 1)} className="btn-icon hidden sm:inline-flex" aria-label="Refresh channels" title="Refresh">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button onClick={() => setSourceOpen(true)} className="btn-icon" aria-label="Change playlist" title="Change playlist">
              <Settings2 className="h-4 w-4" />
            </button>
            <ThemeToggle />
          </div>
        </div>

        <nav className="no-scrollbar mx-auto flex h-11 max-w-[1600px] items-center gap-1.5 overflow-x-auto px-3 pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] sm:px-5" aria-label="Categories">
          <form onSubmit={submitCh} className="relative shrink-0" role="search" aria-label="Go to channel number">
            <Hash className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-accent" />
            <input
              value={chInput}
              onChange={(e) => setChInput(e.target.value.replace(/\D/g, "").slice(0, 5))}
              inputMode="numeric"
              enterKeyHint="go"
              placeholder="CH"
              aria-label="Channel number"
              title="Type a channel number and press Enter"
              className="h-8 w-16 rounded-full border border-line bg-surface pl-6 pr-2 text-xs font-bold tabular-nums outline-none placeholder:font-semibold placeholder:text-muted focus:border-accent sm:w-20 sm:text-[13px]"
            />
          </form>
          <span className="mx-0.5 h-5 w-px shrink-0 bg-line" aria-hidden />
          <button className={tab(k === "all")} onClick={() => setView({ type: "all" })}>
            <LayoutGrid className="h-3.5 w-3.5" /> All
          </button>
          <button className={iconTab(k === "favorites")} onClick={() => setView({ type: "favorites" })} aria-label="Favorites" title="Favorites">
            <Heart className="h-3.5 w-3.5" /> <span className="max-sm:hidden">Favorites</span>
          </button>
          <button className={iconTab(k === "recent")} onClick={() => setView({ type: "recent" })} aria-label="Recent" title="Recent">
            <History className="h-3.5 w-3.5" /> <span className="max-sm:hidden">Recent</span>
          </button>
          <span className="mx-0.5 h-5 w-px shrink-0 bg-line" aria-hidden />
          {categories.map((c) => {
            const Icon = iconFor(c.name);
            return (
              <button key={c.name} className={tab(k === `c:${c.name}`)} onClick={() => setView({ type: "category", name: c.name })}>
                <Icon className="h-3.5 w-3.5" /> {c.name}
                <span className="text-[11px] opacity-60">{c.count}</span>
              </button>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-[1600px] space-y-3 px-3 pb-4 pt-3 pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] sm:space-y-4 sm:px-5">
        {current && (
          <div
            className="sticky z-30 -mx-3 bg-bg/95 px-3 pb-2 pt-1 backdrop-blur sm:-mx-5 sm:px-5 lg:static lg:mx-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none [@media(max-height:480px)]:static"
            style={{ top: "calc(5.75rem + env(safe-area-inset-top))" }}
          >
            <div className="mx-auto grid max-w-3xl gap-4 lg:max-w-none lg:grid-cols-[minmax(0,1fr)_320px]">
              <Player
                channel={current}
                number={numbers.get(current.id) ?? 0}
                favorite={favSet.has(current.id)}
                onFavorite={() => toggleFav(current.id)}
                onClose={() => setCurrent(null)}
                onPrev={() => step(-1)}
                onNext={() => step(1)}
              />
              <UpNext list={list} numbers={numbers} currentId={current.id} onPlay={play} />
            </div>
          </div>
        )}

        <div className="flex items-baseline justify-between gap-2">
          <h1 className="truncate text-lg font-extrabold tracking-tight sm:text-xl">{title}</h1>
          {!loading && !error && (
            <p className="shrink-0 text-xs text-muted sm:text-sm">
              {list.length.toLocaleString()} {list.length === 1 ? "channel" : "channels"}
              {query && <> for “{query}”</>}
              <span className="hidden sm:inline">{" · "}{source.label}</span>
            </p>
          )}
        </div>

        {loading ? (
          <div role="status" aria-live="polite">
            <div className="mb-4 flex items-center gap-3 text-sm text-muted">
              <span className="h-5 w-5 rounded-full border-2 border-line border-t-accent" style={{ animation: "spin .8s linear infinite" }} />
              Loading {source.label} channels…
            </div>
            <div className={mode === "list" ? "chan-list" : "chan-grid"}>
              {Array.from({ length: 16 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-2xl border border-line bg-surface">
                  <div className="skeleton aspect-[16/10]" />
                  <div className="space-y-1.5 px-3 py-2.5"><div className="skeleton h-3.5 w-3/4 rounded" /><div className="skeleton h-3 w-1/3 rounded" /></div>
                </div>
              ))}
            </div>
          </div>
        ) : error ? (
          <Empty icon={WifiOff} title="Channels could not be loaded" text={error}>
            <button onClick={() => setReloadKey((n) => n + 1)} className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white">Try again</button>
            <button onClick={() => setSourceOpen(true)} className="rounded-xl border border-line bg-surface px-4 py-2 text-sm font-semibold">Change playlist</button>
          </Empty>
        ) : list.length === 0 ? (
          <Empty
            icon={SearchX}
            title={view.type === "favorites" ? "No favorites yet" : view.type === "recent" ? "Nothing watched yet" : "No channels found"}
            text={view.type === "favorites" ? "Tap the heart on any channel to keep it here." : view.type === "recent" ? "Channels you play will show up here." : "Try a different search or category."}
          />
        ) : (
          <>
            <div className={mode === "list" ? "chan-list" : "chan-grid"}>
              {list.slice(0, visible).map((c) => (
                <ChannelCard
                  key={c.id}
                  channel={c}
                  number={numbers.get(c.id) ?? 0}
                  mode={mode}
                  active={current?.id === c.id}
                  favorite={favSet.has(c.id)}
                  onPlay={() => play(c)}
                  onFavorite={() => toggleFav(c.id)}
                />
              ))}
            </div>
            {visible < list.length && <div ref={sentinel} className="h-10" aria-hidden />}
          </>
        )}

        <footer className="border-t border-line pb-2 pt-5 text-center">
          <Credit />
          <p className="mt-1 text-xs text-muted">Channel lists from the open iptv-org project</p>
        </footer>
      </main>

      {(dial || osd) && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed right-3 top-[calc(3.5rem+env(safe-area-inset-top))] z-[70] max-w-[80vw] rounded-xl border border-white/10 bg-black/80 px-4 py-2.5 text-white shadow-2xl backdrop-blur animate-pop sm:right-5"
        >
          {dial ? (
            <p className="font-mono text-3xl font-extrabold tabular-nums tracking-widest sm:text-4xl">{dial}<span className="animate-pulse opacity-60">_</span></p>
          ) : (
            <p className={`truncate font-mono text-sm font-bold sm:text-base ${osd?.ok ? "" : "text-amber-300"}`}>{osd?.text}</p>
          )}
        </div>
      )}

      <SourceDialog
        open={sourceOpen}
        current={source}
        onClose={() => setSourceOpen(false)}
        onApply={(s) => { setSource(s); setSourceOpen(false); setCurrent(null); }}
      />
    </div>
  );
}

function Empty({
  icon: Icon, title, text, children,
}: { icon: React.ComponentType<{ className?: string }>; title: string; text: string; children?: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-3xl border border-dashed border-line px-6 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface2 text-muted"><Icon className="h-7 w-7" /></div>
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="text-sm text-muted">{text}</p>
      {children && <div className="mt-1 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}
