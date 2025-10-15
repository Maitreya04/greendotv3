export const colors = {
  safe: "#10b981",
  unsafe: "#ef4444",
  unsure: "#f59e0b",
  bg: "#fafaf9",
  cardBg: "#ffffff",
  text: { primary: "#171717", secondary: "#737373" },
} as const;

export const animations = {
  fadeIn: "fade-in 0.3s ease-out",
  slideUp: "slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
  scaleIn: "scale-in 0.2s ease-out",
} as const;

export const shadows = {
  card: "0 1px 3px rgba(0,0,0,0.12)",
  cardHover: "0 4px 12px rgba(0,0,0,0.15)",
  floating: "0 8px 24px rgba(0,0,0,0.12)",
} as const;


