import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { Image } from "expo-image";
import { getInitials } from "@roomxchange/shared/src/mobile";
import { resolveRuntimeMediaUrl } from "../lib/runtime-config";

type AvatarProps = {
  name: string;
  avatar?: string | null;
  size?: number;
};

export function Avatar({ name, avatar, size = 40 }: AvatarProps) {
  const resolvedAvatar = useMemo(() => resolveRuntimeMediaUrl(avatar), [avatar]);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [resolvedAvatar]);

  if (resolvedAvatar && !imageFailed) {
    return (
      <Image
        source={{ uri: resolvedAvatar }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
        transition={120}
        onError={() => {
          console.warn("[avatar] Failed to load profile photo.", resolvedAvatar);
          setImageFailed(true);
        }}
      />
    );
  }

  return (
    <View
      className="items-center justify-center rounded-full bg-rx-accentSoft"
      style={{ width: size, height: size }}
    >
      <Text className="font-jakarta-bold text-sm text-rx-accent">{getInitials(name)}</Text>
    </View>
  );
}
