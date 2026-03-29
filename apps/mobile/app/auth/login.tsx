import { useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthPanel } from "../../src/components/auth-panel";
import { DismissKeyboardView } from "../../src/components/dismiss-keyboard-view";
import { ScaleButton } from "../../src/components/scale-button";
import { useSession } from "../../src/session-provider";

export default function LoginScreen() {
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
          <View className="mt-14">
            <Text className="font-jakarta-bold text-4xl text-rx-text">Login</Text>
            <Text className="mt-3 max-w-[300px] font-jakarta text-sm leading-6 text-rx-muted">
              Sign in with your email or phone number and password.
            </Text>
          </View>

          <View className="mt-8">
            <AuthPanel />
          </View>

          <View className="mt-6 flex-row items-center justify-center">
            <Text className="font-jakarta text-sm text-rx-muted">New here?</Text>
            <ScaleButton onPress={() => router.push("/auth/signup")} className="ml-2 rounded-full px-1 py-1">
              <Text className="font-jakarta-bold text-sm text-rx-accent">Create account</Text>
            </ScaleButton>
          </View>

          <View className="mt-3 flex-row items-center justify-center">
            <Text className="font-jakarta text-sm text-rx-muted">Forgot your password?</Text>
            <ScaleButton onPress={() => router.push("/auth/forgot-password" as any)} className="ml-2 rounded-full px-1 py-1">
              <Text className="font-jakarta-bold text-sm text-rx-accent">Reset it</Text>
            </ScaleButton>
          </View>
        </View>
      </DismissKeyboardView>
    </SafeAreaView>
  );
}
