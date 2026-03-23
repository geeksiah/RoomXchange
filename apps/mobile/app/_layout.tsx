import { PlusJakartaSans_500Medium, PlusJakartaSans_700Bold, useFonts } from "@expo-google-fonts/plus-jakarta-sans";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
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
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="listings/[id]" />
          <Stack.Screen name="paywall" presentation="modal" />
        </Stack>
      </SessionProvider>
    </QueryClientProvider>
  );
}
