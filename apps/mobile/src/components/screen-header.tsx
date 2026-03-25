import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function ScreenHeader({
  title,
  left,
  right
}: {
  title: string;
  left?: ReactNode;
  right?: ReactNode;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="bg-white px-4 pb-4"
      style={{
        paddingTop: insets.top + 12,
        shadowColor: "#111111",
        shadowOpacity: 0.06,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8
      }}
    >
      <View className="flex-row items-center justify-between">
        <View className="w-12 items-start">{left ?? <View className="h-11 w-11" />}</View>
        <Text className="flex-1 text-center font-jakarta-bold text-2xl text-rx-text" numberOfLines={1}>
          {title}
        </Text>
        <View className="w-12 items-end">{right ?? <View className="h-11 w-11" />}</View>
      </View>
    </View>
  );
}
