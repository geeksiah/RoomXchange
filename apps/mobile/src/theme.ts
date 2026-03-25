import { designTokens } from "@roomxchange/shared";

export const theme = {
  colors: designTokens.colors,
  spacing: designTokens.spacing,
  radius: designTokens.radius,
  shadow: {
    card: {
      shadowColor: "#111111",
      shadowOpacity: 0.08,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 10 },
      elevation: 4
    }
  }
} as const;
