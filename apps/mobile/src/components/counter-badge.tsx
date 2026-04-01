import { Text, View } from "react-native";

export function CounterBadge({
  value,
  className = ""
}: {
  value: number | string;
  className?: string;
}) {
  return (
    <View className={`h-5 w-5 items-center justify-center rounded-full bg-rx-accent ${className}`}>
      <Text className="font-jakarta-bold text-[10px] leading-none text-white" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}
