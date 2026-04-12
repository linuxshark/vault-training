import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx,mdx}",
    "./components/**/*.{ts,tsx}",
    "./content/**/*.mdx",
  ],
  theme: {
    extend: {
      colors: {
        bg: "hsl(var(--bg) / <alpha-value>)",
        surface: "hsl(var(--surface) / <alpha-value>)",
        "surface-2": "hsl(var(--surface-2) / <alpha-value>)",
        border: "hsl(var(--border) / <alpha-value>)",
        "border-subtle": "hsl(var(--border-subtle) / <alpha-value>)",
        text: "hsl(var(--text) / <alpha-value>)",
        "text-muted": "hsl(var(--text-muted) / <alpha-value>)",
        "text-dim": "hsl(var(--text-dim) / <alpha-value>)",
        accent: "hsl(var(--accent) / <alpha-value>)",
        "accent-fg": "hsl(var(--accent-fg) / <alpha-value>)",
        blue: "hsl(var(--blue) / <alpha-value>)",
        green: "hsl(var(--green) / <alpha-value>)",
        amber: "hsl(var(--amber) / <alpha-value>)",
        red: "hsl(var(--red) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1.1rem" }],
        sm: ["0.8125rem", { lineHeight: "1.2rem" }],
        base: ["0.875rem", { lineHeight: "1.65" }],
        md: ["1rem", { lineHeight: "1.65" }],
        lg: ["1.25rem", { lineHeight: "1.4" }],
        xl: ["1.625rem", { lineHeight: "1.2", letterSpacing: "-0.02em" }],
        "2xl": ["2rem", { lineHeight: "1.2", letterSpacing: "-0.02em" }],
      },
      borderRadius: {
        sm: "4px",
        md: "6px",
        lg: "10px",
      },
      transitionDuration: {
        micro: "150ms",
        state: "250ms",
      },
    },
  },
  plugins: [],
};

export default config;
