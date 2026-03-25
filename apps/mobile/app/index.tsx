import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { getOnboardingComplete } from "../src/onboarding";
import { useSession } from "../src/session-provider";

export default function AppEntryScreen() {
  const { session, hydrated } = useSession();
  const [onboardingComplete, setOnboardingCompleteState] = useState<boolean | null>(null);

  useEffect(() => {
    getOnboardingComplete().then(setOnboardingCompleteState);
  }, []);

  if (!hydrated || onboardingComplete === null) {
    return (
      <View className="flex-1 items-center justify-center bg-rx-background">
        <ActivityIndicator color="#FF385C" />
      </View>
    );
  }

  if (session) {
    return <Redirect href="/(tabs)" />;
  }

  if (!onboardingComplete) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/auth/login" />;
}
