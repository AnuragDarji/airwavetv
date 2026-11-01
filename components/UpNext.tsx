"use client";
import ChannelLogo from "./ChannelLogo";
import { fmtNum } from "@/lib/number";
import type { Channel } from "@/lib/types";

type Props = { list: Channel[]; numbers: Map<string, number>; currentId: string; onPlay: (c: Channel) => void };

export default function UpNext({ list, numbers, currentId, onPlay }: Props) {
  const i = list.findIndex((c) => c.id === currentId);
  const ordered = i >= 0 ? [...list.slice(i + 1), ...list.slice(0, i)] : list;
  return (
    <aside className="card relative hidden min-h-[18rem] overflow-hidden lg:block" aria-label="More channels">
      <div className="absolute inset-0 flex flex-col">
        <h3 className="px-4 pb-2 pt-4 text-sm font-bold">More channels</h3>
        <ul className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
          {ordered.slice(0, 80).map((c) => (
            <li key={c.id}>
              <button onClick={() => onPlay(c)} className="flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left transition hover:bg-surface2">
                <span className="w-8 shrink-0 text-center font-mono text-[11px] font-bold tabular-nums text-accent">{fmtNum(numbers.get(c.id) ?? 0)}</span>
                <ChannelLogo name={c.name} logo={c.logo} className="h-8 w-12 shrink-0 overflow-hidden rounded-md border border-line" small />
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold leading-tight">{c.name}</span>
                  <span className="block truncate text-[11px] leading-tight text-muted">{c.categories[0]}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
