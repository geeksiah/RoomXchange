import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { FlatList, SafeAreaView, Text, TextInput, View } from "react-native";
import { PropertyCard } from "../../src/components/property-card";
import { theme } from "../../src/theme";
import { useSession } from "../../src/session-provider";

export default function HomeScreen() {
  const router = useRouter();
  const { api } = useSession();
  const feedQuery = useQuery({
    queryKey: ["mobile-home-feed"],
    queryFn: () => api.getFeed({ limit: 8 })
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <FlatList
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        data={feedQuery.data?.items ?? []}
        keyExtractor={(item) => item.listingId}
        ListHeaderComponent={
          <View style={{ gap: 18, marginBottom: 20 }}>
            <Text style={{ fontSize: 34, fontWeight: "700", color: theme.colors.text }}>Stay somewhere that feels worth the drive.</Text>
            <TextInput
              placeholder="Start your search"
              placeholderTextColor={theme.colors.textMuted}
              style={{
                borderRadius: 999,
                backgroundColor: "white",
                borderWidth: 1,
                borderColor: theme.colors.border,
                paddingHorizontal: 18,
                paddingVertical: 16
              }}
            />
          </View>
        }
        renderItem={({ item }) => <PropertyCard listing={item} onPress={() => router.push(`/listings/${item.listingId}`)} />}
        ListEmptyComponent={<Text style={{ color: theme.colors.textMuted }}>Loading live listings or waiting for the first property to go live.</Text>}
      />
    </SafeAreaView>
  );
}
