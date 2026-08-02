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
          muted: "#808897",
          // Semantic illumination. Each colour has exactly one meaning, and is
          // never the ONLY signal — always paired with a label or icon.
          blue: "#3b82f6", // primary illumination / primary action
          cyan: "#38bdf8", // secondary accent, restrained
          positive: "#4ade80", // completed / paid / confirmed / ready ONLY
          amber: "#f59e0b", // warnings ONLY
          negative: "#f87171", // failures / destructive / urgent ONLY
        },

        /**
         * The VOCABULARY. `obsidian-*` above is the palette — the hexes and
         * their names. These are the words components speak in.
         *
         * The split earns its keep by separating two questions that change at
         * different rates: "what colour is our graphite" (rarely, and in one
         * place) from "what colour is a raised surface" (a design decision that
         * should be stated once and reused). A component that writes
         * `bg-obsidian-graphite` has made the second decision inline, and the
         * next component is free to disagree.
         *
         * Deliberately NOT a rename: the palette keeps its names, every
         * existing use keeps working, and the rule is enforced by a test that
         * scans `components/command/` rather than by a mass edit that would
         * touch ~20 files to change nothing.
         *
         * Values are duplicated from the palette rather than referenced,
         * because Tailwind's config is a plain object and a self-reference
         * would need a function. If a palette hex changes, its vocabulary entry
         * changes with it — a token test pins them together.
         */
        surface: {
          base: "#08090b", // obsidian.black — the page
          raised: "#111318", // obsidian.graphite — cards, panels
          sunken: "#1a1d24", // obsidian.slate — wells, inset rows
        },
        line: {
          DEFAULT: "#262a33", // obsidian.line — thin borders
        },
        content: {
          primary: "#e7e9ee", // obsidian.platinum — headline and data
          secondary: "#9aa1ad", // obsidian.silver — labels, supporting text
          muted: "#808897", // obsidian.muted — de-emphasised, absent values
        },
        accent: {
          DEFAULT: "#3b82f6", // obsidian.blue — primary action, one per view
          soft: "#38bdf8", // obsidian.cyan — focus rings, secondary emphasis
        },
        state: {
          positive: "#4ade80", // completed / paid / confirmed ONLY
          warning: "#f59e0b", // warnings ONLY
          danger: "#f87171", // failures / destructive / urgent ONLY
          /**
           * Warning text sitting ON a warning-tinted surface. `warning` is
           * calibrated against the near-black page; on an amber wash it loses
           * contrast, so the Skyline attention pill needs a lighter step. Added
           * for that pill rather than pasted into it as a hex.
           */
          "warning-strong": "#fbbf24",
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
