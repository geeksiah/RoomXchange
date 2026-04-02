import { ActivityIndicator, Text, View } from "react-native";

export function SessionLoadingCard({
  title = "Checking your account",
  description = "We are restoring your RoomXchange session now."
}: {
  title?: string;
  description?: string;
}) {
  return (
    <View className="rounded-3xl bg-white p-5">
      <View className="flex-row items-center">
        <View className="h-11 w-11 items-center justify-center rounded-full bg-rx-accentSoft">
          <ActivityIndicator color="#FF385C" />
        </View>
        <Text className="ml-3 flex-1 font-jakarta-bold text-lg text-rx-text">{title}</Text>
      </View>
      <Text className="mt-3 font-jakarta text-sm leading-6 text-rx-muted">{description}</Text>
      <View className="mt-4 h-1.5 w-16 rounded-full bg-rx-accentSoft" />
    </View>
  );
}
