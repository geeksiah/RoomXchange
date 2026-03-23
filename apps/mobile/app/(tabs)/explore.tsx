import { useState } from "react";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { FlatList, SafeAreaView, Text, TextInput, View } from "react-native";
import { PropertyCard } from "../../src/components/property-card";
import { theme } from "../../src/theme";
import { useSession } from "../../src/session-provider";

export default function ExploreScreen() {
  const router = useRouter();
  const { api } = useSession();
  const [location, setLocation] = useState("");
  const feedQuery = useQuery({
    queryKey: ["mobile-explore-feed", location],
    queryFn: () => api.getFeed({ limit: 12, location: location || undefined })
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <FlatList
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        data={feedQuery.data?.items ?? []}
        keyExtractor={(item) => item.listingId}
        ListHeaderComponent={
          <View style={{ gap: 16, marginBottom: 18 }}>
            <Text style={{ fontSize: 30, fontWeight: "700", color: theme.colors.text }}>Explore the live marketplace</Text>
            <TextInput
              value={location}
              onChangeText={setLocation}
              placeholder="Filter by location"
              placeholderTextColor={theme.colors.textMuted}
              style={{
                borderRadius: 20,
                backgroundColor: "white",
                borderWidth: 1,
                borderColor: theme.colors.border,
                paddingHorizontal: 16,
                paddingVertical: 14
              }}
            />
          </View>
        }
        renderItem={({ item }) => <PropertyCard listing={item} onPress={() => router.push(`/listings/${item.listingId}`)} />}
      />
    </SafeAreaView>
  );
}
