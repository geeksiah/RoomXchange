import type { ReactNode } from "react";
import { Platform, Text, View } from "react-native";
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
      className="mb-4 bg-white px-4 pb-5"
      style={{
        paddingTop: Platform.OS === "ios" ? insets.top + 12 : 12,
        shadowColor: "#111111",
        shadowOpacity: 0.06,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8
      }}
    >
      <View className="flex-row items-center justify-between gap-3">
        <View className="min-w-[48px] flex-row items-center justify-start">{left ?? <View className="h-11 w-11" />}</View>
        <Text className="flex-1 text-center font-jakarta-bold text-2xl text-rx-text" numberOfLines={1}>
          {title}
        </Text>
        <View className="min-w-[48px] flex-row items-center justify-end">{right ?? <View className="h-11 w-11" />}</View>
      </View>
    </View>
  );
}
