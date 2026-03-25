import { Text } from "react-native";
import { ScaleButton } from "./scale-button";

export function FilterChip({
  label,
  active,
  onPress
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <ScaleButton
      onPress={onPress}
      className={`mr-2 rounded-full px-4 py-2 ${active ? "bg-rx-text" : "bg-white border border-rx-border"}`}
    >
      <Text className={`font-jakarta text-sm ${active ? "text-white" : "text-rx-text"}`}>{label}</Text>
    </ScaleButton>
  );
}
