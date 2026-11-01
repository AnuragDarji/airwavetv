import type { Config } from "tailwindcss";

const c = (v: string) => `rgb(var(--${v}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: c("bg"),
        surface: c("surface"),
        surface2: c("surface2"),
        ink: c("ink"),
        muted: c("muted"),
        line: c("line"),
        accent: c("accent"),
        live: c("live"),
      },
      fontFamily: {
        sans: [
          "ui-rounded", "\"SF Pro Rounded\"", "\"Segoe UI Variable\"", "\"Segoe UI\"",
          "system-ui", "-apple-system", "Roboto", "\"Helvetica Neue\"", "Arial", "sans-serif",
        ],
      },
      keyframes: {
        eq: { "0%,100%": { transform: "scaleY(0.3)" }, "50%": { transform: "scaleY(1)" } },
        shimmer: { "100%": { transform: "translateX(100%)" } },
        pop: { "0%": { transform: "scale(.96)", opacity: "0" }, "100%": { transform: "scale(1)", opacity: "1" } },
      },
      animation: {
        eq: "eq 900ms ease-in-out infinite",
        pop: "pop 180ms ease-out",
      },
    },
  },
  plugins: [],
};
export default config;
