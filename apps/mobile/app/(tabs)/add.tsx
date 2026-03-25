import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AddListingWizard } from "../../src/components/add-listing-wizard";
import { AuthRedirectCard } from "../../src/components/auth-redirect-card";
import { useSession } from "../../src/session-provider";

export default function AddScreen() {
  const { session } = useSession();

  return (
    <SafeAreaView className="flex-1 bg-rx-background">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 176 }}>
        <View className="mb-5">
          <Text className="font-jakarta-bold text-3xl text-rx-text">Add listing</Text>
          <Text className="mt-2 font-jakarta text-sm leading-6 text-rx-muted">
            Publish a real marketplace listing with images, location, pricing, and amenities.
          </Text>
        </View>
        {session ? (
          <AddListingWizard />
        ) : (
          <AuthRedirectCard
            title="Sign in before publishing"
            description="Create a verified account to upload photos, set your location, and publish a listing."
            redirectTo="/add"
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
