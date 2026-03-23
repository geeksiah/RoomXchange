import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import Animated, { FadeInDown } from "react-native-reanimated";
import { formatCurrency, type ListingSummary } from "@roomxchange/shared";
import { theme } from "../theme";

export function PropertyCard({ listing, onPress }: { listing: ListingSummary; onPress: () => void }) {
  return (
    <Animated.View entering={FadeInDown.duration(350)} style={{ marginBottom: 18 }}>
      <Pressable
        onPress={onPress}
        style={{
          backgroundColor: "rgba(255,253,250,0.94)",
          borderRadius: 26,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: theme.colors.border
        }}
      >
        <View>
          <Image source={listing.previewImage} style={{ width: "100%", height: 240 }} contentFit="cover" />
          <View
            style={{
              position: "absolute",
              left: 16,
              bottom: 16,
              backgroundColor: "rgba(42,32,24,0.75)",
              borderRadius: 999,
              paddingHorizontal: 14,
              paddingVertical: 10
            }}
          >
            <Text style={{ color: "white", fontWeight: "700" }}>{formatCurrency(listing.price)}</Text>
          </View>
        </View>
        <View style={{ padding: 18, gap: 8 }}>
          <Text style={{ fontSize: 20, fontWeight: "700", color: theme.colors.text }}>{listing.title}</Text>
          <Text style={{ color: theme.colors.textMuted }}>{listing.location}</Text>
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {listing.vrUrl ? <Badge label="VR Tour" /> : null}
            {listing.amenities.slice(0, 3).map((amenity) => (
              <Badge key={amenity} label={amenity.replace(/_/g, " ")} />
            ))}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <View
      style={{
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: theme.colors.accentSoft
      }}
    >
      <Text style={{ color: theme.colors.text, fontSize: 12 }}>{label}</Text>
    </View>
  );
}
