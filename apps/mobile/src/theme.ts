import { designTokens } from "@roomxchange/shared";

export const theme = {
  colors: {
    background: designTokens.colors.background,
    surface: designTokens.colors.surface,
    surfaceMuted: designTokens.colors.surfaceMuted,
    text: designTokens.colors.text,
    textMuted: designTokens.colors.textMuted,
    accent: designTokens.colors.accent,
    accentSoft: designTokens.colors.accentSoft,
    border: designTokens.colors.border,
    danger: designTokens.colors.danger
  },
  spacing: designTokens.spacing,
  radius: designTokens.radius
} as const;
