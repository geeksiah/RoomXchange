import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Animated, FlatList, Modal, PanResponder, Platform, Text, TextInput, View, useWindowDimensions } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import MapView, { Marker } from "react-native-maps";
import { formatMonthlyPrice, type ListingSummary } from "@roomxchange/shared/src/mobile";
import { CounterBadge } from "../../src/components/counter-badge";
import { DismissKeyboardView } from "../../src/components/dismiss-keyboard-view";
import { EmptyStateCard } from "../../src/components/empty-state-card";
import { FilterSheet } from "../../src/components/filter-sheet";
import { NativeMapBoundary } from "../../src/components/native-map-boundary";
import { PropertyCard } from "../../src/components/property-card";
import { ScaleButton } from "../../src/components/scale-button";
import { getMapAvailabilityHint, getNativeMapProvider, isNativeMapConfigured, logNativeMapDiagnostics } from "../../src/lib/maps";
import { settleSpring } from "../../src/lib/motion";
import { useSession } from "../../src/session-provider";
import { useNotificationStore } from "../../src/stores/notification-store";
import { useSearchStore } from "../../src/stores/search-store";

function hasValidCoordinates(listing: ListingSummary) {
  return Number.isFinite(listing.lat) && Number.isFinite(listing.lng);
}

export default function ExploreScreen() {
  const router = useRouter();
  const listRef = useRef<FlatList<ListingSummary>>(null);
  const mapRef = useRef<MapView | null>(null);
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isAndroid = Platform.OS === "android";
  const { api } = useSession();
  const unreadNotifications = useNotificationStore((state) => state.unreadCount);
  const { query, setQuery, getActiveFilterCount, toFeedQuery } = useSearchStore();
  const [mode, setMode] = useState<"browse" | "map">("browse");
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [androidResultsVisible, setAndroidResultsVisible] = useState(false);
  const [mapRenderFailed, setMapRenderFailed] = useState(false);
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
  const blurOpacity = sheetTranslateY.interpolate({
    inputRange: [0, midSheetY, collapsedSheetY, hiddenSheetY],
    outputRange: [1, 0.35, 0.08, 0],
    extrapolate: "clamp"
  });

  const animateSheetTo = useCallback(
    (toValue: number) => {
      Animated.spring(sheetTranslateY, {
        toValue,
        ...settleSpring
      }).start();
    },
    [sheetTranslateY]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dy) > 4 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onPanResponderGrant: () => {
          sheetStart.current = (sheetTranslateY as unknown as { __getValue: () => number }).__getValue();
        },
        onPanResponderMove: (_, gestureState) => {
          sheetTranslateY.setValue(Math.min(Math.max(sheetStart.current + gestureState.dy, 0), hiddenSheetY));
        },
        onPanResponderRelease: (_, gestureState) => {
          const current = sheetStart.current + gestureState.dy;
          const snapTargets = [0, midSheetY, collapsedSheetY, hiddenSheetY];
          const destination =
            snapTargets.reduce((closest, value) => (Math.abs(value - current) < Math.abs(closest - current) ? value : closest), collapsedSheetY);

          animateSheetTo(destination);
        }
      }),
    [animateSheetTo, collapsedSheetY, hiddenSheetY, midSheetY, sheetTranslateY]
  );

  const feedQuery = useQuery({
    queryKey: ["explore-feed", feedFilters],
    queryFn: () => api.getFeed({ limit: 24, ...feedFilters })
  });

  const listings = feedQuery.data?.items ?? [];
  const mapListings = useMemo(() => listings.filter(hasValidCoordinates), [listings]);
  const selectedListing = useMemo(
    () => mapListings.find((item) => item.listingId === selectedListingId) ?? mapListings[0] ?? null,
    [mapListings, selectedListingId]
  );
  const mapSheetListings = useMemo(() => {
    if (!selectedListing) {
      return mapListings;
    }
    return mapListings.filter((item) => item.location === selectedListing.location);
  }, [mapListings, selectedListing]);
  const mapAreaOptions = useMemo(() => {
    const grouped = new Map<string, { location: string; count: number; listingId: string }>();

    for (const listing of mapListings) {
      const existing = grouped.get(listing.location);
      if (existing) {
        existing.count += 1;
        continue;
      }

      grouped.set(listing.location, {
        location: listing.location,
        count: 1,
        listingId: listing.listingId
      });
    }

    return [...grouped.values()];
  }, [mapListings]);
  const selectedArea = useMemo(
    () => mapAreaOptions.find((item) => item.location === selectedListing?.location) ?? mapAreaOptions[0] ?? null,
    [mapAreaOptions, selectedListing?.location]
  );
  const nativeMapConfigured = useMemo(() => isNativeMapConfigured(), []);
  const mapProvider = useMemo(() => getNativeMapProvider(), []);
  const androidBottomOffset = Math.max(insets.bottom, 18);

  const openAreaResults = useCallback(() => {
    if (!selectedListing) {
      return;
    }

    router.push({
      pathname: "/explore/location/[location]",
      params: { location: selectedListing.location }
    } as never);
  }, [router, selectedListing]);

  useEffect(() => {
    if (!selectedListingId && mapListings[0]) {
      setSelectedListingId(mapListings[0].listingId);
    }
  }, [mapListings, selectedListingId]);

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

  useEffect(() => {
    if (mode !== "map") {
      setAndroidResultsVisible(false);
    }
  }, [mode]);

  useEffect(() => {
    if (mode === "map") {
      logNativeMapDiagnostics("explore.map_attempt");
    }
  }, [mode]);

  useEffect(() => {
    if (mode === "map") {
      setMapRenderFailed(false);
    }
  }, [mode, selectedListing?.listingId]);

  const browseContent = (
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
        ListEmptyComponent={
          <EmptyStateCard
            icon="search-outline"
            title={feedQuery.isLoading ? "Loading homes for you" : "No homes match these filters"}
            description={
              feedQuery.isLoading
                ? "We are pulling the latest rooms and apartments for you now."
                : "Try a different search, widen your budget, or switch neighborhoods to see more listings."
            }
            actionLabel={feedQuery.isLoading ? undefined : "Adjust filters"}
            onActionPress={feedQuery.isLoading ? undefined : () => setFiltersVisible(true)}
          />
        }
      />
      {showBackToTop ? (
        <View className="absolute bottom-32 right-5">
          <ScaleButton onPress={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })} className="h-12 w-12 items-center justify-center rounded-full bg-rx-text">
            <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
          </ScaleButton>
        </View>
      ) : null}
    </DismissKeyboardView>
  );

  const unavailableMapContent = (
    <View className="flex-1 px-4 pb-10 pt-2">
      <EmptyStateCard
        icon="map-outline"
        title="Map view is not ready on this build"
        description={getMapAvailabilityHint()}
        actionLabel="Show listings"
        onActionPress={() => setMode("browse")}
      />
    </View>
  );

  const emptyMapContent = (
    <View className="flex-1 px-4 pb-10 pt-2">
      <EmptyStateCard
        icon="locate-outline"
        title={feedQuery.isLoading ? "Loading map listings" : "No mapped listings yet"}
        description={
          feedQuery.isLoading
            ? "We are preparing map-ready listings now."
            : "Switch back to the list view or broaden your search to see more results."
        }
        actionLabel={feedQuery.isLoading ? undefined : "Show listings"}
        onActionPress={feedQuery.isLoading ? undefined : () => setMode("browse")}
      />
    </View>
  );

  const androidMapContent =
    !nativeMapConfigured || mapRenderFailed ? (
      unavailableMapContent
    ) : !mapListings.length ? (
      emptyMapContent
    ) : (
      <NativeMapBoundary
        resetKey={selectedListing?.listingId ?? "android-map"}
        fallback={unavailableMapContent}
        onError={() => setMapRenderFailed(true)}
        onReset={() => setMapRenderFailed(false)}
      >
        <View className="flex-1">
          <MapView
            ref={mapRef}
            style={{ flex: 1 }}
            provider={mapProvider}
            googleRenderer={isAndroid ? "LEGACY" : undefined}
            initialRegion={{
              latitude: selectedListing?.lat ?? 5.6037,
              longitude: selectedListing?.lng ?? -0.187,
              latitudeDelta: 0.18,
              longitudeDelta: 0.18
            }}
            onMapReady={() => setMapRenderFailed(false)}
          >
            {mapListings.map((listing) => (
              <Marker
                key={listing.listingId}
                coordinate={{ latitude: listing.lat, longitude: listing.lng }}
                pinColor={listing.listingId === selectedListing?.listingId ? "#111111" : "#FF385C"}
                onPress={() => {
                  setSelectedListingId(listing.listingId);
                }}
              />
            ))}
          </MapView>

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
                  <CounterBadge value={activeFilterCount > 9 ? "9+" : activeFilterCount} className="absolute -right-2 -top-2" />
                ) : null}
              </View>
            </ScaleButton>
          </View>

          {selectedListing ? (
            <View className="absolute inset-x-4" style={{ bottom: androidBottomOffset + 84 }}>
              <SelectedMapListingCard
                listing={selectedListing}
                count={mapSheetListings.length}
                onPress={() => router.push(`/listings/${selectedListing.listingId}`)}
                onOpenArea={openAreaResults}
              />
            </View>
          ) : null}

          <View className="absolute inset-x-4" style={{ bottom: androidBottomOffset + 12 }}>
            <ScaleButton
              onPress={() => setAndroidResultsVisible(true)}
              className="rounded-full bg-rx-text py-4"
              contentStyle={{
                shadowColor: "#111111",
                shadowOpacity: 0.14,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 8 },
                elevation: 10
              }}
            >
              <Text className="text-center font-jakarta-bold text-base text-white">
                {selectedArea ? `View ${mapSheetListings.length} result${mapSheetListings.length === 1 ? "" : "s"}` : "View results"}
              </Text>
            </ScaleButton>
          </View>

          <Modal visible={androidResultsVisible} animationType="slide" onRequestClose={() => setAndroidResultsVisible(false)} statusBarTranslucent>
            <SafeAreaView className="flex-1 bg-rx-background">
              <View className="flex-row items-start justify-between px-4 pb-4 pt-2">
                <View className="mr-4 flex-1">
                  <Text className="font-jakarta-bold text-2xl text-rx-text">Map results</Text>
                  <Text className="mt-1 font-jakarta text-sm text-rx-muted">
                    {selectedArea ? `${mapSheetListings.length} listing${mapSheetListings.length === 1 ? "" : "s"} in ${selectedArea.location}` : "Choose a marker to browse nearby listings."}
                  </Text>
                </View>
                <View className="flex-row gap-2">
                  <ScaleButton onPress={() => setFiltersVisible(true)} className="h-11 w-11 items-center justify-center rounded-full bg-white">
                    <View>
                      <Ionicons name="options-outline" size={20} color="#111111" />
                      {activeFilterCount > 0 ? (
                        <CounterBadge value={activeFilterCount > 9 ? "9+" : activeFilterCount} className="absolute -right-2 -top-2" />
                      ) : null}
                    </View>
                  </ScaleButton>
                  <ScaleButton onPress={() => setAndroidResultsVisible(false)} className="h-11 w-11 items-center justify-center rounded-full bg-white">
                    <Ionicons name="close" size={20} color="#111111" />
                  </ScaleButton>
                </View>
              </View>

              {selectedListing ? (
                <View className="px-4 pb-3">
                  <ScaleButton onPress={openAreaResults} className="self-start rounded-full bg-white px-4 py-3">
                    <Text className="font-jakarta text-sm text-rx-accent">Open area results</Text>
                  </ScaleButton>
                </View>
              ) : null}

              <FlatList
                key="android-map-results-grid"
                data={mapSheetListings}
                keyExtractor={(item) => item.listingId}
                numColumns={2}
                showsVerticalScrollIndicator={false}
                columnWrapperStyle={{ gap: 12 }}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 176, paddingTop: 4 }}
                renderItem={({ item }) => <MapResultCard listing={item} onPress={() => router.push(`/listings/${item.listingId}`)} />}
                ListEmptyComponent={
                  <EmptyStateCard
                    icon="locate-outline"
                    title={feedQuery.isLoading ? "Loading map listings" : "No properties in this area yet"}
                    description={
                      feedQuery.isLoading
                        ? "We are preparing nearby listings for the map view."
                        : "Choose another marker or switch back to the list view to keep exploring."
                    }
                  />
                }
              />
            </SafeAreaView>
          </Modal>
        </View>
      </NativeMapBoundary>
    );

  const iosMapContent =
    !nativeMapConfigured || mapRenderFailed ? (
      unavailableMapContent
    ) : !mapListings.length ? (
      emptyMapContent
    ) : (
      <NativeMapBoundary
        resetKey={selectedListing?.listingId ?? "map"}
        fallback={unavailableMapContent}
        onError={() => setMapRenderFailed(true)}
        onReset={() => setMapRenderFailed(false)}
      >
        <View className="flex-1">
          <MapView
            ref={mapRef}
            style={{ flex: 1 }}
            provider={mapProvider}
            initialRegion={{
              latitude: selectedListing?.lat ?? 5.6037,
              longitude: selectedListing?.lng ?? -0.187,
              latitudeDelta: 0.18,
              longitudeDelta: 0.18
            }}
            onMapReady={() => setMapRenderFailed(false)}
          >
            {mapListings.map((listing) => (
              <Marker
                key={listing.listingId}
                coordinate={{ latitude: listing.lat, longitude: listing.lng }}
                pinColor={listing.listingId === selectedListing?.listingId ? "#111111" : "#FF385C"}
                onPress={() => {
                  setSelectedListingId(listing.listingId);
                  animateSheetTo(midSheetY);
                }}
              />
            ))}
          </MapView>

          <Animated.View pointerEvents="none" style={{ opacity: blurOpacity }} className="absolute inset-0">
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
                  <CounterBadge value={activeFilterCount > 9 ? "9+" : activeFilterCount} className="absolute -right-2 -top-2" />
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
            <View {...panResponder.panHandlers} className="pb-4">
              <View className="mb-3 h-1.5 w-14 self-center rounded-full bg-rx-border" />
              <ScaleButton
                onPress={() => {
                  const current = (sheetTranslateY as unknown as { __getValue: () => number }).__getValue();
                  animateSheetTo(current <= midSheetY ? collapsedSheetY : midSheetY);
                }}
                className="rounded-[24px]"
              >
                <View className="flex-row items-center justify-between rounded-[24px] bg-white px-4 py-4">
                  <View className="mr-3 flex-1">
                    <Text className="font-jakarta-bold text-xl text-rx-text">Map results</Text>
                    <Text className="mt-1 font-jakarta text-xs text-rx-muted">
                      {selectedListing
                        ? `${mapSheetListings.length} listing${mapSheetListings.length === 1 ? "" : "s"} in ${selectedListing.location}`
                        : "No nearby listings"}
                    </Text>
                  </View>
                  {selectedListing ? (
                    <View className="rounded-full bg-rx-background px-4 py-2">
                      <Text className="font-jakarta text-sm text-rx-accent">View area</Text>
                    </View>
                  ) : null}
                </View>
              </ScaleButton>
            </View>

            {selectedListing ? (
              <View className="mb-4 flex-row justify-end">
                <ScaleButton onPress={openAreaResults} className="rounded-full bg-white px-4 py-2">
                  <Text className="font-jakarta text-sm text-rx-accent">Open area results</Text>
                </ScaleButton>
              </View>
            ) : null}

            <FlatList
              key="map-results-grid"
              data={mapSheetListings}
              keyExtractor={(item) => item.listingId}
              numColumns={2}
              nestedScrollEnabled
              columnWrapperStyle={{ gap: 12 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 120 }}
              renderItem={({ item }) => <MapResultCard listing={item} onPress={() => router.push(`/listings/${item.listingId}`)} />}
              ListEmptyComponent={
                <EmptyStateCard
                  icon="locate-outline"
                  title={feedQuery.isLoading ? "Loading map listings" : "No properties on this map yet"}
                  description={
                    feedQuery.isLoading
                      ? "We are preparing nearby listings for the map."
                      : "Switch back to the list view or try another area to keep exploring."
                  }
                />
              }
            />
          </Animated.View>
        </View>
      </NativeMapBoundary>
    );

  return (
    <SafeAreaView className="flex-1 bg-rx-background" edges={["top"]}>
      <View className="px-4 pb-4 pt-2">
        <View className="flex-row items-center justify-between">
          <Text className="font-jakarta-bold text-3xl text-rx-text">Explore</Text>
          <ScaleButton onPress={() => router.push("/notifications")} className="h-11 w-11 items-center justify-center rounded-full bg-white">
            <View>
              <Ionicons name="notifications-outline" size={22} color="#111111" />
              {unreadNotifications > 0 ? (
                <CounterBadge value={unreadNotifications > 9 ? "9+" : unreadNotifications} className="absolute -right-2 -top-2" />
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
                  <CounterBadge value={activeFilterCount > 9 ? "9+" : activeFilterCount} className="absolute -right-2 -top-2" />
                ) : null}
              </View>
            </ScaleButton>
          </View>
        ) : null}
      </View>

      {mode === "browse" ? browseContent : isAndroid ? androidMapContent : iosMapContent}

      <FilterSheet visible={filtersVisible} onClose={() => setFiltersVisible(false)} />
    </SafeAreaView>
  );
}

function SelectedMapListingCard({
  listing,
  count,
  onPress,
  onOpenArea
}: {
  listing: ListingSummary;
  count: number;
  onPress: () => void;
  onOpenArea: () => void;
}) {
  return (
    <View
      className="overflow-hidden rounded-[28px] bg-white"
      style={{
        shadowColor: "#111111",
        shadowOpacity: 0.12,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
        elevation: 10
      }}
    >
      <View className="flex-row items-center px-4 pb-4 pt-4">
        <ScaleButton onPress={onPress} className="mr-3 overflow-hidden rounded-2xl">
          <Image source={listing.previewImage} style={{ width: 82, height: 82 }} contentFit="cover" />
        </ScaleButton>
        <View className="flex-1">
          <Text className="font-jakarta-bold text-base text-rx-text" numberOfLines={2}>
            {listing.title}
          </Text>
          <Text className="mt-1 font-jakarta text-sm text-rx-muted" numberOfLines={1}>
            {listing.location}
          </Text>
          <Text className="mt-2 font-jakarta-bold text-base text-rx-text">{formatMonthlyPrice(listing.price)}</Text>
          <View className="mt-3 flex-row items-center justify-between">
            <Text className="mr-3 flex-1 font-jakarta text-xs text-rx-muted">
              {count} listing{count === 1 ? "" : "s"} in this area
            </Text>
            <ScaleButton onPress={onOpenArea} className="rounded-full bg-rx-background px-4 py-2">
              <Text className="font-jakarta text-xs text-rx-accent">Open area</Text>
            </ScaleButton>
          </View>
        </View>
      </View>
    </View>
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
