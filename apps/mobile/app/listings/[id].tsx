import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import { Linking, Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import { WebView } from "react-native-webview";
import { buildSubscribeUrl, formatCurrency } from "@roomxchange/shared";
import { useSession } from "../../src/session-provider";
import { theme } from "../../src/theme";

export default function ListingDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { api } = useSession();
  const [showVr, setShowVr] = useState(false);

  const listingQuery = useQuery({
    queryKey: ["mobile-listing", params.id],
    queryFn: () => api.getListing(params.id)
  });

  const listing = listingQuery.data;
  if (!listing) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: theme.colors.textMuted }}>{listingQuery.isLoading ? "Loading listing..." : "Listing not found."}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={{ position: "relative" }}>
          <Image source={listing.images[0]} style={{ width: "100%", height: 360 }} contentFit="cover" />
          <Pressable onPress={() => router.back()} style={{ position: "absolute", top: 18, left: 18, backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 }}>
            <Text>Back</Text>
          </Pressable>
        </View>

        <View style={{ padding: 20, gap: 18 }}>
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 34, fontWeight: "700", color: theme.colors.text }}>{listing.title}</Text>
            <Text style={{ color: theme.colors.textMuted }}>{listing.location}</Text>
            <Text style={{ fontSize: 28, fontWeight: "700", color: theme.colors.text }}>{formatCurrency(listing.price)} / night</Text>
          </View>

          <View style={panelStyle}>
            <Text style={panelTitleStyle}>About the property</Text>
            <Text style={{ color: theme.colors.textMuted }}>{listing.description}</Text>
          </View>

          {listing.vrUrl ? (
            <View style={panelStyle}>
              <Text style={panelTitleStyle}>VR tour</Text>
              <Pressable style={buttonStyle} onPress={() => setShowVr((value) => !value)}>
                <Text style={buttonTextStyle}>{showVr ? "Hide VR tour" : "Open VR tour"}</Text>
              </Pressable>
              {showVr ? <WebView source={{ uri: listing.vrUrl }} style={{ height: 320, borderRadius: 20, overflow: "hidden" }} /> : null}
            </View>
          ) : null}

          <View style={panelStyle}>
            <Text style={panelTitleStyle}>Contact owner</Text>
            {listing.ownerContact.canContact && listing.ownerContact.phone ? (
              <View style={{ gap: 10 }}>
                <Text style={{ color: theme.colors.textMuted }}>Call or text {listing.ownerContact.name} directly.</Text>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <Pressable style={[buttonStyle, { flex: 1 }]} onPress={() => void Linking.openURL(`tel:${listing.ownerContact.phone}`)}>
                    <Text style={buttonTextStyle}>Call owner</Text>
                  </Pressable>
                  <Pressable style={[buttonStyle, secondaryButtonStyle, { flex: 1 }]} onPress={() => void Linking.openURL(`sms:${listing.ownerContact.phone}`)}>
                    <Text style={{ color: theme.colors.text }}>Send SMS</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                <Text style={{ color: theme.colors.textMuted }}>{listing.ownerContact.phoneMasked} stays blurred until web checkout activates access.</Text>
                <View style={{ backgroundColor: "rgba(255,255,255,0.74)", borderRadius: 22, padding: 18, borderWidth: 1, borderColor: theme.colors.border, gap: 10 }}>
                  <Text style={{ fontSize: 18, fontWeight: "700", color: theme.colors.text }}>Continue on Web</Text>
                  <Text style={{ color: theme.colors.textMuted }}>This is the single external payment handoff required for Apple compliance.</Text>
                  <Pressable style={buttonStyle} onPress={() => void WebBrowser.openBrowserAsync(buildSubscribeUrl())}>
                    <Text style={buttonTextStyle}>Continue on Web</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const panelStyle = {
  backgroundColor: "rgba(255,253,250,0.96)",
  borderWidth: 1,
  borderColor: theme.colors.border,
  borderRadius: 24,
  padding: 20,
  gap: 12
} as const;

const panelTitleStyle = {
  fontSize: 22,
  fontWeight: "700",
  color: theme.colors.text
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
