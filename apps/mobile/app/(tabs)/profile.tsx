import { useQuery } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import { Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";
import { buildSubscribeUrl } from "@roomxchange/shared";
import { AuthPanel } from "../../src/components/auth-panel";
import { useSession } from "../../src/session-provider";
import { theme } from "../../src/theme";

export default function ProfileScreen() {
  const { session, logout, api } = useSession();
  const statusQuery = useQuery({
    queryKey: ["mobile-subscription-status", session?.user.userId],
    queryFn: () => api.getSubscriptionStatus(),
    enabled: Boolean(session)
  });

  if (!session) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
          <AuthPanel title="Sign in to manage your profile" />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120, gap: 18 }}>
        <View style={{ gap: 18 }}>
          <View style={panelStyle}>
            <Text style={{ fontSize: 28, fontWeight: "700", color: theme.colors.text }}>{session.user.name}</Text>
            <Text style={{ color: theme.colors.textMuted }}>{session.user.phone}</Text>
            <Text style={{ color: theme.colors.textMuted }}>{session.user.email ?? "Add an email on web for receipts."}</Text>
          </View>
          <View style={panelStyle}>
            <Text style={{ fontSize: 22, fontWeight: "700", color: theme.colors.text }}>Subscription</Text>
            <Text style={{ color: theme.colors.textMuted }}>
              {statusQuery.data?.isSubscribed
                ? `Active until ${statusQuery.data.subscriptionExpiresAt ?? "the current billing end"}.`
                : "Inactive. Mobile still routes contact requests to the web paywall."}
            </Text>
            <Pressable style={buttonStyle} onPress={() => void WebBrowser.openBrowserAsync(buildSubscribeUrl())}>
              <Text style={buttonTextStyle}>Continue on Web</Text>
            </Pressable>
          </View>
          <Pressable style={[buttonStyle, secondaryButtonStyle]} onPress={() => void logout()}>
            <Text style={{ color: theme.colors.text }}>Log out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const panelStyle = {
  backgroundColor: "rgba(255,253,250,0.96)",
  borderWidth: 1,
  borderColor: theme.colors.border,
  borderRadius: 28,
  padding: 22,
  gap: 8
} as const;

const buttonStyle = {
  backgroundColor: theme.colors.accent,
  borderRadius: 999,
  paddingVertical: 15,
  alignItems: "center"
} as const;

const secondaryButtonStyle = {
  backgroundColor: "white",
  borderWidth: 1,
  borderColor: theme.colors.border
} as const;

const buttonTextStyle = {
  color: "white",
  fontWeight: "700"
} as const;
