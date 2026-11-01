"use client";
import { Heart } from "lucide-react";
import ChannelLogo from "./ChannelLogo";
import { fmtNum } from "@/lib/number";
import type { Channel } from "@/lib/types";

type Props = {
  channel: Channel;
  number: number;
  mode: "grid" | "list";
  active: boolean;
  favorite: boolean;
  onPlay: () => void;
  onFavorite: () => void;
};

export default function ChannelCard({ channel, number, mode, active, favorite, onPlay, onFavorite }: Props) {
  const heart = (cls: string) => (
    <button
      onClick={onFavorite}
      aria-pressed={favorite}
      aria-label={favorite ? `Remove ${channel.name} from favorites` : `Add ${channel.name} to favorites`}
      className={cls}
    >
      <Heart className={`h-3.5 w-3.5 ${favorite ? "fill-live text-live" : ""}`} />
    </button>
  );

  if (mode === "list") {
    return (
      <div className={`flex items-center gap-2 rounded-xl border bg-surface pr-1.5 transition hover:bg-surface2 ${active ? "border-accent ring-2 ring-accent/40" : "border-line"}`}>
        <button onClick={onPlay} aria-label={`Play channel ${number}, ${channel.name}`} className="flex min-w-0 flex-1 items-center gap-2.5 p-1.5 text-left">
          <span className="w-9 shrink-0 text-center font-mono text-xs font-bold tabular-nums text-accent">{fmtNum(number)}</span>
          <ChannelLogo name={channel.name} logo={channel.logo} className="h-8 w-12 shrink-0 overflow-hidden rounded-md border border-line" small />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold leading-tight" title={channel.name}>{channel.name}</span>
            <span className="block truncate text-[11px] leading-tight text-muted">{channel.categories[0]}</span>
          </span>
          {active && <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-live" aria-label="Playing" />}
        </button>
        {heart("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-line hover:text-ink")}
      </div>
    );
  }

  return (
    <div className="group relative">
      <button
        onClick={onPlay}
        aria-label={`Play channel ${number}, ${channel.name}`}
        className={`block w-full overflow-hidden rounded-xl border bg-surface text-left transition hover:-translate-y-0.5 hover:shadow-lg ${
          active ? "border-accent ring-2 ring-accent/40" : "border-line"
        }`}
      >
        <div className="relative aspect-[16/10]">
          <ChannelLogo name={channel.name} logo={channel.logo} className="absolute inset-0" />
          <span className="absolute left-1.5 top-1.5 rounded-md bg-black/65 px-1.5 py-0.5 font-mono text-[10px] font-bold leading-none tabular-nums text-white">
            {fmtNum(number)}
          </span>
          {active && (
            <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-live px-1.5 py-0.5 text-[9px] font-bold text-white">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> LIVE
            </span>
          )}
        </div>
        <div className="px-2 py-1.5">
          <h3 className="truncate text-[13px] font-semibold leading-tight" title={channel.name}>{channel.name}</h3>
          <p className="truncate text-[11px] leading-tight text-muted">{channel.categories[0]}</p>
        </div>
      </button>
      {heart(
        `absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/75 ${
          favorite ? "opacity-100" : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100"
        }`
      )}
    </div>
  );
}
