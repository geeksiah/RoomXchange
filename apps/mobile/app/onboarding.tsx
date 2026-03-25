import { useRef, useState } from "react";
import { useRouter } from "expo-router";
import { Animated, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { setOnboardingComplete } from "../src/onboarding";
import { ScaleButton } from "../src/components/scale-button";

const slides = [
  {
    image: require("../src/assets/image22.png"),
    titleBefore: "People Sharing ",
    titleAccent: "Real",
    titleAfter: " Rooms",
    description: "Browse verified rooms and apartments with a clean mobile experience built for real housing decisions."
  },
  {
    image: require("../src/assets/image2.png"),
    titleBefore: "Find Rooms, ",
    titleAccent: "No",
    titleAfter: " Hassle",
    description: "Compare listings quickly, open details fast, and move straight from discovery to contacting the owner."
  }
] as const;

export default function OnboardingScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const listRef = useRef<Animated.FlatList<(typeof slides)[number]>>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [index, setIndex] = useState(0);

  const continueToLogin = async () => {
    await setOnboardingComplete(true);
    router.replace("/auth/login");
  };

  const goNext = () => {
    if (index >= slides.length - 1) {
      void continueToLogin();
      return;
    }

    listRef.current?.scrollToIndex({ index: index + 1, animated: true });
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 pb-10 pt-2">
        <View className="px-6">
          <View className="flex-row items-center justify-end">
            <ScaleButton onPress={() => void continueToLogin()} className="rounded-full bg-rx-background px-4 py-2.5">
              <Text className="font-jakarta text-sm text-rx-muted">Skip</Text>
            </ScaleButton>
          </View>
        </View>

        <Animated.FlatList
          ref={listRef}
          data={slides}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, slideIndex) => String(slideIndex)}
          onMomentumScrollEnd={(event) => {
            const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
            setIndex(nextIndex);
          }}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
            useNativeDriver: false
          })}
          scrollEventThrottle={16}
          renderItem={({ item, index: slideIndex }) => {
            const inputRange = [(slideIndex - 1) * width, slideIndex * width, (slideIndex + 1) * width];
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.35, 1, 0.35],
              extrapolate: "clamp"
            });
            const translateY = scrollX.interpolate({
              inputRange,
              outputRange: [26, 0, 26],
              extrapolate: "clamp"
            });
            const imageScale = scrollX.interpolate({
              inputRange,
              outputRange: [0.92, 1, 0.92],
              extrapolate: "clamp"
            });

            return (
              <View style={{ width }} className="flex-1 px-6">
                <Animated.View style={{ flex: 1, opacity, transform: [{ translateY }] }} className="items-center justify-center">
                  <Animated.View style={{ transform: [{ scale: imageScale }] }} className="items-center">
                    <Image source={item.image} style={{ width: Math.min(width - 56, 340), height: Math.min(width * 1.1, 360) }} contentFit="contain" />
                  </Animated.View>

                  <View className="mt-10 max-w-[340px] items-center">
                    <Text className="text-center font-jakarta-bold text-[34px] leading-[42px] text-rx-text">
                      {item.titleBefore}
                      <Text className="text-rx-accent">{item.titleAccent}</Text>
                      {item.titleAfter}
                    </Text>
                    <Text className="mt-4 text-center font-jakarta text-sm leading-6 text-rx-muted">{item.description}</Text>
                    <Text className="mt-4 font-jakarta text-xs uppercase tracking-[1.4px] text-rx-muted">
                      {slideIndex === 0 ? "Swipe to continue" : "Click below to explore"}
                    </Text>
                  </View>
                </Animated.View>
              </View>
            );
          }}
        />

        <View className="px-6">
          <View className="mb-6 flex-row items-center justify-center gap-2">
            {slides.map((_, slideIndex) => {
              const inputRange = [(slideIndex - 1) * width, slideIndex * width, (slideIndex + 1) * width];
              const dotWidth = scrollX.interpolate({
                inputRange,
                outputRange: [10, 28, 10],
                extrapolate: "clamp"
              });
              const opacity = scrollX.interpolate({
                inputRange,
                outputRange: [0.35, 1, 0.35],
                extrapolate: "clamp"
              });

              return (
                <Animated.View
                  key={slideIndex}
                  style={{ width: dotWidth, opacity }}
                  className="h-2.5 rounded-full bg-rx-accent"
                />
              );
            })}
          </View>

          <ScaleButton onPress={goNext} className="rounded-full bg-rx-accent py-4">
            <Text className="text-center font-jakarta-bold text-base text-white">{index < slides.length - 1 ? "Next" : "Explore"}</Text>
          </ScaleButton>
        </View>
      </View>
    </SafeAreaView>
  );
}
