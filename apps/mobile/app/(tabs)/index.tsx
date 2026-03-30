import { useMemo, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { FlatList, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Avatar } from "../../src/components/avatar";
import { DismissKeyboardView } from "../../src/components/dismiss-keyboard-view";
import { EmptyStateCard } from "../../src/components/empty-state-card";
import { FilterSheet } from "../../src/components/filter-sheet";
import { PropertyCard } from "../../src/components/property-card";
import { ScaleButton } from "../../src/components/scale-button";
import { useSession } from "../../src/session-provider";
import { useNotificationStore } from "../../src/stores/notification-store";
import { useSearchStore } from "../../src/stores/search-store";

export default function HomeScreen() {
  const router = useRouter();
  const listRef = useRef<FlatList<any>>(null);
  const { api, session } = useSession();
  const unreadNotifications = useNotificationStore((state) => state.unreadCount);
  const { locationLabel, query, setQuery, getActiveFilterCount, toFeedQuery } = useSearchStore();
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const feedFilters = toFeedQuery();
  const queryKey = useMemo(() => ["home-feed", feedFilters], [feedFilters]);
  const activeFilterCount = getActiveFilterCount();

  const feedQuery = useQuery({
    queryKey,
    queryFn: () => api.getFeed({ limit: 12, ...feedFilters })
  });

  return (
    <SafeAreaView className="flex-1 bg-rx-background" edges={["top"]}>
      <DismissKeyboardView className="flex-1">
        <View className="px-4 pb-4 pt-2">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="font-jakarta text-xs uppercase tracking-[1.8px] text-rx-muted">Location</Text>
              <Text className="mt-1 font-jakarta-bold text-2xl text-rx-text">{locationLabel}</Text>
            </View>
            <View className="flex-row items-center gap-3">
              <ScaleButton onPress={() => router.push("/notifications")} className="h-11 w-11 items-center justify-center rounded-full bg-white">
                <View>
                  <Ionicons name="notifications-outline" size={22} color="#111111" />
                  {unreadNotifications > 0 ? (
                    <View className="absolute -right-2 -top-2 min-w-[18px] rounded-full bg-rx-accent px-1.5 py-0.5">
                      <Text className="text-center font-jakarta-bold text-[10px] text-white">{unreadNotifications > 9 ? "9+" : unreadNotifications}</Text>
                    </View>
                  ) : null}
                </View>
              </ScaleButton>
              <ScaleButton onPress={() => router.push("/profile")} className="rounded-full">
                <Avatar name={session?.user.name ?? "Guest"} avatar={session?.user.avatar} size={42} />
              </ScaleButton>
            </View>
          </View>

          <View className="mt-5 flex-row items-center gap-3">
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search rooms, apartments..."
              placeholderTextColor="#6B7280"
              returnKeyType="search"
              className="flex-1 rounded-full bg-white px-5 py-4 font-jakarta text-base leading-6 text-rx-text"
            />
            <ScaleButton onPress={() => setFiltersVisible(true)} className="h-14 w-14 items-center justify-center rounded-full bg-white">
              <View>
                <Ionicons name="options-outline" size={22} color="#111111" />
                {activeFilterCount > 0 ? (
                  <View className="absolute -right-2 -top-2 min-w-[18px] rounded-full bg-rx-accent px-1.5 py-0.5">
                    <Text className="text-center font-jakarta-bold text-[10px] text-white">{activeFilterCount}</Text>
                  </View>
                ) : null}
              </View>
            </ScaleButton>
          </View>
        </View>

        <FlatList
          ref={listRef}
          data={feedQuery.data?.items ?? []}
          keyExtractor={(item) => item.listingId}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          onScroll={(event) => setShowBackToTop(event.nativeEvent.contentOffset.y > 320)}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 176 }}
          renderItem={({ item }) => <PropertyCard listing={item} onPress={() => router.push(`/listings/${item.listingId}`)} />}
          ListEmptyComponent={
            <EmptyStateCard
              icon="home-outline"
              title={feedQuery.isLoading ? "Loading homes for you" : "No homes match these filters"}
              description={
                feedQuery.isLoading
                  ? "We are getting the latest rooms and apartments ready for your feed."
                  : "Try a broader search, adjust your filters, or explore another area to discover more places."
              }
              actionLabel={feedQuery.isLoading ? undefined : "Adjust filters"}
              onActionPress={feedQuery.isLoading ? undefined : () => setFiltersVisible(true)}
            />
          }
        />

        {showBackToTop ? (
          <View className="absolute bottom-32 right-5">
            <ScaleButton
              onPress={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })}
              className="h-12 w-12 items-center justify-center rounded-full bg-rx-text"
            >
              <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
            </ScaleButton>
          </View>
        ) : null}
      </DismissKeyboardView>

      <FilterSheet visible={filtersVisible} onClose={() => setFiltersVisible(false)} />
    </SafeAreaView>
  );
}
