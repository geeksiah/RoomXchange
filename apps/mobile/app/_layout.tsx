import "../global.css";
import { PlusJakartaSans_500Medium, PlusJakartaSans_700Bold, useFonts } from "@expo-google-fonts/plus-jakarta-sans";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NotificationsProvider } from "../src/providers/notifications-provider";
import { RealtimeProvider } from "../src/providers/realtime-provider";
import { SessionProvider } from "../src/session-provider";

SplashScreen.preventAutoHideAsync().catch(() => null);

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());
  const [loaded] = useFonts({
    PlusJakartaSans_500Medium,
    PlusJakartaSans_700Bold
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync().catch(() => null);
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <SessionProvider>
            <NotificationsProvider>
              <RealtimeProvider>
                <StatusBar style="dark" />
                <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#F7F7F7" } }}>
                  <Stack.Screen name="index" />
                  <Stack.Screen name="onboarding" />
                  <Stack.Screen name="auth/login" />
                  <Stack.Screen name="auth/signup" />
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="notifications" />
                  <Stack.Screen name="profile/alerts" />
                  <Stack.Screen name="profile/listings" />
                  <Stack.Screen name="profile/listings/[id]" />
                  <Stack.Screen name="publishers/[userId]" />
                  <Stack.Screen name="explore/location/[location]" />
                  <Stack.Screen name="listings/[id]" />
                  <Stack.Screen name="messages/[conversationId]" />
                </Stack>
              </RealtimeProvider>
            </NotificationsProvider>
          </SessionProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
