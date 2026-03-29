import { useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthPanel } from "../../src/components/auth-panel";
import { BackIconButton } from "../../src/components/back-icon-button";
import { DismissKeyboardView } from "../../src/components/dismiss-keyboard-view";
import { ScaleButton } from "../../src/components/scale-button";
import { useSession } from "../../src/session-provider";

export default function SignupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ redirect?: string }>();
  const { session, hydrated } = useSession();

  useEffect(() => {
    if (!hydrated || !session) {
      return;
    }

    router.replace((params.redirect as any) ?? "/");
  }, [hydrated, params.redirect, router, session]);

  return (
    <SafeAreaView className="flex-1 bg-rx-background">
      <DismissKeyboardView className="flex-1">
        <View className="flex-1 px-4 pb-8 pt-4">
          <View className="flex-row items-center justify-start">
            <BackIconButton fallbackPath="/auth/login" />
          </View>

          <View className="mt-10">
            <Text className="font-jakarta-bold text-4xl text-rx-text">Create account</Text>
            <Text className="mt-3 max-w-[320px] font-jakarta text-sm leading-6 text-rx-muted">
              Create your account with phone number and password. Email is optional. We will verify your phone number once.
            </Text>
          </View>

          <View className="mt-8">
            <AuthPanel mode="signup" />
          </View>

          <View className="mt-6 flex-row items-center justify-center">
            <Text className="font-jakarta text-sm text-rx-muted">Already have an account?</Text>
            <ScaleButton onPress={() => router.replace("/auth/login")} className="ml-2 rounded-full px-1 py-1">
              <Text className="font-jakarta-bold text-sm text-rx-accent">Sign in</Text>
            </ScaleButton>
          </View>
        </View>
      </DismissKeyboardView>
    </SafeAreaView>
  );
}
