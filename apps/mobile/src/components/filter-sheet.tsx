import { useEffect, useMemo, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Animated, Easing, Modal, PanResponder, Pressable, ScrollView, Switch, Text, TextInput, View, useWindowDimensions } from "react-native";
import { BlurView } from "expo-blur";
import { formatListingSubtypeLabel } from "@roomxchange/shared/src/mobile";
import { PriceRangeSlider } from "./price-range-slider";
import { ScaleButton } from "./scale-button";
import { useSearchStore } from "../stores/search-store";

export function FilterSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { height } = useWindowDimensions();
  const hiddenY = Math.max(560, height);
  const translateY = useRef(new Animated.Value(hiddenY)).current;
  const startY = useRef(hiddenY);
  const easing = Easing.bezier(0.22, 1, 0.36, 1);
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

  const closeSheet = () => {
    Animated.timing(translateY, {
      toValue: hiddenY,
      duration: 280,
      easing,
      useNativeDriver: true
    }).start(({ finished }) => {
      if (finished) {
        onClose();
      }
    });
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 4,
        onPanResponderGrant: () => {
          startY.current = (translateY as any).__getValue();
        },
        onPanResponderMove: (_, gestureState) => {
          translateY.setValue(Math.min(hiddenY, Math.max(0, startY.current + gestureState.dy)));
        },
        onPanResponderRelease: (_, gestureState) => {
          const current = startY.current + gestureState.dy;
          if (current > 180 || gestureState.vy > 0.8) {
            closeSheet();
            return;
          }

          Animated.timing(translateY, {
            toValue: 0,
            duration: 280,
            easing,
            useNativeDriver: true
          }).start();
        }
      }),
    [easing, hiddenY, translateY]
  );

  useEffect(() => {
    if (!visible) {
      translateY.setValue(hiddenY);
      return;
    }

    Animated.timing(translateY, {
      toValue: 0,
      duration: 280,
      easing,
      useNativeDriver: true
    }).start();
  }, [easing, hiddenY, translateY, visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={closeSheet}>
      <View className="flex-1 justify-end">
        <View pointerEvents="none" className="absolute inset-0">
          <BlurView intensity={34} tint="light" style={{ flex: 1 }} />
          <View className="absolute inset-0 bg-white/24" />
        </View>
        <Pressable onPress={closeSheet} className="flex-1 bg-transparent">
          <View />
        </Pressable>
        <Animated.View
          style={{
            transform: [{ translateY }],
            shadowColor: "#111111",
            shadowOpacity: 0.14,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: -8 },
            elevation: 20
          }}
          className="rounded-t-[32px] bg-white px-5 pb-9 pt-4"
        >
          <View {...panResponder.panHandlers} className="pb-2">
            <View className="mb-4 h-1.5 w-14 self-center rounded-full bg-rx-border" />
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 4 }}
          >
            <View className="mb-5 flex-row items-center justify-between">
              <View>
                <Text className="font-jakarta-bold text-2xl text-rx-text">Filters</Text>
                <Text className="mt-1 font-jakarta text-sm text-rx-muted">Refine by area, budget, room type, and tour availability.</Text>
              </View>
              <ScaleButton onPress={closeSheet} className="h-10 w-10 items-center justify-center rounded-full bg-rx-background">
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
                <View className="flex-row gap-2">
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
                        className={`flex-1 rounded-full px-4 py-3 ${active ? "bg-rx-text" : "bg-rx-background border border-rx-border"}`}
                      >
                        <Text className={`text-center font-jakarta-bold text-sm ${active ? "text-white" : "text-rx-text"}`}>{item.label}</Text>
                      </ScaleButton>
                    );
                  })}
                </View>
              </View>

              <View>
                <Text className="mb-3 font-jakarta-bold text-sm text-rx-text">Room type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="flex-row gap-2 pr-4">
                  {["studio", "single_room_sc", "one_bedroom", "two_bedroom_plus"].map((item) => {
                    const active = listingSubtypes.includes(item as typeof listingSubtypes[number]);
                    return (
                      <ScaleButton
                        key={item}
                        onPress={() => toggleListingSubtype(item as typeof listingSubtypes[number])}
                        className={`rounded-full px-4 py-3 ${active ? "bg-rx-text" : "bg-rx-background border border-rx-border"}`}
                      >
                        <Text className={`font-jakarta-bold text-sm ${active ? "text-white" : "text-rx-text"}`}>
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
              <ScaleButton onPress={closeSheet} className="flex-1 rounded-full bg-rx-accent py-4">
                <Text className="text-center font-jakarta-bold text-base text-white">Apply</Text>
              </ScaleButton>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}
