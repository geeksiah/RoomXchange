import { Text, View } from "react-native";
import { Image } from "expo-image";
import { formatMonthlyPrice, type ListingSummary } from "@roomxchange/shared/src/mobile";
import { theme } from "../theme";
import { ScaleButton } from "./scale-button";

export function PropertyCard({ listing, onPress }: { listing: ListingSummary; onPress: () => void }) {
  return (
    <ScaleButton onPress={onPress} className="mb-5 overflow-hidden rounded-2xl bg-white" contentStyle={theme.shadow.card}>
      <View className="relative">
        <Image source={listing.previewImage} style={{ width: "100%", height: 250 }} contentFit="cover" />
        <View className="absolute bottom-4 left-4 rounded-full bg-black/55 px-4 py-2">
          <Text className="font-jakarta-bold text-base text-white">{formatMonthlyPrice(listing.price)}</Text>
        </View>
      </View>
      <View className="gap-1 px-4 py-4">
        <Text className="font-jakarta-bold text-lg text-rx-text" numberOfLines={1}>
          {listing.title}
        </Text>
        <Text className="font-jakarta text-sm text-rx-muted" numberOfLines={1}>
          {listing.location}
        </Text>
      </View>
    </ScaleButton>
  );
}
