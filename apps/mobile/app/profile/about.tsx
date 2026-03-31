import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import { Platform, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackIconButton } from "../../src/components/back-icon-button";
import { ScreenHeader } from "../../src/components/screen-header";
import { ScaleButton } from "../../src/components/scale-button";

export default function AboutAppScreen() {
  const version = Constants.expoConfig?.version ?? "1.0.0";
  const supportUrl = ((Constants.expoConfig?.extra?.supportUrl as string | undefined) ?? "").trim();
  const privacyPolicyUrl = ((Constants.expoConfig?.extra?.privacyPolicyUrl as string | undefined) ?? "").trim();
  const accountDeletionUrl = ((Constants.expoConfig?.extra?.accountDeletionUrl as string | undefined) ?? "").trim();

  const openExternalUrl = (value: string) => {
    if (!value) {
      return;
    }
    void WebBrowser.openBrowserAsync(value);
  };

  return (
    <SafeAreaView className="flex-1 bg-rx-background">
      <ScreenHeader title="About app" left={<BackIconButton fallbackPath="/profile" />} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 160 }}>
        <View className="rounded-3xl bg-white p-5">
          <Text className="font-jakarta-bold text-xl text-rx-text">RoomXchange</Text>
          <Text className="mt-2 font-jakarta text-sm leading-6 text-rx-muted">
            A simple room and apartment marketplace built for trusted local discovery.
          </Text>
        </View>

        <View className="mt-5 rounded-3xl bg-white p-5">
          <Text className="font-jakarta-bold text-xl text-rx-text">App info</Text>
          <InfoRow label="Version" value={version} />
          <InfoRow label="System" value={Platform.OS === "ios" ? "iOS" : "Android"} />
          <InfoRow label="OS version" value={String(Platform.Version)} />
          <InfoRow label="Runtime" value={Constants.executionEnvironment ?? "unknown"} />
        </View>

        <View className="mt-5 rounded-3xl bg-white p-5">
          <Text className="font-jakarta-bold text-xl text-rx-text">Support RoomXchange</Text>
          <Text className="mt-2 font-jakarta text-sm leading-6 text-rx-muted">
            Support lives on our website. Tap below to open the RoomXchange support page and make a donation there.
          </Text>
          <ScaleButton
            disabled={!supportUrl}
            onPress={() => openExternalUrl(supportUrl)}
            className={`mt-4 rounded-full py-4 ${supportUrl ? "bg-rx-accent" : "bg-rx-border"}`}
          >
            <Text className="text-center font-jakarta-bold text-base text-white">
              {supportUrl ? "Open support page" : "Support link unavailable"}
            </Text>
          </ScaleButton>
        </View>

        <View className="mt-5 rounded-3xl bg-white p-5">
          <Text className="font-jakarta-bold text-xl text-rx-text">Privacy and data</Text>
          <Text className="mt-2 font-jakarta text-sm leading-6 text-rx-muted">
            Review the privacy policy or open the account deletion page to manage privacy-related requests.
          </Text>
          <ScaleButton
            disabled={!privacyPolicyUrl}
            onPress={() => openExternalUrl(privacyPolicyUrl)}
            className={`mt-4 rounded-full py-4 ${privacyPolicyUrl ? "bg-rx-accent" : "bg-rx-border"}`}
          >
            <Text className="text-center font-jakarta-bold text-base text-white">
              {privacyPolicyUrl ? "Open privacy policy" : "Privacy policy unavailable"}
            </Text>
          </ScaleButton>
          <ScaleButton
            disabled={!accountDeletionUrl}
            onPress={() => openExternalUrl(accountDeletionUrl)}
            className={`mt-3 rounded-full py-4 ${accountDeletionUrl ? "border border-rx-border bg-white" : "bg-rx-border"}`}
          >
            <Text className={`text-center font-jakarta-bold text-base ${accountDeletionUrl ? "text-rx-text" : "text-white"}`}>
              {accountDeletionUrl ? "Open account deletion page" : "Deletion link unavailable"}
            </Text>
          </ScaleButton>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="mt-4 flex-row items-center justify-between rounded-2xl bg-rx-background px-4 py-4">
      <Text className="font-jakarta text-sm text-rx-muted">{label}</Text>
      <Text className="ml-4 flex-1 text-right font-jakarta-bold text-sm text-rx-text">{value}</Text>
    </View>
  );
}
