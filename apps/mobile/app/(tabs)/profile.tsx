import { useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { ScrollView, Switch, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthRedirectCard } from "../../src/components/auth-redirect-card";
import { Avatar } from "../../src/components/avatar";
import { ScaleButton } from "../../src/components/scale-button";
import { useSession } from "../../src/session-provider";
import { useNotificationStore } from "../../src/stores/notification-store";

export default function ProfileScreen() {
  const router = useRouter();
  const { session, api, refreshProfile, logout } = useSession();
  const queryClient = useQueryClient();
  const reminders = useNotificationStore((state) => state.reminders);
  const [name, setName] = useState(session?.user.name ?? "");
  const [email, setEmail] = useState(session?.user.email ?? "");
  const [avatar, setAvatar] = useState(session?.user.avatar ?? "");
  const [phonePublic, setPhonePublic] = useState(session?.user.phonePublic ?? false);

  useEffect(() => {
    setName(session?.user.name ?? "");
    setEmail(session?.user.email ?? "");
    setAvatar(session?.user.avatar ?? "");
    setPhonePublic(session?.user.phonePublic ?? false);
  }, [session, session?.user.avatar, session?.user.email, session?.user.name, session?.user.phonePublic]);

  const reportsQuery = useQuery({
    queryKey: ["my-reports"],
    queryFn: () => api.getMyReports(),
    enabled: Boolean(session)
  });

  const listingsQuery = useQuery({
    queryKey: ["my-listings", session?.user.userId],
    queryFn: () => api.getUserListings(session!.user.userId),
    enabled: Boolean(session?.user.userId)
  });

  const profileListings = useMemo(() => {
    if (!session) {
      return [];
    }
    return listingsQuery.data ?? [];
  }, [listingsQuery.data, session]);

  const updateProfileMutation = useMutation({
    mutationFn: () => api.updateProfile({ name, email, avatar, phonePublic }),
    onSuccess: async () => {
      await refreshProfile();
      await queryClient.invalidateQueries({ queryKey: ["my-listings"] });
    }
  });

  const pickProfilePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted || !session) {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];
    const compressed = await manipulateAsync(asset.uri, [{ resize: { width: 900 } }], {
      compress: 0.82,
      format: SaveFormat.JPEG
    });

    const upload = await api.createUpload({
      fileName: asset.fileName ?? `roomxchange-profile-${Date.now()}.jpg`,
      contentType: "image/jpeg"
    });
    const blob = await fetch(compressed.uri).then((response) => response.blob());
    await fetch(upload.uploadUrl, {
      method: "PUT",
      headers: upload.headers,
      body: blob
    });
    setAvatar(upload.fileUrl);
  };

  if (!session) {
    return (
      <SafeAreaView className="flex-1 bg-rx-background">
        <View className="flex-1 p-4">
          <AuthRedirectCard
            title="Sign in to manage your profile"
            description="Update your account, manage listings, saved alerts, and marketplace activity from one place."
            redirectTo="/profile"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-rx-background">
      <View className="flex-1">
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 176 }}>
          <View className="rounded-3xl bg-white p-5">
            <View className="flex-row items-center">
              <ScaleButton onPress={() => void pickProfilePhoto()} className="rounded-full">
                <Avatar name={session.user.name} avatar={avatar} size={72} />
              </ScaleButton>
              <View className="ml-4 flex-1">
                <Text className="font-jakarta-bold text-2xl text-rx-text">{session.user.name}</Text>
                <Text className="mt-1 font-jakarta text-sm text-rx-muted">{session.user.phone}</Text>
                <ScaleButton onPress={() => void pickProfilePhoto()} className="mt-3 self-start rounded-full bg-rx-background px-4 py-2">
                  <Text className="font-jakarta text-xs text-rx-text">Upload profile photo</Text>
                </ScaleButton>
              </View>
            </View>

            <TextInput
              value={name}
              onChangeText={setName}
              returnKeyType="next"
              placeholder="Full name"
              placeholderTextColor="#6B7280"
              className="mt-5 rounded-2xl bg-rx-background px-4 py-4 font-jakarta text-base leading-6 text-rx-text"
            />
            <TextInput
              value={email}
              onChangeText={setEmail}
              returnKeyType="done"
              placeholder="Email"
              placeholderTextColor="#6B7280"
              className="mt-3 rounded-2xl bg-rx-background px-4 py-4 font-jakarta text-base leading-6 text-rx-text"
            />

            <View className="mt-4 flex-row items-center justify-between rounded-2xl bg-rx-background px-4 py-4">
              <View className="mr-4 flex-1">
                <Text className="font-jakarta-bold text-sm text-rx-text">Show phone number publicly</Text>
                <Text className="mt-1 font-jakarta text-xs leading-5 text-rx-muted">People can only see your number on your publisher profile when this is turned on.</Text>
              </View>
              <Switch value={phonePublic} onValueChange={setPhonePublic} trackColor={{ false: "#EAEAEA", true: "#FFB6C4" }} thumbColor={phonePublic ? "#FF385C" : "#FFFFFF"} />
            </View>

            <ScaleButton onPress={() => updateProfileMutation.mutate()} className="mt-4 rounded-full bg-rx-accent py-4">
              <Text className="text-center font-jakarta-bold text-base text-white">{updateProfileMutation.isPending ? "Saving..." : "Save profile"}</Text>
            </ScaleButton>
          </View>

          <View className="mt-5 rounded-3xl bg-white p-5">
            <Text className="font-jakarta-bold text-xl text-rx-text">Manage your marketplace</Text>
            <View className="mt-4 gap-3">
              <ProfileMenuRow
                icon="notifications-outline"
                title="Saved alerts"
                description={`${reminders.length} alert${reminders.length === 1 ? "" : "s"} configured`}
                onPress={() => router.push("/profile/alerts")}
              />
              <ProfileMenuRow
                icon="home-outline"
                title="My listings"
                description={`${profileListings.length} listing${profileListings.length === 1 ? "" : "s"} in your portfolio`}
                onPress={() => router.push("/profile/listings")}
              />
            </View>
          </View>

          <View className="mt-5 rounded-3xl bg-white p-5">
            <Text className="font-jakarta-bold text-xl text-rx-text">Reports</Text>
            {(reportsQuery.data ?? []).slice(0, 3).map((report) => (
              <View key={report.reportId} className="mt-4 rounded-2xl bg-rx-background p-4">
                <Text className="font-jakarta-bold text-sm text-rx-text">{report.reason}</Text>
                <Text className="mt-1 font-jakarta text-xs uppercase text-rx-muted">{report.status}</Text>
              </View>
            ))}
            {!reportsQuery.isLoading && !(reportsQuery.data ?? []).length ? (
              <Text className="mt-4 font-jakarta text-sm text-rx-muted">You have not sent any reports yet.</Text>
            ) : null}
          </View>

          <ScaleButton
            onPress={() => {
              void logout().then(() => router.replace("/onboarding"));
            }}
            className="mt-5 rounded-full border border-rx-border bg-white py-4"
          >
            <Text className="text-center font-jakarta text-base text-rx-text">Log out</Text>
          </ScaleButton>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function ProfileMenuRow({
  icon,
  title,
  description,
  onPress
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <ScaleButton onPress={onPress} className="rounded-2xl bg-rx-background px-4 py-4">
      <View className="flex-row items-center">
        <View className="h-11 w-11 items-center justify-center rounded-full bg-white">
          <Ionicons name={icon} size={20} color="#111111" />
        </View>
        <View className="ml-3 flex-1">
          <Text className="font-jakarta-bold text-base text-rx-text">{title}</Text>
          <Text className="mt-1 font-jakarta text-sm text-rx-muted">{description}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#6B7280" />
      </View>
    </ScaleButton>
  );
}
