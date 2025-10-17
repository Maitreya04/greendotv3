export const spacing = {
  xs: "4px",   // 0.5 (Tailwind approx)
  sm: "8px",   // 2
  md: "16px",  // 4
  lg: "24px",  // 6
  xl: "32px",  // 8
  "2xl": "48px", // 12
  "3xl": "64px", // 16
} as const;

export type SpacingKey = keyof typeof spacing;


