import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { ScaleButton } from "./scale-button";

type EmptyStateCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  actionLabel?: string;
  onActionPress?: () => void;
};

export function EmptyStateCard({
  icon,
  title,
  description,
  actionLabel,
  onActionPress
}: EmptyStateCardProps) {
  return (
    <View className="rounded-[28px] bg-white px-6 py-7">
      <View className="h-14 w-14 items-center justify-center rounded-full bg-rx-accentSoft">
        <Ionicons name={icon} size={24} color="#FF385C" />
      </View>
      <Text className="mt-5 font-jakarta-bold text-xl text-rx-text">{title}</Text>
      <Text className="mt-2 font-jakarta text-sm leading-6 text-rx-muted">{description}</Text>
      {actionLabel && onActionPress ? (
        <ScaleButton onPress={onActionPress} className="mt-5 self-start rounded-full bg-rx-text px-5 py-3">
          <Text className="font-jakarta-bold text-sm text-white">{actionLabel}</Text>
        </ScaleButton>
      ) : null}
    </View>
  );
}
