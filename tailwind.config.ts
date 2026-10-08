import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./providers/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        graphite: {
          DEFAULT: '#0a0a0a',
          50: '#1a1a1a',
          200: '#1e1e1e',
        },
        // Brand palette "TattooGo MK".
        // Orange = rich tattoo-machine ink (gradient orange-500 -> orange-600).
        // Green  = high-contrast emerald/neon reserved for success + verified.
        brand: {
          orange: '#F97316',
          'orange-strong': '#EA580C',
          'orange-soft': '#FB923C',
          // Copper sampled from the app icon artwork (roses + 3D machine).
          copper: '#D9460E',
          'copper-strong': '#B8430F',
          'copper-soft': '#F05000',
          green: '#10B981',
          'green-strong': '#059669',
          'green-neon': '#34D399',
        },
        neon: {
          orange: '#F97316',
          green: '#10B981',
        },
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "#F97316",
          strong: "#EA580C",
        },
        success: {
          DEFAULT: "#10B981",
          strong: "#059669",
          neon: "#34D399",
          foreground: "#022c1a",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        border: "var(--border)",
        card: "var(--card)",
      },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "Inter",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
      },
      boxShadow: {
        'apple-xs': '0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.03)',
        'apple-sm': '0 2px 8px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.04)',
        'apple-md': '0 8px 24px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)',
        'orange-glow': '0 0 20px rgba(249,115,22,0.35), 0 8px 24px rgba(0,0,0,0.35)',
        'success-glow': '0 0 18px rgba(16,185,129,0.35)',
      },
      screens: {
        xs: "375px",
        sm: "390px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1536px",
      },
      maxWidth: {
        app: "480px",
      },
      zIndex: {
        "9999": "9999",
      },
      spacing: {
        "safe-top": "env(safe-area-inset-top)",
        "safe-bottom": "env(safe-area-inset-bottom)",
        "safe-left": "env(safe-area-inset-left)",
        "safe-right": "env(safe-area-inset-right)",
        safe: "max(0.75rem, env(safe-area-inset-bottom, 0px))",
      },
    },
  },
  plugins: [],
};

export default config;

