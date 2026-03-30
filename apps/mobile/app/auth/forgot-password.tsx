import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthPanel } from "../../src/components/auth-panel";
import { BackIconButton } from "../../src/components/back-icon-button";
import { DismissKeyboardView } from "../../src/components/dismiss-keyboard-view";

export default function ForgotPasswordScreen() {
  return (
    <SafeAreaView className="flex-1 bg-rx-background">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "android" ? 28 : 16}>
        <DismissKeyboardView className="flex-1">
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 120 }}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View className="flex-1 px-4 pb-8 pt-4">
              <View className="flex-row items-center justify-start">
                <BackIconButton fallbackPath="/auth/login" />
              </View>

              <View className="mt-10">
                <Text className="font-jakarta-bold text-4xl text-rx-text">Reset password</Text>
                <Text className="mt-3 max-w-[320px] font-jakarta text-sm leading-6 text-rx-muted">
                  Verify your phone number once, then choose a new password.
                </Text>
              </View>

              <View className="mt-8">
                <AuthPanel mode="forgot-password" />
              </View>
            </View>
          </ScrollView>
        </DismissKeyboardView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
