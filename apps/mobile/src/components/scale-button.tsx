import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import { motionDuration, motionEasing, pressSpring } from "../lib/motion";

type ScaleButtonProps = Omit<PressableProps, "children"> & {
  children: ReactNode;
  className?: string;
  contentStyle?: StyleProp<ViewStyle>;
};

export function ScaleButton({ className, children, contentStyle, onPressIn, onPressOut, disabled, ...props }: ScaleButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(disabled ? 0.58 : 1)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: disabled ? 0.58 : 1,
      duration: motionDuration.fast,
      easing: motionEasing.standard,
      useNativeDriver: true
    }).start();
  }, [disabled, opacity]);

  const animateScaleTo = (value: number) => {
    Animated.spring(scale, {
      toValue: value,
      ...pressSpring
    }).start();
  };

  return (
    <Pressable
      {...props}
      className={className}
      disabled={disabled}
      onPressIn={(event) => {
        if (!disabled) {
          animateScaleTo(0.972);
        }
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        animateScaleTo(1);
        onPressOut?.(event);
      }}
    >
      <Animated.View style={[{ opacity, transform: [{ scale }] }, contentStyle]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
