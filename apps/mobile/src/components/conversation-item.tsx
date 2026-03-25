import { Text, View } from "react-native";
import Swipeable from "react-native-gesture-handler/Swipeable";
import { Ionicons } from "@expo/vector-icons";
import { formatConversationTimestamp, type ConversationSummary } from "@roomxchange/shared";
import { Avatar } from "./avatar";
import { ScaleButton } from "./scale-button";

export function ConversationItem({
  conversation,
  unreadCount,
  onPress,
  onDelete,
  onLongPress,
  selected,
  selecting
}: {
  conversation: ConversationSummary;
  unreadCount: number;
  onPress: () => void;
  onDelete: () => void;
  onLongPress?: () => void;
  selected?: boolean;
  selecting?: boolean;
}) {
  return (
    <Swipeable
      enabled={!selecting}
      overshootRight={false}
      renderRightActions={() => (
        <View className="mb-3 ml-3 w-[92px] overflow-hidden rounded-2xl bg-rx-accent">
          <ScaleButton onPress={onDelete} className="flex-1 items-center justify-center">
            <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
            <Text className="mt-1 font-jakarta-bold text-xs text-white">Delete</Text>
          </ScaleButton>
        </View>
      )}
    >
      <ScaleButton onPress={onPress} onLongPress={onLongPress} className="mb-3 rounded-2xl bg-white px-4 py-3.5">
        <View className="flex-row items-center">
          {selecting ? (
            <View className={`mr-3 h-6 w-6 items-center justify-center rounded-full border ${selected ? "border-rx-accent bg-rx-accent" : "border-rx-border bg-white"}`}>
              {selected ? <Ionicons name="checkmark" size={15} color="#FFFFFF" /> : null}
            </View>
          ) : null}
          <Avatar name={conversation.participant.name} avatar={conversation.participant.avatar} size={48} />
          <View className="mx-3 flex-1 pr-2">
            <Text className="font-jakarta-bold text-base text-rx-text" numberOfLines={1}>
              {conversation.participant.name}
            </Text>
            <Text className="mt-1 font-jakarta text-sm text-rx-muted" numberOfLines={1}>
              {conversation.lastMessagePreview}
            </Text>
          </View>
          <View className="items-end">
            <Text className="font-jakarta text-xs text-rx-muted">{formatConversationTimestamp(conversation.lastMessageAt)}</Text>
            {unreadCount > 0 ? (
              <View className="mt-2 h-5 w-5 items-center justify-center rounded-full bg-rx-accent">
                <Text className="font-jakarta-bold text-[10px] text-white">{unreadCount > 9 ? "9+" : unreadCount}</Text>
              </View>
            ) : (
              <View className="mt-2 h-5 w-5" />
            )}
          </View>
        </View>
      </ScaleButton>
    </Swipeable>
  );
}
