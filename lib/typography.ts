export const typography = {
  // Display
  display: "text-5xl font-bold tracking-tight leading-tight",
  // Headings
  h1: "text-4xl font-bold tracking-tight leading-tight",
  h2: "text-3xl font-semibold tracking-tight leading-tight",
  h3: "text-2xl font-semibold leading-tight",
  h4: "text-xl font-semibold leading-tight",
  // Body
  body: "text-base font-normal leading-relaxed",
  bodyLarge: "text-lg font-normal leading-relaxed",
  bodySmall: "text-sm font-normal leading-normal",
  // UI
  caption: "text-xs font-medium tracking-wide uppercase leading-snug",
  label: "text-sm font-medium leading-snug",
  // Special
  barcode: "font-mono text-sm tracking-wider",
} as const;

export type TypographyScale = typeof typography;


