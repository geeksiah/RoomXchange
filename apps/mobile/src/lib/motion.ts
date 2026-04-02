import { Easing } from "react-native";

export const motionEasing = {
  standard: Easing.bezier(0.22, 1, 0.36, 1),
  gentle: Easing.bezier(0.16, 1, 0.3, 1)
} as const;

export const motionDuration = {
  fast: 160,
  medium: 240,
  slow: 320
} as const;

export const pressSpring = {
  damping: 18,
  stiffness: 320,
  mass: 0.86,
  overshootClamping: true,
  useNativeDriver: true
} as const;

export const settleSpring = {
  damping: 22,
  stiffness: 220,
  mass: 0.94,
  overshootClamping: true,
  useNativeDriver: true
} as const;
