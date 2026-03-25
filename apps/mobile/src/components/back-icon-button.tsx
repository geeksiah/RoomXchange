import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ScaleButton } from "./scale-button";

export function BackIconButton({ fallbackPath = "/" }: { fallbackPath?: string }) {
  const router = useRouter();

  return (
    <ScaleButton
      onPress={() => {
        if (router.canGoBack()) {
          router.back();
          return;
        }

        router.replace(fallbackPath as never);
      }}
      className="h-11 w-11 items-center justify-center rounded-full bg-white/95"
    >
      <Ionicons name="chevron-back" size={22} color="#111111" />
    </ScaleButton>
  );
}
