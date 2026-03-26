import { useEffect, useMemo, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Animated, Easing, FlatList, PanResponder, Text, TextInput, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import MapView, { Marker } from "react-native-maps";
import { formatMonthlyPrice, type ListingSummary } from "@roomxchange/shared/src/mobile";
import { DismissKeyboardView } from "../../src/components/dismiss-keyboard-view";
import { FilterSheet } from "../../src/components/filter-sheet";
import { PropertyCard } from "../../src/components/property-card";
import { ScaleButton } from "../../src/components/scale-button";
import { useSession } from "../../src/session-provider";
import { useNotificationStore } from "../../src/stores/notification-store";
import { useSearchStore } from "../../src/stores/search-store";

export default function ExploreScreen() {
  const router = useRouter();
  const listRef = useRef<FlatList<ListingSummary>>(null);
  const mapRef = useRef<MapView | null>(null);
  const { height } = useWindowDimensions();
  const { api } = useSession();
  const unreadNotifications = useNotificationStore((state) => state.unreadCount);
  const { query, setQuery, getActiveFilterCount, toFeedQuery } = useSearchStore();
  const [mode, setMode] = useState<"browse" | "map">("browse");
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const feedFilters = toFeedQuery();
  const activeFilterCount = getActiveFilterCount();
  const sheetHeight = height * 0.64;
  const collapsedSheetY = sheetHeight * 0.72;
  const midSheetY = sheetHeight * 0.28;
  const hiddenSheetY = sheetHeight + 24;
  const sheetTranslateY = useRef(new Animated.Value(collapsedSheetY)).current;
  const sheetStart = useRef(collapsedSheetY);
  const easing = Easing.bezier(0.22, 1, 0.36, 1);
  const blurOpacity = sheetTranslateY.interpolate({
    inputRange: [0, midSheetY, collapsedSheetY, hiddenSheetY],
    outputRange: [1, 0.35, 0.08, 0],
    extrapolate: "clamp"
  });

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
        onPanResponderGrant: () => {
          sheetStart.current = (sheetTranslateY as any).__getValue();
        },
        onPanResponderMove: (_, gestureState) => {
          sheetTranslateY.setValue(Math.min(Math.max(sheetStart.current + gestureState.dy, 0), hiddenSheetY));
        },
        onPanResponderRelease: (_, gestureState) => {
          const current = sheetStart.current + gestureState.dy;
          const snapTargets = [0, midSheetY, collapsedSheetY, hiddenSheetY];
          const destination =
            snapTargets.reduce((closest, value) => (Math.abs(value - current) < Math.abs(closest - current) ? value : closest), collapsedSheetY);

          Animated.timing(sheetTranslateY, {
            toValue: destination,
            duration: 240,
            easing,
            useNativeDriver: true
          }).start();
        }
      }),
    [collapsedSheetY, easing, hiddenSheetY, midSheetY, sheetTranslateY]
  );

  const feedQuery = useQuery({
    queryKey: ["explore-feed", feedFilters],
    queryFn: () => api.getFeed({ limit: 24, ...feedFilters })
  });

  const listings = feedQuery.data?.items ?? [];
  const selectedListing = useMemo(
    () => listings.find((item) => item.listingId === selectedListingId) ?? listings[0] ?? null,
    [listings, selectedListingId]
  );
  const mapSheetListings = useMemo(() => {
    if (!selectedListing) {
      return listings;
    }
    return listings.filter((item) => item.location === selectedListing.location);
  }, [listings, selectedListing]);

  useEffect(() => {
    if (!selectedListingId && listings[0]) {
      setSelectedListingId(listings[0].listingId);
    }
  }, [listings, selectedListingId]);

  useEffect(() => {
    if (selectedListing) {
      mapRef.current?.animateToRegion(
        {
          latitude: selectedListing.lat,
          longitude: selectedListing.lng,
          latitudeDelta: 0.14,
          longitudeDelta: 0.14
        },
        300
      );
    }
  }, [selectedListing]);

  return (
    <SafeAreaView className="flex-1 bg-rx-background" edges={["top"]}>
      <View className="px-4 pb-4 pt-2">
        <View className="flex-row items-center justify-between">
          <Text className="font-jakarta-bold text-3xl text-rx-text">Explore</Text>
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
        </View>

        <View className="mt-5 flex-row rounded-full bg-white p-1.5">
          {[
            { key: "browse", label: "Listings" },
            { key: "map", label: "Map view" }
          ].map((item) => {
            const active = mode === item.key;
            return (
              <ScaleButton
                key={item.key}
                onPress={() => setMode(item.key as "browse" | "map")}
                className={`flex-1 rounded-full px-7 py-3.5 ${active ? "bg-rx-text" : "bg-transparent"}`}
              >
                <Text className={`text-center font-jakarta-bold text-sm ${active ? "text-white" : "text-rx-muted"}`}>{item.label}</Text>
              </ScaleButton>
            );
          })}
        </View>

        {mode === "browse" ? (
          <View className="mt-4 flex-row items-center gap-3">
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search listings, neighborhoods..."
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
        ) : null}
      </View>

      {mode === "browse" ? (
        <DismissKeyboardView className="flex-1">
          <FlatList
            ref={listRef}
            data={listings}
            keyExtractor={(item) => item.listingId}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            onScroll={(event) => setShowBackToTop(event.nativeEvent.contentOffset.y > 320)}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 176 }}
            ListHeaderComponent={<Text className="mb-4 px-1 font-jakarta text-sm text-rx-muted">{listings.length ? `${listings.length} places found` : "Marketplace feed"}</Text>}
            renderItem={({ item }) => <PropertyCard listing={item} onPress={() => router.push(`/listings/${item.listingId}`)} />}
            ListEmptyComponent={<Text className="rounded-3xl bg-white p-6 font-jakarta text-base text-rx-muted">{feedQuery.isLoading ? "Loading homes for you..." : "No homes match the current filters."}</Text>}
          />
          {showBackToTop ? (
            <View className="absolute bottom-32 right-5">
              <ScaleButton onPress={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })} className="h-12 w-12 items-center justify-center rounded-full bg-rx-text">
                <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
              </ScaleButton>
            </View>
          ) : null}
        </DismissKeyboardView>
      ) : (
        <View className="flex-1">
          <MapView
            ref={mapRef}
            style={{ flex: 1 }}
            initialRegion={{
              latitude: selectedListing?.lat ?? 5.6037,
              longitude: selectedListing?.lng ?? -0.187,
              latitudeDelta: 0.18,
              longitudeDelta: 0.18
            }}
          >
            {listings.map((listing) => (
              <Marker
                key={listing.listingId}
                coordinate={{ latitude: listing.lat, longitude: listing.lng }}
                pinColor={listing.listingId === selectedListing?.listingId ? "#111111" : "#FF385C"}
                onPress={() => {
                  setSelectedListingId(listing.listingId);
                  Animated.timing(sheetTranslateY, {
                    toValue: midSheetY,
                    duration: 240,
                    easing,
                    useNativeDriver: true
                  }).start();
                }}
              />
            ))}
          </MapView>

          <Animated.View
            pointerEvents="none"
            style={{ opacity: blurOpacity }}
            className="absolute inset-0"
          >
            <BlurView intensity={34} tint="light" style={{ flex: 1 }} />
            <View className="absolute inset-0 bg-white/12" />
          </Animated.View>

          <View className="absolute right-4 top-4">
            <ScaleButton
              onPress={() => setFiltersVisible(true)}
              className="h-12 w-12 items-center justify-center rounded-full bg-white"
              contentStyle={{
                shadowColor: "#111111",
                shadowOpacity: 0.1,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 6 },
                elevation: 7
              }}
            >
              <View>
                <Ionicons name="options-outline" size={22} color="#111111" />
                {activeFilterCount > 0 ? (
                  <View className="absolute -right-2 -top-2 min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rx-accent px-1">
                    <Text className="text-center font-jakarta-bold text-[10px] text-white">{activeFilterCount}</Text>
                  </View>
                ) : null}
              </View>
            </ScaleButton>
          </View>

          <Animated.View
            style={{
              height: sheetHeight,
              transform: [{ translateY: sheetTranslateY }],
              shadowColor: "#111111",
              shadowOpacity: 0.08,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: -4 },
              elevation: 14
            }}
            className="absolute inset-x-0 bottom-0 rounded-t-[30px] bg-rx-background px-4 pb-7 pt-4"
          >
            <View {...panResponder.panHandlers} className="pb-3">
              <View className="mb-3 h-1.5 w-14 self-center rounded-full bg-rx-border" />
            </View>
            <View className="mb-4 flex-row items-center justify-between">
              <View>
                <Text className="font-jakarta-bold text-xl text-rx-text">Map results</Text>
                <Text className="mt-1 font-jakarta text-xs text-rx-muted">
                  {selectedListing
                    ? `${mapSheetListings.length} listing${mapSheetListings.length === 1 ? "" : "s"} in ${selectedListing.location}`
                    : "No nearby listings"}
                </Text>
              </View>
              {selectedListing ? (
                <ScaleButton
                  onPress={() =>
                    router.push({
                      pathname: "/explore/location/[location]",
                      params: { location: selectedListing.location }
                    } as never)
                  }
                  className="rounded-full bg-white px-4 py-2"
                >
                  <Text className="font-jakarta text-sm text-rx-accent">View area</Text>
                </ScaleButton>
              ) : null}
            </View>

            <FlatList
              key="map-results-grid"
              data={mapSheetListings}
              keyExtractor={(item) => item.listingId}
              numColumns={2}
              columnWrapperStyle={{ gap: 12 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 120 }}
              renderItem={({ item }) => <MapResultCard listing={item} onPress={() => router.push(`/listings/${item.listingId}`)} />}
              ListEmptyComponent={<Text className="font-jakarta text-sm text-rx-muted">{feedQuery.isLoading ? "Loading map listings..." : "No properties available on the map."}</Text>}
            />
          </Animated.View>
        </View>
      )}

      <FilterSheet visible={filtersVisible} onClose={() => setFiltersVisible(false)} />
    </SafeAreaView>
  );
}

function MapResultCard({ listing, onPress }: { listing: ListingSummary; onPress: () => void }) {
  return (
    <ScaleButton
      onPress={onPress}
      className="mb-3 w-[48%] overflow-hidden rounded-3xl bg-white"
      contentStyle={{
        shadowColor: "#111111",
        shadowOpacity: 0.05,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 5
      }}
    >
      <Image source={listing.previewImage} style={{ width: "100%", height: 120 }} contentFit="cover" />
      <View className="px-3 pb-4 pt-3">
        <Text className="font-jakarta-bold text-sm text-rx-text" numberOfLines={2}>
          {listing.title}
        </Text>
        <Text className="mt-1 font-jakarta text-xs text-rx-muted" numberOfLines={1}>
          {listing.location}
        </Text>
        <Text className="mt-2 font-jakarta-bold text-sm text-rx-text">{formatMonthlyPrice(listing.price)}</Text>
      </View>
    </ScaleButton>
  );
}
