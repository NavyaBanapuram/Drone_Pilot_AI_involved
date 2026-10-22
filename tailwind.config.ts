import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#ffffff",
        foreground: "#09090b",
        surface: {
          DEFAULT: "#ffffff",
          secondary: "#f8fafc",
          tertiary: "#f1f5f9",
          border: "#e2e8f0",
        },
        orange: {
          50: "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#ff5500", // Metallic Aerospace Orange
          600: "#ea580c",
          700: "#c2410c",
          800: "#9a3412",
          900: "#7c2d12",
        },
        aero: {
          orange: "#ff5500",
          amber: "#ff6b00",
          dark: "#d43f00",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "sans-serif",
        ],
        heading: [
          "var(--font-machinic)",
          "var(--font-sans)",
          "-apple-system",
          "system-ui",
          "sans-serif",
        ],
        machinic: ["var(--font-machinic)", "sans-serif"],
        mono: [
          "var(--font-mono)",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      boxShadow: {
        "subtle-card": "0 10px 30px -10px rgba(0, 0, 0, 0.07), 0 2px 6px -1px rgba(0, 0, 0, 0.04)",
        "subtle-glow": "0 0 20px -5px rgba(0, 0, 0, 0.05)",
        "aero-glow": "0 4px 20px -2px rgba(255, 85, 0, 0.45)",
      },
    },
  },
  plugins: [],
};

export default config;
