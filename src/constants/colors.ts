/**
 * Minimal palette extracted from the Kajota production app for the
 * standalone Coach demo. Light theme only — judges run one mode.
 */
export const colors = {
  // Kajota brand
  brand: '#F15A32',
  brandDark: '#D94825',

  // Surfaces
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceMuted: '#F4F4F6',
  pageBackground: '#FAFAFA',

  // Text
  text: '#1A1A1A',
  textGray: '#6B6B6B',
  textMuted: '#9AA0A6',

  // Status
  warning: '#E04A2D',
  success: '#27AE60',

  // Borders
  border: '#E5E7EB',
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 28,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const fontSize = {
  xs: 11,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 22,
  hero: 28,
} as const;
