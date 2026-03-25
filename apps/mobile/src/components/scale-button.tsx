import { useRef, type ReactNode } from "react";
import { Animated, Easing, Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";

type ScaleButtonProps = Omit<PressableProps, "children"> & {
  children: ReactNode;
  className?: string;
  contentStyle?: StyleProp<ViewStyle>;
};

export function ScaleButton({ className, children, contentStyle, onPressIn, onPressOut, disabled, ...props }: ScaleButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const easing = Easing.bezier(0.22, 1, 0.36, 1);

  const animateTo = (value: number) => {
    Animated.timing(scale, {
      toValue: value,
      duration: value < 1 ? 150 : 210,
      easing,
      useNativeDriver: true
    }).start();
  };

  return (
    <Pressable
      {...props}
      className={className}
      disabled={disabled}
      onPressIn={(event) => {
        animateTo(0.985);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        animateTo(1);
        onPressOut?.(event);
      }}
    >
      <Animated.View style={[{ transform: [{ scale }] }, contentStyle]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
