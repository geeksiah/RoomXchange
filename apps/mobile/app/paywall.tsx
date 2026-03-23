import * as WebBrowser from "expo-web-browser";
import { Pressable, SafeAreaView, Text, View } from "react-native";
import { buildSubscribeUrl } from "@roomxchange/shared";
import { theme } from "../src/theme";

export default function PaywallScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background, justifyContent: "center", padding: 20 }}>
      <View style={{ backgroundColor: "rgba(255,253,250,0.96)", borderRadius: 28, padding: 24, borderWidth: 1, borderColor: theme.colors.border, gap: 16 }}>
        <Text style={{ fontSize: 30, fontWeight: "700", color: theme.colors.text }}>Owner contact is locked on mobile.</Text>
        <Text style={{ color: theme.colors.textMuted }}>
          Complete the subscription on the web, then return and the phone number will be revealed automatically.
        </Text>
        <Pressable style={{ backgroundColor: theme.colors.accent, borderRadius: 999, paddingVertical: 16, alignItems: "center" }} onPress={() => void WebBrowser.openBrowserAsync(buildSubscribeUrl())}>
          <Text style={{ color: "white", fontWeight: "700" }}>Continue on Web</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
