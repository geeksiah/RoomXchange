import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { Animated, PanResponder, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { setOnboardingComplete } from "../src/onboarding";
import { ScaleButton } from "../src/components/scale-button";
import { motionDuration, motionEasing } from "../src/lib/motion";

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
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const transition = useRef(new Animated.Value(1)).current;
  const hasMounted = useRef(false);
  const indexRef = useRef(index);
  const currentSlide = slides[index];

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      transition.setValue(1);
      return;
    }

    transition.setValue(0);
    Animated.timing(transition, {
      toValue: 1,
      duration: motionDuration.slow,
      easing: motionEasing.standard,
      useNativeDriver: true
    }).start();
  }, [index, transition]);

  const jumpToIndex = (nextIndex: number) => {
    const clampedIndex = Math.max(0, Math.min(nextIndex, slides.length - 1));
    if (clampedIndex === indexRef.current) {
      return;
    }

    setDirection(clampedIndex > indexRef.current ? 1 : -1);
    setIndex(clampedIndex);
  };

  const continueToLogin = async () => {
    await setOnboardingComplete(true);
    router.replace("/auth/login");
  };

  const goNext = () => {
    if (index >= slides.length - 1) {
      void continueToLogin();
      return;
    }

    jumpToIndex(indexRef.current + 1);
  };

  const goPrevious = () => {
    jumpToIndex(indexRef.current - 1);
  };

  const swipeResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 18,
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx <= -56) {
            if (indexRef.current >= slides.length - 1) {
              void continueToLogin();
              return;
            }

            jumpToIndex(indexRef.current + 1);
            return;
          }

          if (gestureState.dx >= 56) {
            goPrevious();
          }
        }
      }),
    []
  );

  const slideTranslateX = transition.interpolate({
    inputRange: [0, 1],
    outputRange: [direction * 42, 0]
  });
  const slideTranslateY = transition.interpolate({
    inputRange: [0, 1],
    outputRange: [12, 0]
  });
  const slideScale = transition.interpolate({
    inputRange: [0, 1],
    outputRange: [0.985, 1]
  });

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 pb-10 pt-2">
        <View className="px-6">
          <View className="flex-row items-center justify-end">
            <ScaleButton onPress={() => void continueToLogin()} className="rounded-full px-4 py-2.5">
              <Text className="font-jakarta text-sm text-rx-muted">Skip</Text>
            </ScaleButton>
          </View>
        </View>

        <View className="flex-1 overflow-hidden" {...swipeResponder.panHandlers}>
          <Animated.View
            style={{
              flex: 1,
              opacity: transition,
              transform: [
                { translateX: slideTranslateX },
                { translateY: slideTranslateY },
                { scale: slideScale }
              ]
            }}
          >
            <View key={index} style={{ width }} className="flex-1 px-6">
              <View className="flex-1 items-center justify-center">
                <View className="items-center">
                  <Image
                    source={currentSlide.image}
                    style={{ width: Math.min(width - 56, 340), height: Math.min(width * 1.1, 360) }}
                    contentFit="contain"
                  />
                </View>

                <View className="mt-10 max-w-[340px] items-center">
                  <Text className="text-center font-jakarta-bold text-[34px] leading-[42px] text-rx-text">
                    {currentSlide.titleBefore}
                    <Text className="text-rx-accent">{currentSlide.titleAccent}</Text>
                    {currentSlide.titleAfter}
                  </Text>
                  <Text className="mt-4 text-center font-jakarta text-sm leading-6 text-rx-muted">{currentSlide.description}</Text>
                  <Text className="mt-4 font-jakarta text-xs uppercase tracking-[1.4px] text-rx-muted">
                    {index === 0 ? "Swipe to continue" : "Click below to explore"}
                  </Text>
                </View>
              </View>
            </View>
          </Animated.View>
        </View>

        <View className="px-6">
          <View className="mb-6 flex-row items-center justify-center gap-2">
            {slides.map((_, slideIndex) => {
              return (
                <Animated.View
                  key={slideIndex}
                  style={{
                    width: slideIndex === index ? 28 : 10,
                    opacity: slideIndex === index ? 1 : 0.35,
                    transform: [{ scale: slideIndex === index ? 1 : 0.92 }]
                  }}
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
