import { Ionicons } from "@expo/vector-icons";
import { Modal, Platform, Pressable, ScrollView, Switch, Text, TextInput, View, useWindowDimensions } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatListingSubtypeLabel } from "@roomxchange/shared/src/mobile";
import { PriceRangeSlider } from "./price-range-slider";
import { ScaleButton } from "./scale-button";
import { useSearchStore } from "../stores/search-store";

export function FilterSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 18);
  const sheetMaxHeight = Math.min(height * 0.88, 760);
  const {
    location,
    propertyType,
    listingSubtypes,
    minPrice,
    maxPrice,
    hasVr,
    setLocation,
    setPropertyType,
    toggleListingSubtype,
    setPriceRange,
    setHasVr,
    resetFilters
  } = useSearchStore();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent hardwareAccelerated>
      <View className="flex-1 justify-end">
        <Pressable onPress={onClose} className="absolute inset-0">
          {Platform.OS === "ios" ? (
            <>
              <BlurView intensity={34} tint="light" style={{ flex: 1 }} />
              <View className="absolute inset-0 bg-white/24" />
            </>
          ) : (
            <View style={{ flex: 1, backgroundColor: "rgba(17, 17, 17, 0.16)" }} />
          )}
        </Pressable>

        <View
          className="rounded-t-[32px] bg-white px-5 pt-4"
          style={{
            maxHeight: sheetMaxHeight,
            shadowColor: "#111111",
            shadowOpacity: 0.14,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: -8 },
            elevation: 20
          }}
        >
          <View className="pb-2">
            <View className="mb-4 h-1.5 w-14 self-center rounded-full bg-rx-border" />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            overScrollMode="never"
            contentContainerStyle={{ paddingBottom: bottomInset + 6 }}
          >
            <View className="mb-5 flex-row items-center justify-between">
              <View className="flex-1 pr-4">
                <Text className="font-jakarta-bold text-2xl text-rx-text">Filters</Text>
                <Text className="mt-1 font-jakarta text-sm text-rx-muted">Refine by area, budget, room type, and tour availability.</Text>
              </View>
              <ScaleButton onPress={onClose} className="h-10 w-10 items-center justify-center rounded-full bg-rx-background">
                <Ionicons name="close" size={20} color="#111111" />
              </ScaleButton>
            </View>

            <View className="gap-6">
              <View>
                <Text className="mb-2 font-jakarta-bold text-sm text-rx-text">Location</Text>
                <TextInput
                  value={location}
                  onChangeText={setLocation}
                  placeholder="Accra, East Legon..."
                  placeholderTextColor="#6B7280"
                  returnKeyType="done"
                  className="rounded-2xl bg-rx-background px-4 py-4 font-jakarta text-base leading-6 text-rx-text"
                />
              </View>

              <View>
                <Text className="mb-3 font-jakarta-bold text-sm text-rx-text">Listing type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} overScrollMode="never">
                  <View className="flex-row gap-2 pr-4">
                    {[
                      { key: "all", label: "All" },
                      { key: "room", label: "Rooms" },
                      { key: "apartment", label: "Apartments" }
                    ].map((item) => {
                      const active = propertyType === item.key;
                      return (
                        <ScaleButton
                          key={item.key}
                          onPress={() => setPropertyType(item.key as "all" | "room" | "apartment")}
                          className={`rounded-full px-4 py-3 ${active ? "bg-rx-text" : "border border-rx-border bg-rx-background"}`}
                        >
                          <Text className={`font-jakarta-bold text-sm ${active ? "text-white" : "text-rx-text"}`} numberOfLines={1}>
                            {item.label}
                          </Text>
                        </ScaleButton>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>

              <View>
                <Text className="mb-3 font-jakarta-bold text-sm text-rx-text">Room type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} overScrollMode="never">
                  <View className="flex-row gap-2 pr-4">
                    {["studio", "single_room_sc", "one_bedroom", "two_bedroom_plus"].map((item) => {
                      const active = listingSubtypes.includes(item as typeof listingSubtypes[number]);
                      return (
                        <ScaleButton
                          key={item}
                          onPress={() => toggleListingSubtype(item as typeof listingSubtypes[number])}
                          className={`rounded-full px-4 py-3 ${active ? "bg-rx-text" : "border border-rx-border bg-rx-background"}`}
                        >
                          <Text className={`font-jakarta-bold text-sm ${active ? "text-white" : "text-rx-text"}`} numberOfLines={1}>
                            {formatListingSubtypeLabel(item)}
                          </Text>
                        </ScaleButton>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>

              <View className="rounded-3xl bg-rx-background p-4">
                <Text className="mb-3 font-jakarta-bold text-sm text-rx-text">Price range</Text>
                <PriceRangeSlider minValue={minPrice} maxValue={maxPrice} onChange={setPriceRange} />
              </View>

              <View className="flex-row items-center justify-between rounded-3xl bg-rx-background px-4 py-4">
                <View className="mr-4 flex-1">
                  <Text className="font-jakarta-bold text-sm text-rx-text">3D tours only</Text>
                  <Text className="mt-1 font-jakarta text-xs leading-5 text-rx-muted">Only show listings that already include an interactive walkthrough.</Text>
                </View>
                <Switch value={hasVr} onValueChange={setHasVr} trackColor={{ false: "#EAEAEA", true: "#FFB6C4" }} thumbColor={hasVr ? "#FF385C" : "#FFFFFF"} />
              </View>
            </View>

            <View className="mt-6 flex-row gap-3">
              <ScaleButton
                onPress={() => {
                  resetFilters();
                }}
                className="flex-1 rounded-full bg-rx-background py-4"
              >
                <Text className="text-center font-jakarta-bold text-base text-rx-text">Reset</Text>
              </ScaleButton>
              <ScaleButton onPress={onClose} className="flex-1 rounded-full bg-rx-accent py-4">
                <Text className="text-center font-jakarta-bold text-base text-white">Apply</Text>
              </ScaleButton>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
