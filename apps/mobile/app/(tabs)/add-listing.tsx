import { SafeAreaView, ScrollView, Text, View } from "react-native";
import { AddListingWizard } from "../../src/components/add-listing-wizard";
import { AuthPanel } from "../../src/components/auth-panel";
import { theme } from "../../src/theme";
import { useSession } from "../../src/session-provider";

export default function AddListingScreen() {
  const { session } = useSession();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120, gap: 18 }}>
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 32, fontWeight: "700", color: theme.colors.text }}>Add listing</Text>
          <Text style={{ color: theme.colors.textMuted }}>Upload media to S3, attach a Mapbox location, and publish without placeholders.</Text>
        </View>
        {session ? <AddListingWizard /> : <AuthPanel title="Sign in before publishing" />}
      </ScrollView>
    </SafeAreaView>
  );
}
