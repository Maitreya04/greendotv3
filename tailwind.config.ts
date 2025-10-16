import type { Config } from "tailwindcss";
import { colors as designColors, animations as designAnimations, shadows as designShadows } from "./lib/design";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        safe: designColors.safe,
        unsafe: designColors.unsafe,
        unsure: designColors.unsure,
        bg: designColors.bg,
        cardBg: designColors.cardBg,
        text: {
          primary: designColors.text.primary,
          secondary: designColors.text.secondary,
        },
        emerald: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981", // safe/primary
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
          950: "#022c22",
        },
        red: {
          50: "#fef2f2",
          100: "#fee2e2",
          200: "#fecaca",
          300: "#fca5a5",
          400: "#f87171",
          500: "#ef4444", // unsafe
          600: "#dc2626",
          700: "#b91c1c",
          800: "#991b1b",
          900: "#7f1d1d",
          950: "#450a0a",
        },
        amber: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b", // unsure
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
          950: "#451a03",
        },
      },
      boxShadow: {
        card: designShadows.card,
        "card-hover": designShadows.cardHover,
        floating: designShadows.floating,
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { transform: "translateY(12px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "scale-in": {
          "0%": { transform: "scale(0.96)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "pulse-success": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(16, 185, 129, 0.7)" },
          "50%": { boxShadow: "0 0 0 10px rgba(16, 185, 129, 0)" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-in": designAnimations.fadeIn,
        "slide-up": designAnimations.slideUp,
        "scale-in": designAnimations.scaleIn,
        "pulse-success": "pulse-success 1.5s ease-in-out infinite",
        shimmer: "shimmer 1.8s linear infinite",
      },
    },
  },
  darkMode: "class",
};

export default config;


