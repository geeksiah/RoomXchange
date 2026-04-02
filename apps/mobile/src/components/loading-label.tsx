import { ActivityIndicator, Text, View } from "react-native";

export function LoadingLabel({
  loading,
  label,
  loadingLabel,
  textClassName,
  spinnerColor = "#FFFFFF"
}: {
  loading: boolean;
  label: string;
  loadingLabel?: string;
  textClassName: string;
  spinnerColor?: string;
}) {
  return (
    <View className="flex-row items-center justify-center">
      {loading ? <ActivityIndicator size="small" color={spinnerColor} style={{ marginRight: 8 }} /> : null}
      <Text className={textClassName}>{loading ? (loadingLabel ?? label) : label}</Text>
    </View>
  );
}
