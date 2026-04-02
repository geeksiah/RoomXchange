import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { getOnboardingComplete } from "../src/onboarding";
import { SessionLoadingCard } from "../src/components/session-loading-card";
import { useSession } from "../src/session-provider";

export default function AppEntryScreen() {
  const { session, hydrated } = useSession();
  const [onboardingComplete, setOnboardingCompleteState] = useState<boolean | null>(null);

  useEffect(() => {
    getOnboardingComplete().then(setOnboardingCompleteState);
  }, []);

  if (!hydrated || onboardingComplete === null) {
    return (
      <View className="flex-1 justify-center bg-rx-background px-6">
        <SessionLoadingCard title="Getting RoomXchange ready" description="We are restoring your account and app preferences." />
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
