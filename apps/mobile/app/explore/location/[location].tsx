import { useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { FlatList, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackIconButton } from "../../../src/components/back-icon-button";
import { CounterBadge } from "../../../src/components/counter-badge";
import { DismissKeyboardView } from "../../../src/components/dismiss-keyboard-view";
import { FilterSheet } from "../../../src/components/filter-sheet";
import { PropertyCard } from "../../../src/components/property-card";
import { ScaleButton } from "../../../src/components/scale-button";
import { useSession } from "../../../src/session-provider";
import { useSearchStore } from "../../../src/stores/search-store";

export default function LocationResultsScreen() {
  const params = useLocalSearchParams<{ location: string }>();
  const router = useRouter();
  const { api } = useSession();
  const { query, setQuery, getActiveFilterCount, toFeedQuery } = useSearchStore();
  const [filtersVisible, setFiltersVisible] = useState(false);
  const activeFilterCount = getActiveFilterCount();
  const feedFilters = useMemo(
    () => ({
      ...toFeedQuery(),
      location: decodeURIComponent(params.location)
    }),
    [params.location, toFeedQuery]
  );

  const locationQuery = useQuery({
    queryKey: ["location-results", feedFilters],
    queryFn: () => api.getFeed({ limit: 24, ...feedFilters })
  });

  return (
    <SafeAreaView className="flex-1 bg-rx-background">
      <DismissKeyboardView className="flex-1">
        <View className="px-4 pb-4 pt-3">
          <View className="flex-row items-center justify-between">
            <BackIconButton fallbackPath="/explore" />
            <Text className="font-jakarta-bold text-2xl text-rx-text">Area results</Text>
            <View className="w-11" />
          </View>

          <Text className="mt-4 font-jakarta-bold text-3xl text-rx-text">{decodeURIComponent(params.location)}</Text>
          <Text className="mt-1 font-jakarta text-sm text-rx-muted">Browse all listings around the selected map area.</Text>

          <View className="mt-4 flex-row items-center gap-3">
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search this area..."
              placeholderTextColor="#6B7280"
              returnKeyType="search"
              className="flex-1 rounded-full bg-white px-5 py-4 font-jakarta text-base leading-6 text-rx-text"
            />
            <ScaleButton onPress={() => setFiltersVisible(true)} className="h-14 w-14 items-center justify-center rounded-full bg-white">
              <View>
                <Ionicons name="options-outline" size={22} color="#111111" />
                {activeFilterCount > 0 ? (
                  <CounterBadge value={activeFilterCount > 9 ? "9+" : activeFilterCount} className="absolute -right-2 -top-2" />
                ) : null}
              </View>
            </ScaleButton>
          </View>
        </View>

        <FlatList
          data={locationQuery.data?.items ?? []}
          keyExtractor={(item) => item.listingId}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
          renderItem={({ item }) => <PropertyCard listing={item} onPress={() => router.push(`/listings/${item.listingId}`)} />}
          ListEmptyComponent={<Text className="font-jakarta text-sm text-rx-muted">{locationQuery.isLoading ? "Loading listings..." : "No listings found for this area."}</Text>}
        />
      </DismissKeyboardView>
      <FilterSheet visible={filtersVisible} onClose={() => setFiltersVisible(false)} />
    </SafeAreaView>
  );
}
