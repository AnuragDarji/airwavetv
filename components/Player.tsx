"use client";
import { useEffect, useRef, useState } from "react";
import type Hls from "hls.js";
import type { HlsConfig } from "hls.js";
import {
  AlertTriangle, Heart, Loader2, Maximize, Minimize, Pause, PictureInPicture2, Play, RefreshCw,
  SkipBack, SkipForward, Volume2, VolumeX, X,
} from "lucide-react";
import ChannelLogo from "./ChannelLogo";
import { fmtNum } from "@/lib/number";
import type { Channel } from "@/lib/types";

type Props = {
  channel: Channel;
  number: number;
  favorite: boolean;
  onFavorite: () => void;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
};

type Status = "loading" | "playing" | "buffering" | "error";
type Mode = "direct" | "relay";

const relay = (u: string) => `/api/stream?url=${encodeURIComponent(u)}`;

function hlsConfig(mode: Mode): Partial<HlsConfig> {
  return {
    enableWorker: true,
    lowLatencyMode: false,          // stability over lowest latency
    backBufferLength: 30,
    maxBufferLength: 30,            // keep ~30 s ahead to ride out network dips
    maxMaxBufferLength: 90,
    maxBufferSize: 80 * 1000 * 1000,
    liveSyncDurationCount: 3,
    liveMaxLatencyDurationCount: 10,
    liveDurationInfinity: true,
    capLevelToPlayerSize: true,
    nudgeMaxRetry: 8,
    highBufferWatchdogPeriod: 3,
    manifestLoadingTimeOut: 10000,
    manifestLoadingMaxRetry: mode === "direct" ? 1 : 4,
    manifestLoadingRetryDelay: 800,
    levelLoadingMaxRetry: 5,
    levelLoadingRetryDelay: 800,
    fragLoadingTimeOut: 20000,
    fragLoadingMaxRetry: 6,
    fragLoadingRetryDelay: 800,
  };
}

export default function Player({ channel, number, favorite, onFavorite, onClose, onPrev, onNext }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const reloadRef = useRef<() => void>(() => {});
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");
  const [viaRelay, setViaRelay] = useState(false);
  const [behind, setBehind] = useState(0);
  const [levels, setLevels] = useState<{ index: number; label: string }[]>([]);
  const [level, setLevel] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showUi, setShowUi] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;
    let mode: Mode = window.location.protocol === "https:" && channel.url.startsWith("http:") ? "relay" : "direct";
    let netRetries = 0;
    let mediaRetries = 0;
    let stallTicks = 0;
    let stallRecoveries = 0;
    let lastTime = -1;
    let hls: Hls | null = null;

    const tryPlay = () => {
      video.play().catch(() => {
        // Browser blocked sound-on autoplay: start muted instead.
        video.muted = true;
        setMuted(true);
        video.play().catch(() => {});
      });
    };

    const isFile = /\.(mp4|webm|ogg|mp3|aac)(\?|$)/i.test(channel.url);

    setStatus("loading");
    setMessage("");
    setLevels([]);
    setLevel(-1);
    setBehind(0);

    const fail = (text: string) => {
      if (cancelled) return;
      setStatus("error");
      setMessage(text);
    };

    const attach = async (m: Mode) => {
      mode = m;
      setViaRelay(m === "relay");
      hls?.destroy();
      hls = null;
      hlsRef.current = null;
      netRetries = 0;
      mediaRetries = 0;
      const src = m === "relay" ? relay(channel.url) : channel.url;
      setStatus("loading");

      if (isFile) {
        video.src = src;
        tryPlay();
        return;
      }

      const { default: HlsLib } = await import("hls.js");
      if (cancelled) return;

      if (HlsLib.isSupported()) {
        const h = new HlsLib(hlsConfig(m));
        hls = h;
        hlsRef.current = h;
        h.loadSource(src);
        h.attachMedia(video);

        h.on(HlsLib.Events.MANIFEST_PARSED, (_e, data) => {
          const seen = new Set<number>();
          const lv = data.levels
            .map((l, index) => ({ index, h: l.height, br: l.bitrate }))
            .filter((l) => (l.h ? !seen.has(l.h) && seen.add(l.h) : true))
            .sort((a, b) => b.h - a.h)
            .map((l) => ({ index: l.index, label: l.h ? `${l.h}p` : `${Math.round(l.br / 1000)} kbps` }));
          setLevels(lv.length > 1 ? lv : []);
          tryPlay();
        });

        h.on(HlsLib.Events.FRAG_LOADED, () => { netRetries = 0; });

        h.on(HlsLib.Events.ERROR, (_e, data) => {
          if (!data.fatal) return;

          if (data.type === HlsLib.ErrorTypes.NETWORK_ERROR) {
            const manifestProblem =
              data.details === HlsLib.ErrorDetails.MANIFEST_LOAD_ERROR ||
              data.details === HlsLib.ErrorDetails.MANIFEST_LOAD_TIMEOUT;
            // Blocked by browser (CORS / mixed content): switch to the relay straight away.
            if (m === "direct" && (manifestProblem || netRetries >= 2)) {
              attach("relay");
              return;
            }
            if (netRetries < 6) {
              netRetries++;
              setStatus("buffering");
              setTimeout(() => !cancelled && h.startLoad(), Math.min(1000 * netRetries, 4000));
              return;
            }
            if (m === "direct") { attach("relay"); return; }
            fail("The channel server is not responding. It may be offline or restricted in your region.");
            return;
          }

          if (data.type === HlsLib.ErrorTypes.MEDIA_ERROR) {
            if (mediaRetries < 4) {
              mediaRetries++;
              if (mediaRetries === 2) h.swapAudioCodec();
              h.recoverMediaError();
              return;
            }
            fail("This stream uses a format your browser cannot play.");
            return;
          }

          fail("This stream could not be started.");
        });
        return;
      }

      // Safari etc.: native HLS
      video.src = src;
      tryPlay();
    };

    reloadRef.current = () => { stallRecoveries = 0; attach(mode); };

    const onPlaying = () => { if (!cancelled) { setStatus("playing"); stallTicks = 0; } };
    const onWaiting = () => { if (!cancelled) setStatus((s) => (s === "error" ? s : "buffering")); };
    const onVideoError = () => {
      if (cancelled || hls) return; // hls.js reports its own errors
      if (mode === "direct") attach("relay");
      else fail("This stream could not be played. It may be offline.");
    };
    const onPlayState = () => setPaused(video.paused);
    const onVolume = () => setMuted(video.muted || video.volume === 0);
    video.addEventListener("play", onPlayState);
    video.addEventListener("pause", onPlayState);
    video.addEventListener("volumechange", onVolume);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("canplay", onPlaying);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("stalled", onWaiting);
    video.addEventListener("error", onVideoError);

    // Watchdog: detects a frozen picture and heals it without user action.
    const watchdog = window.setInterval(() => {
      if (cancelled || video.paused || video.ended) return;
      const t = video.currentTime;
      if (t === lastTime) {
        stallTicks++;
        if (stallTicks >= 3) {
          stallTicks = 0;
          stallRecoveries++;
          if (stallRecoveries > 4) { attach(mode); stallRecoveries = 0; }
          else if (hls) { hls.startLoad(); hls.recoverMediaError(); }
        }
      } else {
        stallTicks = 0;
        lastTime = t;
      }
      if (hls?.liveSyncPosition) setBehind(Math.max(0, hls.liveSyncPosition - t));
    }, 3000);

    const onOnline = () => { hls?.startLoad(); tryPlay(); };
    const onVisible = () => {
      if (document.visibilityState === "visible" && hls?.liveSyncPosition && hls.liveSyncPosition - video.currentTime > 20) {
        video.currentTime = hls.liveSyncPosition;
      }
    };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);

    attach(mode).catch(() => fail("This stream could not be started."));

    return () => {
      cancelled = true;
      window.clearInterval(watchdog);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
      video.removeEventListener("play", onPlayState);
      video.removeEventListener("pause", onPlayState);
      video.removeEventListener("volumechange", onVolume);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("canplay", onPlaying);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("stalled", onWaiting);
      video.removeEventListener("error", onVideoError);
      hls?.destroy();
      hlsRef.current = null;
      video.removeAttribute("src");
      video.load();
    };
  }, [channel.url]);

  const goLive = () => {
    const v = videoRef.current;
    const pos = hlsRef.current?.liveSyncPosition;
    if (v && pos) { v.currentTime = pos; v.play().catch(() => {}); setBehind(0); }
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      // resuming a live stream: jump to the live edge instead of old footage
      const pos = hlsRef.current?.liveSyncPosition;
      if (pos && pos - v.currentTime > 10) v.currentTime = pos;
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    if (!v.muted && v.volume === 0) v.volume = 1;
  };

  const toggleFullscreen = () => {
    const w = wrapRef.current;
    const v = videoRef.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (document.fullscreenElement) { document.exitFullscreen().catch(() => {}); return; }
    if (w?.requestFullscreen) w.requestFullscreen().catch(() => {});
    else v?.webkitEnterFullscreen?.(); // iPhone Safari
  };

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // controls fade away while playing
  const wake = () => {
    setShowUi(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setShowUi(false), 3000);
  };
  useEffect(() => { wake(); return () => { if (hideTimer.current) window.clearTimeout(hideTimer.current); }; }, [channel.url]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === " " || e.key === "k") { e.preventDefault(); togglePlay(); }
    else if (e.key === "f") toggleFullscreen();
    else if (e.key === "m") toggleMute();
    wake();
  };

  const pickLevel = (i: number) => {
    setLevel(i);
    if (hlsRef.current) hlsRef.current.currentLevel = i;
  };

  const pip = async () => {
    try {
      const v = videoRef.current;
      if (!v) return;
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await v.requestPictureInPicture();
    } catch {}
  };

  const isBehind = behind > 8;
  const uiVisible = showUi || paused || status === "error";

  return (
    <section aria-label={`Now playing ${channel.name}`} className="overflow-hidden rounded-2xl border border-line bg-surface shadow-lg">
      <div
        ref={wrapRef}
        tabIndex={0}
        onKeyDown={onKey}
        onMouseMove={wake}
        onTouchStart={wake}
        className={`group relative aspect-video w-full bg-black outline-none ${uiVisible ? "" : "cursor-none"}`}
      >
        {/* no native controls: only our minimal ones */}
        <video
          ref={videoRef}
          playsInline
          autoPlay
          className="h-full w-full"
          onClick={() => { togglePlay(); wake(); }}
          onDoubleClick={toggleFullscreen}
        />

        {(status === "loading" || status === "buffering") && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/30">
            <Loader2 className="h-10 w-10 animate-spin text-white" />
            <span className="rounded-full bg-black/55 px-3 py-1 text-xs font-medium text-white">
              {status === "loading" ? "Loading channel…" : "Buffering…"}
            </span>
          </div>
        )}

        {paused && status === "playing" && (
          <button onClick={togglePlay} aria-label="Play" className="absolute inset-0 flex items-center justify-center bg-black/25">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-black shadow-xl">
              <Play className="ml-1 h-7 w-7 fill-black" />
            </span>
          </button>
        )}

        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/90 p-6 text-center text-white">
            <AlertTriangle className="h-9 w-9 text-amber-400" />
            <p className="text-sm font-semibold">This channel could not be played</p>
            <p className="max-w-md text-xs text-white/70">{message}</p>
            <div className="mt-2 flex gap-2">
              <button onClick={() => reloadRef.current()} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-black hover:bg-white/90">
                <RefreshCw className="h-3.5 w-3.5" /> Retry
              </button>
              <button onClick={onNext} className="rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold hover:bg-white/25">
                Next channel
              </button>
            </div>
          </div>
        )}

        {/* LIVE button: always on the video, no seek bar */}
        {status !== "error" && (
          <button
            onClick={goLive}
            disabled={!isBehind}
            aria-label={isBehind ? "Jump to live" : "Watching live"}
            title={isBehind ? "Jump to live" : "Watching live"}
            className={`absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-white shadow-lg transition ${
              isBehind ? "bg-black/70 hover:bg-black/85" : "bg-live"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${isBehind ? "bg-white/60" : "animate-pulse bg-white"}`} />
            {isBehind ? "GO LIVE" : "LIVE"}
          </button>
        )}

        {/* channel number badge, like a TV on-screen display */}
        <div
          className={`pointer-events-none absolute right-2 top-2 z-10 rounded-lg bg-black/60 px-2 py-1 font-mono text-xs font-bold tabular-nums text-white transition-opacity duration-300 sm:right-3 sm:top-3 sm:text-sm ${
            uiVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          CH {fmtNum(number)}
        </div>

        {/* minimal control bar */}
        <div
          className={`absolute inset-x-0 bottom-0 z-10 flex items-center gap-1 bg-gradient-to-t from-black/75 to-transparent px-2 pb-2 pt-10 text-white transition-opacity duration-300 ${
            uiVisible ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <CtrlBtn onClick={togglePlay} label={paused ? "Play" : "Pause"}>
            {paused ? <Play className="h-4 w-4 fill-white sm:h-5 sm:w-5" /> : <Pause className="h-4 w-4 fill-white sm:h-5 sm:w-5" />}
          </CtrlBtn>
          <CtrlBtn onClick={toggleMute} label={muted ? "Unmute" : "Mute"}>
            {muted ? <VolumeX className="h-4 w-4 sm:h-5 sm:w-5" /> : <Volume2 className="h-4 w-4 sm:h-5 sm:w-5" />}
          </CtrlBtn>
          <div className="flex-1" />
          {levels.length > 0 && (
            <select
              value={level}
              onChange={(e) => pickLevel(Number(e.target.value))}
              aria-label="Video quality"
              className="h-9 rounded-lg bg-white/15 px-2 text-xs font-semibold text-white outline-none hover:bg-white/25 [&>option]:text-black"
            >
              <option value={-1}>Auto</option>
              {levels.map((l) => <option key={l.index} value={l.index}>{l.label}</option>)}
            </select>
          )}
          <CtrlBtn onClick={pip} label="Picture in picture" className="hidden sm:inline-flex">
            <PictureInPicture2 className="h-4 w-4 sm:h-5 sm:w-5" />
          </CtrlBtn>
          <CtrlBtn onClick={toggleFullscreen} label={fullscreen ? "Exit full screen" : "Full screen"}>
            {fullscreen ? <Minimize className="h-4 w-4 sm:h-5 sm:w-5" /> : <Maximize className="h-4 w-4 sm:h-5 sm:w-5" />}
          </CtrlBtn>
        </div>
      </div>

      <div className="flex items-center gap-2 p-2 sm:gap-3 sm:p-3">
        <ChannelLogo name={channel.name} logo={channel.logo} className="hidden h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-line min-[380px]:flex sm:h-11 sm:w-11" small />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-bold sm:text-base"><span className="mr-1.5 font-mono text-accent tabular-nums">{fmtNum(number)}</span>{channel.name}</h2>
          <p className="truncate text-xs text-muted">
            {channel.categories.join(", ")}
            {viaRelay && " · relay"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button onClick={onPrev} className="btn-icon" aria-label="Previous channel"><SkipBack className="h-4 w-4" /></button>
          <button onClick={onNext} className="btn-icon" aria-label="Next channel"><SkipForward className="h-4 w-4" /></button>
          <button onClick={onFavorite} aria-pressed={favorite} className="btn-icon" aria-label={favorite ? "Remove from favorites" : "Add to favorites"}>
            <Heart className={`h-4 w-4 ${favorite ? "fill-live text-live" : ""}`} />
          </button>
          <button onClick={onClose} className="btn-icon" aria-label="Close player"><X className="h-4 w-4" /></button>
        </div>
      </div>
    </section>
  );
}

function CtrlBtn({
  onClick, label, children, className = "",
}: { onClick: () => void; label: string; children: React.ReactNode; className?: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-white/20 sm:h-9 sm:w-9 ${className}`}
    >
      {children}
    </button>
  );
}
