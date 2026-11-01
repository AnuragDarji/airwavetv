export type Channel = {
  id: string;
  name: string;
  url: string;
  logo?: string;
  categories: string[];
  country?: string;
  language?: string;
};

export type Source = {
  kind: "country" | "custom";
  /** country code (e.g. "in") or full M3U url */
  value: string;
  label: string;
};
