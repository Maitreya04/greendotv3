// VegWise Design System — premium yet approachable
// Inspired by Robinhood (depth), Stripe (clarity), Cal.ai (simplicity)

// 1) Color Palette
export const colors = {
  // Primary emerald spectrum
  primary: {
    50: "#ecfdf5",
    100: "#d1fae5",
    200: "#a7f3d0",
    300: "#6ee7b7",
    400: "#34d399",
    500: "#10b981", // brand primary
    600: "#059669",
    700: "#047857",
    800: "#065f46",
    900: "#064e3b",
    950: "#022c22",
  },

  // Status
  success: "#10b981", // safe verdict
  warning: "#f59e0b", // unsure verdict
  danger: "#ef4444", // unsafe verdict

  // Neutrals (warm grays)
  stone: {
    50: "#fafaf9",
    100: "#f5f5f4",
    200: "#e7e5e4",
    300: "#d6d3d1",
    400: "#a8a29e",
    500: "#78716c",
    600: "#57534e",
    700: "#44403c",
    800: "#292524",
    900: "#1c1917",
  },

  // Accents for categories (soft pastels)
  accents: {
    pink100: "#fce7f3",
    lime100: "#ecfccb",
    amber100: "#fef3c7",
    blue100: "#dbeafe",
  },

  // UI backgrounds and text tokens
  surface: {
    background: "#fafaf9", // stone-50
    card: "#ffffff",
  },
  text: {
    primary: "#171717",
    secondary: "#737373",
  },
} as const;

// 2) Typography Scale
export const typography = {
  fontFamily: {
    sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"],
    mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "Liberation Mono", "Courier New", "monospace"],
  },
  fontSize: {
    // Tailwind name → size px
    xs: ["12px", { lineHeight: "1.75" }],
    sm: ["14px", { lineHeight: "1.75" }],
    base: ["16px", { lineHeight: "1.75" }],
    lg: ["18px", { lineHeight: "1.75" }],
    xl: ["20px", { lineHeight: "1.75" }],
    "2xl": ["24px", { lineHeight: "1.5" }],
    "3xl": ["30px", { lineHeight: "1.35" }],
    "4xl": ["36px", { lineHeight: "1.2" }],
    "5xl": ["48px", { lineHeight: "1.1" }],
  },
  fontWeight: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
  lineHeight: {
    relaxed: "1.75",
  },
} as const;

// 3) Spacing System (base unit 4px)
export const spacing = {
  base: 4,
  scale: {
    0: "0px",
    1: "4px",
    2: "8px",
    3: "12px",
    4: "16px",
    6: "24px",
    8: "32px",
    12: "48px",
    16: "64px",
    24: "96px",
    32: "128px",
    48: "192px",
    64: "256px",
    96: "384px",
  },
  componentPadding: {
    mobile: "16px",
    desktop: "24px",
  },
} as const;

// 4) Elevation (Shadows)
export const elevation = {
  sm: "0 1px 2px rgba(0,0,0,0.05)", // subtle card depth
  md: "0 4px 10px rgba(0,0,0,0.08)", // interactive elements
  lg: "0 12px 24px rgba(0,0,0,0.14)", // modals/overlays
  xl: "0 20px 40px rgba(0,0,0,0.18)", // floating action
} as const;

// 5) Border Radius
export const radii = {
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "24px",
  full: "9999px",
} as const;

// 6) Animations & Motion
export const motion = {
  duration: {
    micro: "200ms",
    standard: "300ms",
    entrance: "500ms",
  },
  easing: {
    brand: "cubic-bezier(0.4, 0.0, 0.2, 1)",
  },
  // Keyframe names are defined in tailwind config; these are preset utility strings
  animations: {
    fadeIn: `fade-in 300ms cubic-bezier(0.4, 0.0, 0.2, 1) both`,
    slideUp: `slide-up 300ms cubic-bezier(0.4, 0.0, 0.2, 1) both`,
    scaleIn: `scale-in 200ms cubic-bezier(0.4, 0.0, 0.2, 1) both`,
  },
  // Spring physics for interactive elements (for Framer Motion usage)
  spring: {
    gentle: { type: "spring", stiffness: 200, damping: 24, mass: 1 },
    lively: { type: "spring", stiffness: 320, damping: 28, mass: 0.9 },
    overlay: { type: "spring", stiffness: 260, damping: 30, mass: 1.1 },
  },
} as const;

export type DesignSystem = {
  colors: typeof colors;
  typography: typeof typography;
  spacing: typeof spacing;
  elevation: typeof elevation;
  radii: typeof radii;
  motion: typeof motion;
};

export const designSystem: DesignSystem = {
  colors,
  typography,
  spacing,
  elevation,
  radii,
  motion,
} as const;


