import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Pressable, View } from "react-native";
import { useChatStore } from "../../src/stores/chat-store";

export default function TabsLayout() {
  const totalUnreadCount = useChatStore((state) => state.totalUnreadCount);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#111111",
        tabBarInactiveTintColor: "#6B7280",
        tabBarLabelStyle: {
          fontFamily: "PlusJakartaSans_500Medium",
          fontSize: 11
        },
        tabBarStyle: {
          height: 96,
          paddingTop: 10,
          paddingBottom: 22,
          backgroundColor: "#FFFFFF",
          borderTopColor: "#EAEAEA",
          shadowColor: "#111111",
          shadowOpacity: 0.12,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: -8 },
          elevation: 18
        }
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="explore" options={{ title: "Explore", tabBarIcon: ({ color, size }) => <Ionicons name="search-outline" color={color} size={size} /> }} />
      <Tabs.Screen
        name="add"
        options={{
          title: "Add",
          tabBarLabel: () => null,
          tabBarIcon: () => null,
          tabBarButton: (props) => <AddTabButton {...props} />
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubble-ellipses-outline" color={color} size={size} />,
          tabBarBadge: totalUnreadCount > 0 ? (totalUnreadCount > 9 ? "9+" : String(totalUnreadCount)) : undefined,
          tabBarBadgeStyle: { backgroundColor: "#FF385C", color: "#FFFFFF" }
        }}
      />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} /> }} />
    </Tabs>
  );
}

function AddTabButton({ accessibilityState, onPress, onLongPress }: any) {
  const focused = Boolean(accessibilityState?.selected);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={accessibilityState}
      onPress={() => onPress?.()}
      onLongPress={() => onLongPress?.()}
      className="items-center justify-end"
      style={{ width: 88, marginTop: -26 }}
    >
      <View
        className="h-[68px] w-[68px] items-center justify-center rounded-full bg-rx-accent"
        style={{
          shadowColor: "#111111",
          shadowOpacity: focused ? 0.28 : 0.22,
          shadowRadius: focused ? 24 : 18,
          shadowOffset: { width: 0, height: 12 },
          elevation: focused ? 12 : 10
        }}
      >
        <Ionicons name="add" color="#FFFFFF" size={34} />
      </View>
    </Pressable>
  );
}
