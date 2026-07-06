/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--bg) / <alpha-value>)",
        surface: "rgb(var(--bg-2) / <alpha-value>)",
        fg: "rgb(var(--fg) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        line: "rgb(var(--border) / <alpha-value>)",
        primary: {
          DEFAULT: "rgb(var(--primary) / <alpha-value>)",
          fg: "rgb(var(--primary-fg) / <alpha-value>)",
        },
        ring: "rgb(var(--ring) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        display: ["Space Grotesk", "Inter", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      // Restrained radii — nothing bubbly. Cards and sheets stay crisp.
      borderRadius: {
        DEFAULT: "0.375rem",
        md: "0.4375rem",
        lg: "0.625rem",
        xl: "0.75rem",
        "2xl": "0.875rem",
        "3xl": "1rem",
        "4xl": "1.25rem",
      },
      // Barely-there depth. Swiss minimal leans on hairlines, not drop shadows.
      boxShadow: {
        card: "0 1px 2px 0 rgb(var(--fg) / 0.04)",
        raised: "0 2px 8px -2px rgb(var(--fg) / 0.08)",
        float: "0 16px 48px -16px rgb(var(--fg) / 0.22), 0 2px 8px -4px rgb(var(--fg) / 0.10)",
        glow: "none",
      },
      letterSpacing: {
        tightest: "-0.03em",
        label: "0.14em",
      },
      keyframes: {
        shimmer: { "100%": { transform: "translateX(100%)" } },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        shimmer: "shimmer 1.6s infinite",
        "fade-up": "fade-up 0.3s ease both",
      },
    },
  },
  plugins: [],
};
