# Airwave TV

A responsive IPTV web app built with Next.js 14, TypeScript and Tailwind CSS.

Made by Anurag.

## Features
- Channel logos on every card (initials badge when a logo is missing)
- Categories sidebar with icons and channel counts (drawer on mobile)
- Dark and light mode, remembers your choice, follows system setting first
- Search, favorites, recently watched, infinite scroll
- Clean, simple layout: header with search, category tabs, logo grid, "More channels" list beside the player
- Custom minimal player (no default browser control bar, no seek line): LIVE button on the video, play/pause, mute, quality, picture-in-picture, full screen
- Reliable HLS playback: buffering, auto-retry, stall watchdog, jump back to live
- Keyboard: Space = play/pause, F = full screen, M = mute
- Built-in stream relay (`/api/stream`) that automatically takes over when a stream is blocked by CORS or http/https rules
- Pick a country playlist or paste your own M3U URL (gear icon in the top bar)

## Run
```bash
npm install
npm run dev        # http://localhost:3000
# production
npm run build && npm start
```

## Notes
- Default playlist: India from iptv-org (https://iptv-org.github.io/iptv/countries/in.m3u).
- The stream relay fixes most blocked channels. It works best when you self-host (local, VPS, Docker).
  Serverless hosts (e.g. Vercel free tier) limit streaming bandwidth/duration, so some channels may be less smooth there.
- Some streams are offline or geo-restricted; that is normal for free playlists.
- Playlists are fetched through `/api/playlist`, which avoids CORS problems.
- Change the default playlist in `lib/sources.ts`.
