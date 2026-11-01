"use client";
import { useState } from "react";
import { hueOf } from "@/lib/color";

function initials(name: string) {
  const parts = name.replace(/[^\p{L}\p{N} ]/gu, "").trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export default function ChannelLogo({
  name, logo, className = "", small = false,
}: { name: string; logo?: string; className?: string; small?: boolean }) {
  const [failed, setFailed] = useState(false);
  const h = hueOf(name);

  if (!logo || failed) {
    return (
      <div
        className={`flex items-center justify-center font-bold text-white ${className}`}
        style={{ background: `linear-gradient(135deg, hsl(${h} 70% 55%), hsl(${(h + 40) % 360} 70% 42%))` }}
        aria-hidden
      >
        <span className={`${small ? "text-xs" : "text-xl sm:text-2xl"} tracking-tight`}>{initials(name)}</span>
      </div>
    );
  }
  return (
    <div className={`flex items-center justify-center bg-white/90 dark:bg-white/95 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logo}
        alt=""
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={`h-full w-full object-contain ${small ? "p-1" : "p-2.5"}`}
      />
    </div>
  );
}
