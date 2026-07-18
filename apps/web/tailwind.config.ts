import type { Config } from "tailwindcss";

/**
 * OBSIDIAN design tokens.
 * Palette: black / graphite, platinum / silver, subtle cyan system illumination.
 * Kept intentionally restrained — premium and practical, not sci-fi clutter.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        obsidian: {
          black: "#08090b",
          graphite: "#111318",
          slate: "#1a1d24",
          line: "#262a33",
          platinum: "#e7e9ee",
          silver: "#9aa1ad",
          muted: "#6b7280",
          cyan: "#38bdf8",
          positive: "#4ade80",
          negative: "#f87171",
        },
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        panel: "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 8px 24px -12px rgba(0,0,0,0.6)",
      },
    },
  },
  plugins: [],
};

export default config;
