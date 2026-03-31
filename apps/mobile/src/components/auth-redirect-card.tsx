import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ScaleButton } from "./scale-button";

export function AuthRedirectCard({
  title,
  description,
  redirectTo
}: {
  title: string;
  description: string;
  redirectTo: string;
}) {
  const router = useRouter();

  return (
    <View className="rounded-3xl bg-white p-5">
      <Text className="font-jakarta-bold text-2xl text-rx-text">{title}</Text>
      <Text className="mt-2 font-jakarta text-sm leading-6 text-rx-muted">{description}</Text>
      <ScaleButton onPress={() => router.replace({ pathname: "/auth/login", params: { redirect: redirectTo } } as never)} className="mt-5 rounded-full bg-rx-accent py-4">
        <Text className="text-center font-jakarta-bold text-base text-white">Continue to login</Text>
      </ScaleButton>
    </View>
  );
}
