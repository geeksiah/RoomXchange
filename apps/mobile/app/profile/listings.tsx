import { useMemo, useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import { formatMonthlyPrice } from "@roomxchange/shared";
import { AuthRedirectCard } from "../../src/components/auth-redirect-card";
import { BackIconButton } from "../../src/components/back-icon-button";
import { DismissKeyboardView } from "../../src/components/dismiss-keyboard-view";
import { ScaleButton } from "../../src/components/scale-button";
import { isDemoSession } from "../../src/demo-data";
import { useSession } from "../../src/session-provider";
import { useDemoStore } from "../../src/stores/demo-store";

export default function ProfileListingsScreen() {
  const router = useRouter();
  const { session, api } = useSession();
  const queryClient = useQueryClient();
  const demoListingsState = useDemoStore((state) => state.listings);
  const [listingSearch, setListingSearch] = useState("");
  const [listingStatus, setListingStatus] = useState<"all" | "published" | "archived">("all");

  const listingsQuery = useQuery({
    queryKey: ["my-listings", session?.user.userId],
    queryFn: () => api.getUserListings(session!.user.userId),
    enabled: Boolean(session?.user.userId)
  });

  const updateListingMutation = useMutation({
    mutationFn: (payload: { listingId: string; title: string; location: string; price: number; status: "published" | "archived" }) =>
      api.updateListing(payload.listingId, {
        title: payload.title,
        location: payload.location,
        price: payload.price,
        status: payload.status
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["my-listings"] }),
        queryClient.invalidateQueries({ queryKey: ["home-feed"] }),
        queryClient.invalidateQueries({ queryKey: ["explore-feed"] })
      ]);
    }
  });

  const deleteListingMutation = useMutation({
    mutationFn: (listingId: string) => api.deleteListing(listingId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["my-listings"] }),
        queryClient.invalidateQueries({ queryKey: ["home-feed"] }),
        queryClient.invalidateQueries({ queryKey: ["explore-feed"] })
      ]);
    }
  });

  const sourceListings = useMemo<Array<{ listingId: string; title: string; location: string; price: number; status: "published" | "archived" }>>(() => {
    if (!session) {
      return [];
    }

    if (isDemoSession(session)) {
      return demoListingsState
        .filter((listing) => listing.ownerId === session.user.userId)
        .map((listing) => ({
          listingId: listing.listingId,
          title: listing.title,
          location: listing.location,
          price: listing.price,
          status: listing.status === "archived" ? "archived" : "published"
        }));
    }

    return (listingsQuery.data ?? []).map((listing) => ({
      listingId: listing.listingId,
      title: listing.title,
      location: listing.location,
      price: listing.price,
      status: "published" as const
    }));
  }, [demoListingsState, listingsQuery.data, session]);

  const filteredListings = useMemo(
    () =>
      sourceListings.filter((listing) => {
        const matchesSearch = `${listing.title} ${listing.location}`.toLowerCase().includes(listingSearch.trim().toLowerCase());
        const matchesStatus = listingStatus === "all" ? true : listing.status === listingStatus;
        return matchesSearch && matchesStatus;
      }),
    [listingSearch, listingStatus, sourceListings]
  );

  const publishedCount = sourceListings.filter((listing) => listing.status === "published").length;
  const archivedCount = sourceListings.filter((listing) => listing.status === "archived").length;

  if (!session) {
    return (
      <SafeAreaView className="flex-1 bg-rx-background">
        <View className="flex-1 p-4">
          <AuthRedirectCard
            title="Sign in to manage your listings"
            description="Edit, unlist, relist, and remove properties from your portfolio."
            redirectTo="/profile/listings"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-rx-background">
      <DismissKeyboardView className="flex-1">
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 176 }}>
          <View className="flex-row items-center justify-between pb-4">
            <BackIconButton fallbackPath="/profile" />
            <Text className="font-jakarta-bold text-2xl text-rx-text">My listings</Text>
            <ScaleButton onPress={() => router.push("/add")} className="rounded-full bg-rx-accent px-4 py-2">
              <Text className="font-jakarta-bold text-xs text-white">New listing</Text>
            </ScaleButton>
          </View>

          <View className="rounded-3xl bg-white p-5">
            <View className="flex-row gap-3">
              <View className="flex-1 rounded-2xl bg-rx-background p-4">
                <Text className="font-jakarta text-xs uppercase text-rx-muted">Published</Text>
                <Text className="mt-2 font-jakarta-bold text-2xl text-rx-text">{publishedCount}</Text>
              </View>
              <View className="flex-1 rounded-2xl bg-rx-background p-4">
                <Text className="font-jakarta text-xs uppercase text-rx-muted">Unlisted</Text>
                <Text className="mt-2 font-jakarta-bold text-2xl text-rx-text">{archivedCount}</Text>
              </View>
            </View>

            <TextInput
              value={listingSearch}
              onChangeText={setListingSearch}
              returnKeyType="search"
              placeholder="Search your listings"
              placeholderTextColor="#6B7280"
              className="mt-4 rounded-2xl bg-rx-background px-4 py-4 font-jakarta text-base leading-6 text-rx-text"
            />

            <View className="mt-3 flex-row gap-2">
              {[
                { key: "all", label: "All" },
                { key: "published", label: "Published" },
                { key: "archived", label: "Unlisted" }
              ].map((item) => (
                <ScaleButton
                  key={item.key}
                  onPress={() => setListingStatus(item.key as "all" | "published" | "archived")}
                  className={`flex-1 rounded-full px-4 py-3 ${listingStatus === item.key ? "bg-rx-text" : "bg-rx-background"}`}
                >
                  <Text className={`text-center font-jakarta-bold text-sm ${listingStatus === item.key ? "text-white" : "text-rx-text"}`}>{item.label}</Text>
                </ScaleButton>
              ))}
            </View>

            <View className="mt-4 gap-3">
              {filteredListings.map((listing) => (
                <View key={listing.listingId} className="rounded-2xl bg-rx-background p-4">
                  <View className="flex-row items-start justify-between">
                    <View className="mr-3 flex-1">
                      <Text className="font-jakarta-bold text-base text-rx-text">{listing.title}</Text>
                      <Text className="mt-1 font-jakarta text-sm text-rx-muted">{listing.location}</Text>
                      <Text className="mt-2 font-jakarta-bold text-sm text-rx-text">{formatMonthlyPrice(listing.price)}</Text>
                    </View>
                    <View className={`rounded-full px-3 py-1.5 ${listing.status === "archived" ? "bg-white" : "bg-rx-accentSoft"}`}>
                      <Text className={`font-jakarta-bold text-xs ${listing.status === "archived" ? "text-rx-text" : "text-rx-accent"}`}>
                        {listing.status === "archived" ? "Unlisted" : "Published"}
                      </Text>
                    </View>
                  </View>

                  <View className="mt-4 flex-row gap-2">
                    <ScaleButton onPress={() => router.push(`/listings/${listing.listingId}`)} className="flex-1 rounded-full bg-white py-3">
                      <Text className="text-center font-jakarta-bold text-sm text-rx-text">Open</Text>
                    </ScaleButton>
                    <ScaleButton
                      onPress={() =>
                        router.push({
                          pathname: "/profile/listings/[id]",
                          params: { id: listing.listingId }
                        } as never)
                      }
                      className="flex-1 rounded-full bg-white py-3"
                    >
                      <Text className="text-center font-jakarta-bold text-sm text-rx-text">Edit</Text>
                    </ScaleButton>
                    <ScaleButton
                      onPress={() =>
                        updateListingMutation.mutate({
                          listingId: listing.listingId,
                          title: listing.title,
                          location: listing.location,
                          price: listing.price,
                          status: listing.status === "archived" ? "published" : "archived"
                        })
                      }
                      className="flex-1 rounded-full bg-rx-text py-3"
                    >
                      <Text className="text-center font-jakarta-bold text-sm text-white">{listing.status === "archived" ? "List again" : "Unlist"}</Text>
                    </ScaleButton>
                  </View>
                </View>
              ))}
            </View>

            {!filteredListings.length ? <Text className="mt-4 font-jakarta text-sm text-rx-muted">No listings match the current filters.</Text> : null}
          </View>
        </ScrollView>
      </DismissKeyboardView>
    </SafeAreaView>
  );
}
