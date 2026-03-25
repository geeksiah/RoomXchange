import type { ReactNode } from "react";
import { Keyboard, TouchableWithoutFeedback, View, type StyleProp, type ViewStyle } from "react-native";

export function DismissKeyboardView({
  children,
  className,
  style
}: {
  children: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <TouchableWithoutFeedback accessible={false} onPress={Keyboard.dismiss}>
      <View className={className} style={style}>
        {children}
      </View>
    </TouchableWithoutFeedback>
  );
}
