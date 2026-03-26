import { Text, View } from "react-native";
import { Image } from "expo-image";
import { getInitials } from "@roomxchange/shared/src/mobile";

type AvatarProps = {
  name: string;
  avatar?: string | null;
  size?: number;
};

export function Avatar({ name, avatar, size = 40 }: AvatarProps) {
  if (avatar) {
    return <Image source={avatar} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" />;
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
