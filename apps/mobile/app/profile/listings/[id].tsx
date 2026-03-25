import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AddListingWizard } from "../../../src/components/add-listing-wizard";
import { AuthRedirectCard } from "../../../src/components/auth-redirect-card";
import { BackIconButton } from "../../../src/components/back-icon-button";
import { ScreenHeader } from "../../../src/components/screen-header";
import { useSession } from "../../../src/session-provider";

export default function EditListingScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session, api } = useSession();

  const listingQuery = useQuery({
    queryKey: ["listing", params.id],
    queryFn: () => api.getListing(params.id),
    enabled: Boolean(session && params.id)
  });

  if (!session) {
    return (
      <SafeAreaView className="flex-1 bg-rx-background">
        <View className="flex-1 p-4">
          <AuthRedirectCard
            title="Sign in to edit your listing"
            description="Open your listing editor to update photos, details, amenities, and pricing."
            redirectTo={`/profile/listings/${params.id}`}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-rx-background">
      <ScreenHeader title="Edit listing" left={<BackIconButton fallbackPath="/profile/listings" />} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 180 }}>

        {listingQuery.data ? (
          <AddListingWizard
            mode="edit"
            listingId={listingQuery.data.listingId}
            initialValues={{
              title: listingQuery.data.title,
              propertyType: listingQuery.data.propertyType,
              listingSubtype: listingQuery.data.listingSubtype ?? undefined,
              price: listingQuery.data.price,
              location: listingQuery.data.location,
              lat: listingQuery.data.lat,
              lng: listingQuery.data.lng,
              images: listingQuery.data.images,
              previewImage: listingQuery.data.previewImage,
              vrUrl: listingQuery.data.vrUrl ?? "",
              description: listingQuery.data.description,
              amenities: listingQuery.data.amenities,
              mapboxPlaceId: listingQuery.data.mapboxPlaceId ?? "",
              status: listingQuery.data.status
            }}
            onCompleted={() => router.replace("/profile/listings")}
          />
        ) : (
          <View className="rounded-3xl bg-white p-6">
            <Text className="font-jakarta text-base text-rx-muted">
              {listingQuery.isLoading ? "Loading your listing..." : "We couldn't open this listing editor right now."}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
