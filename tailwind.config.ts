import type { Config } from "tailwindcss";
import { colors as designColors, animations as designAnimations, shadows as designShadows } from "./lib/design";
import { colors as dsColors, typography as dsTypography, spacing as dsSpacing, elevation as dsElevation, radii as dsRadii, motion as dsMotion } from "./lib/design-system";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Bind Tailwind utilities to next/font CSS variables for premium control
        sans: ["var(--font-inter)", ...dsTypography.fontFamily.sans],
        mono: ["var(--font-jetbrains-mono)", ...dsTypography.fontFamily.mono],
      },
      fontSize: {
        xs: dsTypography.fontSize.xs,
        sm: dsTypography.fontSize.sm,
        base: dsTypography.fontSize.base,
        lg: dsTypography.fontSize.lg,
        xl: dsTypography.fontSize.xl,
        "2xl": dsTypography.fontSize["2xl"],
        "3xl": dsTypography.fontSize["3xl"],
        "4xl": dsTypography.fontSize["4xl"],
        "5xl": dsTypography.fontSize["5xl"],
      },
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
        // Brand primary emerald spectrum
        primary: {
          50: dsColors.primary[50],
          100: dsColors.primary[100],
          200: dsColors.primary[200],
          300: dsColors.primary[300],
          400: dsColors.primary[400],
          500: dsColors.primary[500],
          600: dsColors.primary[600],
          700: dsColors.primary[700],
          800: dsColors.primary[800],
          900: dsColors.primary[900],
          950: dsColors.primary[950],
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
        stone: {
          50: dsColors.stone[50],
          100: dsColors.stone[100],
          200: dsColors.stone[200],
          300: dsColors.stone[300],
          400: dsColors.stone[400],
          500: dsColors.stone[500],
          600: dsColors.stone[600],
          700: dsColors.stone[700],
          800: dsColors.stone[800],
          900: dsColors.stone[900],
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
        // Accents
        accent: {
          pink: dsColors.accents.pink100,
          lime: dsColors.accents.lime100,
          amber: dsColors.accents.amber100,
          blue: dsColors.accents.blue100,
        },
        // Status aliases
        success: dsColors.success,
        warning: dsColors.warning,
        danger: dsColors.danger,
      },
      spacing: {
        0: dsSpacing.scale[0],
        1: dsSpacing.scale[1],
        2: dsSpacing.scale[2],
        3: dsSpacing.scale[3],
        4: dsSpacing.scale[4],
        6: dsSpacing.scale[6],
        8: dsSpacing.scale[8],
        12: dsSpacing.scale[12],
        16: dsSpacing.scale[16],
        24: dsSpacing.scale[24],
        32: dsSpacing.scale[32],
        48: dsSpacing.scale[48],
        64: dsSpacing.scale[64],
        96: dsSpacing.scale[96],
      },
      borderRadius: {
        sm: dsRadii.sm,
        md: dsRadii.md,
        lg: dsRadii.lg,
        xl: dsRadii.xl,
        full: dsRadii.full,
      },
      boxShadow: {
        sm: dsElevation.sm,
        md: dsElevation.md,
        lg: dsElevation.lg,
        xl: dsElevation.xl,
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
        "fade-in": dsMotion.animations.fadeIn,
        "slide-up": dsMotion.animations.slideUp,
        "scale-in": dsMotion.animations.scaleIn,
        "pulse-success": "pulse-success 1.5s ease-in-out infinite",
        shimmer: "shimmer 1.8s linear infinite",
      },
      transitionDuration: {
        micro: dsMotion.duration.micro,
        standard: dsMotion.duration.standard,
        entrance: dsMotion.duration.entrance,
      },
      transitionTimingFunction: {
        brand: dsMotion.easing.brand,
      },
    },
  },
  darkMode: "class",
};

export default config;


