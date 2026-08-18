import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        graphite: {
          DEFAULT: "#121212",
          50: "#1a1a1a",
          100: "#222222",
          200: "#2a2a2a",
          300: "#333333",
        },
        amber: {
          DEFAULT: "#FFBF00",
          50: "#FFF8E0",
          100: "#FFEFB3",
          200: "#FFE066",
          300: "#FFD633",
          400: "#FFBF00",
          500: "#E6AC00",
          600: "#CC9900",
        },
        background: "#121212",
        foreground: "#F5F5F5",
        muted: "#888888",
        border: "#2a2a2a",
        card: "#1a1a1a",
      },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "Inter",
          "SF Pro Display",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
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
      spacing: {
        "safe-top": "env(safe-area-inset-top)",
        "safe-bottom": "env(safe-area-inset-bottom)",
        "safe-left": "env(safe-area-inset-left)",
        "safe-right": "env(safe-area-inset-right)",
      },
    },
  },
  plugins: [],
};

module.exports = config;
