import type { Source } from "./types";

export const COUNTRIES: { code: string; name: string }[] = [
  { code: "in", name: "India" }, { code: "us", name: "United States" },
  { code: "gb", name: "United Kingdom" }, { code: "pk", name: "Pakistan" },
  { code: "bd", name: "Bangladesh" }, { code: "np", name: "Nepal" },
  { code: "lk", name: "Sri Lanka" }, { code: "ae", name: "United Arab Emirates" },
  { code: "sa", name: "Saudi Arabia" }, { code: "ca", name: "Canada" },
  { code: "au", name: "Australia" }, { code: "de", name: "Germany" },
  { code: "fr", name: "France" }, { code: "es", name: "Spain" },
  { code: "it", name: "Italy" }, { code: "pt", name: "Portugal" },
  { code: "nl", name: "Netherlands" }, { code: "ru", name: "Russia" },
  { code: "tr", name: "Türkiye" }, { code: "br", name: "Brazil" },
  { code: "mx", name: "Mexico" }, { code: "ar", name: "Argentina" },
  { code: "co", name: "Colombia" }, { code: "id", name: "Indonesia" },
  { code: "my", name: "Malaysia" }, { code: "ph", name: "Philippines" },
  { code: "th", name: "Thailand" }, { code: "vn", name: "Vietnam" },
  { code: "jp", name: "Japan" }, { code: "kr", name: "South Korea" },
  { code: "cn", name: "China" }, { code: "za", name: "South Africa" },
  { code: "ng", name: "Nigeria" }, { code: "eg", name: "Egypt" },
  { code: "ke", name: "Kenya" }, { code: "ir", name: "Iran" },
  { code: "af", name: "Afghanistan" }, { code: "pl", name: "Poland" },
  { code: "ua", name: "Ukraine" }, { code: "gr", name: "Greece" },
];

export const DEFAULT_SOURCE: Source = { kind: "country", value: "in", label: "India" };

export function sourceUrl(s: Source): string {
  return s.kind === "country"
    ? `https://iptv-org.github.io/iptv/countries/${s.value}.m3u`
    : s.value;
}
