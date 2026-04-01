import { useState } from "react";
import { useRouter } from "expo-router";
import { ScrollView, Switch, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { formatListingSubtypeLabel } from "@roomxchange/shared/src/mobile";
import { AuthRedirectCard } from "../../src/components/auth-redirect-card";
import { BackIconButton } from "../../src/components/back-icon-button";
import { PriceRangeSlider } from "../../src/components/price-range-slider";
import { ScreenHeader } from "../../src/components/screen-header";
import { ScaleButton } from "../../src/components/scale-button";
import { SessionLoadingCard } from "../../src/components/session-loading-card";
import { useSession } from "../../src/session-provider";
import { useNotificationStore } from "../../src/stores/notification-store";

function getFriendlyAlertError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (message.includes("sign in again") || message.includes("authentication is required")) {
    return "Your session expired. Sign in again to manage alerts.";
  }

  if (message.includes("network error") || message.includes("network request failed")) {
    return "We couldn't reach RoomXchange right now. Check your internet connection and try again.";
  }

  return "We could not save this alert right now.";
}

export default function AlertsScreen() {
  const router = useRouter();
  const { api, session, hydrated } = useSession();
  const reminders = useNotificationStore((state) => state.reminders);
  const upsertReminder = useNotificationStore((state) => state.upsertReminder);
  const toggleReminder = useNotificationStore((state) => state.toggleReminder);
  const deleteReminder = useNotificationStore((state) => state.deleteReminder);
  const [location, setLocation] = useState("");
  const [propertyType, setPropertyType] = useState<"all" | "room" | "apartment">("all");
  const [listingSubtypes, setListingSubtypes] = useState<("studio" | "single_room_sc" | "one_bedroom" | "two_bedroom_plus")[]>([]);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(6000);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const resetForm = () => {
    setLocation("");
    setPropertyType("all");
    setListingSubtypes([]);
    setMinPrice(0);
    setMaxPrice(6000);
  };

  const toggleSubtype = (value: "studio" | "single_room_sc" | "one_bedroom" | "two_bedroom_plus") => {
    setListingSubtypes((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));
  };

  if (!hydrated) {
    return (
      <SafeAreaView className="flex-1 bg-rx-background">
        <View className="flex-1 p-4">
          <SessionLoadingCard description="We are restoring your saved alerts and account details." />
        </View>
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView className="flex-1 bg-rx-background">
        <View className="flex-1 p-4">
          <AuthRedirectCard
            title="Sign in to manage saved alerts"
            description="Create, pause, and remove listing alerts after you sign in."
            redirectTo="/profile/alerts"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-rx-background">
      <View className="flex-1">
        <ScreenHeader title="Saved alerts" left={<BackIconButton fallbackPath="/profile" />} />
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 176 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="px-4">
            <View
              className="rounded-[32px] bg-white px-5 pb-7 pt-4"
              style={{
                shadowColor: "#111111",
                shadowOpacity: 0.08,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 8 },
                elevation: 10
              }}
            >
              <View className="mb-5 h-1.5 w-14 self-center rounded-full bg-rx-border" />
              <Text className="font-jakarta-bold text-2xl text-rx-text">Create alert</Text>
              <Text className="mt-1 font-jakarta text-sm text-rx-muted">Choose an area, price range, and home type to get notified when a match appears.</Text>

              <View className="mt-6 gap-6">
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
                          onPress={() => toggleSubtype(item as typeof listingSubtypes[number])}
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
                  <Text className="mb-3 font-jakarta-bold text-sm text-rx-text">Budget</Text>
                  <PriceRangeSlider minValue={minPrice} maxValue={maxPrice} onChange={(nextMin, nextMax) => {
                    setMinPrice(nextMin);
                    setMaxPrice(nextMax);
                  }} />
                </View>
              </View>

              <View className="mt-6 flex-row gap-3">
                <ScaleButton
                  onPress={() => {
                    setFeedback(null);
                    resetForm();
                  }}
                  className="flex-1 rounded-full bg-rx-background py-4"
                >
                  <Text className="text-center font-jakarta-bold text-base text-rx-text">Reset</Text>
                </ScaleButton>
                <ScaleButton
                  onPress={async () => {
                    if (submitting) {
                      return;
                    }

                    const normalizedLocation = location.trim();
                    if (!normalizedLocation) {
                      setFeedback("Add a location to save this alert.");
                      return;
                    }

                    setSubmitting(true);
                    setFeedback(null);
                    try {
                      const reminder = await api.upsertReminder({
                        location: normalizedLocation,
                        propertyType,
                        listingSubtypes,
                        minBudget: minPrice,
                        maxBudget: maxPrice,
                        enabled: true
                      });
                      upsertReminder(reminder);
                      resetForm();
                      setFeedback("Alert saved.");
                    } catch (error) {
                      const nextFeedback = getFriendlyAlertError(error);
                      setFeedback(nextFeedback);
                      if (nextFeedback.includes("Sign in again")) {
                        router.push({
                          pathname: "/auth/login",
                          params: { redirect: "/profile/alerts" }
                        } as never);
                      }
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                  className={`flex-1 rounded-full py-4 ${submitting ? "bg-rx-border" : "bg-rx-accent"}`}
                >
                  <Text className="text-center font-jakarta-bold text-base text-white">{submitting ? "Saving..." : "Save alert"}</Text>
                </ScaleButton>
              </View>
              {feedback ? <Text className="mt-3 font-jakarta text-sm text-rx-muted">{feedback}</Text> : null}
            </View>

            <View className="mt-5 rounded-3xl bg-white p-5">
              <Text className="font-jakarta-bold text-xl text-rx-text">Active alerts</Text>
              {reminders.length ? (
                <View className="mt-4 gap-3">
                  {reminders.map((reminder) => (
                    <View key={reminder.id} className="rounded-2xl bg-rx-background p-4">
                      <View className="flex-row items-start justify-between">
                        <View className="mr-4 flex-1">
                          <Text className="font-jakarta-bold text-base text-rx-text">{reminder.location}</Text>
                          <Text className="mt-1 font-jakarta text-sm text-rx-muted">
                            {reminder.listingSubtypes.length
                              ? reminder.listingSubtypes.map((item) => formatListingSubtypeLabel(item)).join(", ")
                              : reminder.propertyType === "all"
                                ? "All homes"
                                : reminder.propertyType === "room"
                                  ? "Rooms"
                                  : "Apartments"}
                          </Text>
                          <Text className="mt-2 font-jakarta text-sm text-rx-text">
                            GHS {reminder.minBudget.toLocaleString("en-GH")} - GHS {reminder.maxBudget.toLocaleString("en-GH")}
                          </Text>
                        </View>
                        <Switch
                          value={reminder.enabled}
                          onValueChange={async (value) => {
                            toggleReminder(reminder.id, value);
                            try {
                              await api.updateReminder(reminder.id, {
                                id: reminder.id,
                                location: reminder.location,
                                propertyType: reminder.propertyType,
                                listingSubtypes: reminder.listingSubtypes,
                                minBudget: reminder.minBudget,
                                maxBudget: reminder.maxBudget,
                                enabled: value
                              });
                            } catch (error) {
                              toggleReminder(reminder.id, reminder.enabled);
                              setFeedback(getFriendlyAlertError(error));
                            }
                          }}
                          trackColor={{ false: "#EAEAEA", true: "#FFB6C4" }}
                          thumbColor={reminder.enabled ? "#FF385C" : "#FFFFFF"}
                        />
                      </View>
                      <View className="mt-4 flex-row justify-end">
                        <ScaleButton
                          onPress={async () => {
                            try {
                              await api.deleteReminder(reminder.id);
                              deleteReminder(reminder.id);
                            } catch (error) {
                              setFeedback(getFriendlyAlertError(error));
                            }
                          }}
                          className="rounded-full bg-white px-4 py-2"
                        >
                          <Text className="font-jakarta text-xs text-rx-text">Delete</Text>
                        </ScaleButton>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <Text className="mt-4 font-jakarta text-sm text-rx-muted">No alerts saved yet.</Text>
              )}
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
