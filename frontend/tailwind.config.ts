import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        oxblood: "#5C1F27",
        tan: "#D9A26B",
        paper: "#F6F1EC",
        mauve: "#654F49",
        ink: "#2A1418",
      },
      fontFamily: {
        display: ["var(--font-sans)", "ui-sans-serif", "sans-serif"],
        body: ["var(--font-sans)", "ui-sans-serif", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        stamp: "0.18em",
        plate: "0.12em",
      },
      boxShadow: {
        soft: "0 24px 60px -24px rgba(42, 20, 24, 0.28)",
        lift: "0 12px 36px -16px rgba(42, 20, 24, 0.16)",
      },
      borderRadius: {
        card: "0",
        pill: "0",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        marquee: "marquee 48s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
