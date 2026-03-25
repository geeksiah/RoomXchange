import { useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Modal, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Avatar } from "../../src/components/avatar";
import { BackIconButton } from "../../src/components/back-icon-button";
import { DismissKeyboardView } from "../../src/components/dismiss-keyboard-view";
import { PropertyCard } from "../../src/components/property-card";
import { ScaleButton } from "../../src/components/scale-button";
import { openPhoneCall, openWhatsApp } from "../../src/lib/contact-actions";
import { useSession } from "../../src/session-provider";

export default function PublisherProfileScreen() {
  const params = useLocalSearchParams<{
    userId: string;
    name?: string;
    avatar?: string;
    phone?: string;
    listingId?: string;
  }>();
  const router = useRouter();
  const { api, session } = useSession();
  const [reportVisible, setReportVisible] = useState(false);
  const [reason, setReason] = useState("");

  const listingsQuery = useQuery({
    queryKey: ["publisher-listings", params.userId],
    queryFn: () => api.getUserListings(params.userId),
    enabled: Boolean(params.userId)
  });

  const reportMutation = useMutation({
    mutationFn: () =>
      api.createReport({
        listingId: String(params.listingId ?? listingsQuery.data?.[0]?.listingId ?? ""),
        targetUserId: params.userId,
        reason
      }),
    onSuccess: () => {
      setReason("");
      setReportVisible(false);
    }
  });

  const publisher = useMemo(() => {
    return {
      name: params.name ?? "Publisher",
      avatar: params.avatar ?? null,
      phone: params.phone ?? null
    };
  }, [params.avatar, params.name, params.phone]);

  return (
    <SafeAreaView className="flex-1 bg-rx-background">
      <DismissKeyboardView className="flex-1">
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
          <View className="mb-5 flex-row items-center justify-between">
            <BackIconButton fallbackPath="/" />
            <Text className="font-jakarta-bold text-2xl text-rx-text">Publisher</Text>
            {session ? (
              <ScaleButton onPress={() => setReportVisible(true)} className="h-11 w-11 items-center justify-center rounded-full bg-white">
                <Ionicons name="flag-outline" size={18} color="#111111" />
              </ScaleButton>
            ) : (
              <View className="w-11" />
            )}
          </View>

          <View className="rounded-3xl bg-white p-5">
            <View className="flex-row items-center">
              <Avatar name={publisher.name} avatar={publisher.avatar} size={64} />
              <View className="ml-4 flex-1">
                <Text className="font-jakarta-bold text-2xl text-rx-text">{publisher.name}</Text>
                {publisher.phone ? (
                  <ScaleButton onPress={() => openPhoneCall(publisher.phone!)} className="mt-1 self-start rounded-full">
                    <Text className="font-jakarta text-sm text-rx-accent">{publisher.phone}</Text>
                  </ScaleButton>
                ) : (
                  <Text className="mt-1 font-jakarta text-sm text-rx-muted">Phone number not listed publicly</Text>
                )}
              </View>
            </View>
            {publisher.phone ? (
              <View className="mt-4 flex-row gap-3">
                <ScaleButton onPress={() => openPhoneCall(publisher.phone!)} className="rounded-full bg-rx-background px-4 py-3">
                  <Text className="font-jakarta-bold text-sm text-rx-text">Call</Text>
                </ScaleButton>
                <ScaleButton onPress={() => openWhatsApp(publisher.phone!)} className="rounded-full bg-rx-background px-4 py-3">
                  <Text className="font-jakarta-bold text-sm text-rx-text">WhatsApp</Text>
                </ScaleButton>
              </View>
            ) : null}
            <View className="mt-4 rounded-2xl bg-rx-background p-4">
              <Text className="font-jakarta text-sm text-rx-muted">
                This profile shows the publisher's active listings and any contact details they chose to share.
              </Text>
            </View>
          </View>

          <View className="mt-5">
            <Text className="mb-3 font-jakarta-bold text-xl text-rx-text">Active listings</Text>
            {(listingsQuery.data ?? []).map((listing) => (
              <PropertyCard key={listing.listingId} listing={listing} onPress={() => router.push(`/listings/${listing.listingId}`)} />
            ))}
            {!listingsQuery.isLoading && !(listingsQuery.data ?? []).length ? (
              <Text className="font-jakarta text-sm text-rx-muted">No active listings found for this publisher.</Text>
            ) : null}
          </View>
        </ScrollView>

        <Modal visible={reportVisible} transparent animationType="fade" onRequestClose={() => setReportVisible(false)}>
          <View className="flex-1 justify-end bg-black/28">
            <ScaleButton onPress={() => setReportVisible(false)} className="flex-1 bg-transparent">
              <View />
            </ScaleButton>
            <View
              className="rounded-t-[32px] bg-white px-5 pb-8 pt-4"
              style={{ shadowColor: "#111111", shadowOpacity: 0.12, shadowRadius: 24, shadowOffset: { width: 0, height: -8 }, elevation: 16 }}
            >
              <View className="mb-4 h-1.5 w-14 self-center rounded-full bg-rx-border" />
              <Text className="font-jakarta-bold text-2xl text-rx-text">Report publisher</Text>
              <Text className="mt-2 font-jakarta text-sm leading-6 text-rx-muted">Describe the issue clearly. This goes to the platform owner.</Text>
              <TextInput
                value={reason}
                onChangeText={setReason}
                multiline
                returnKeyType="done"
                textAlignVertical="top"
                placeholder="Describe the concern..."
                placeholderTextColor="#6B7280"
                className="mt-4 min-h-[150px] rounded-2xl bg-rx-background px-4 py-4 font-jakarta text-base leading-6 text-rx-text"
              />
              <View className="mt-5 flex-row gap-3">
                <ScaleButton onPress={() => setReportVisible(false)} className="flex-1 rounded-full bg-rx-background py-4">
                  <Text className="text-center font-jakarta-bold text-base text-rx-text">Cancel</Text>
                </ScaleButton>
                <ScaleButton onPress={() => reportMutation.mutate()} className="flex-1 rounded-full bg-rx-accent py-4">
                  <Text className="text-center font-jakarta-bold text-base text-white">
                    {reportMutation.isPending ? "Sending..." : "Submit report"}
                  </Text>
                </ScaleButton>
              </View>
            </View>
          </View>
        </Modal>
      </DismissKeyboardView>
    </SafeAreaView>
  );
}
