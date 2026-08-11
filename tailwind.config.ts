import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        page: "#fafafa",
        ink: "#111827",
        brand: "#fdbf36",
        "brand-deep": "#f5a51b",
        navy: "#0b1220",
        "navy-soft": "#16213a",
        mist: "#f4f6fa",
      },
      fontFamily: {
        sans: ["var(--font-jakarta)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      boxShadow: {
        soft: "0 6px 30px rgba(17,24,39,.08)",
        lift: "0 18px 50px rgba(17,24,39,.14)",
        glow: "0 10px 34px rgba(253,191,54,.4)",
      },
    },
  },
  plugins: [],
} satisfies Config;