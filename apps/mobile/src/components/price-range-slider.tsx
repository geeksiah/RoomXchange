import { useEffect, useMemo, useRef, useState } from "react";
import { PanResponder, Pressable, Text, View } from "react-native";

const TRACK_MIN = 0;
const TRACK_MAX = 6000;
const STEP = 100;
const THUMB_SIZE = 28;

function snap(value: number) {
  return Math.round(value / STEP) * STEP;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function PriceRangeSlider({
  minValue,
  maxValue,
  onChange
}: {
  minValue: number;
  maxValue: number;
  onChange: (nextMin: number, nextMax: number) => void;
}) {
  const [trackWidth, setTrackWidth] = useState(1);
  const [internalMin, setInternalMin] = useState(minValue);
  const [internalMax, setInternalMax] = useState(maxValue);
  const dragStartMin = useRef(minValue);
  const dragStartMax = useRef(maxValue);
  const currentMinRef = useRef(minValue);
  const currentMaxRef = useRef(maxValue);
  const draggingRef = useRef<"min" | "max" | null>(null);

  useEffect(() => {
    if (draggingRef.current) {
      return;
    }
    setInternalMin(minValue);
    setInternalMax(maxValue);
    currentMinRef.current = minValue;
    currentMaxRef.current = maxValue;
  }, [maxValue, minValue]);

  const valueToX = (value: number) => ((value - TRACK_MIN) / (TRACK_MAX - TRACK_MIN)) * trackWidth;
  const xToValue = (x: number) => snap(clamp((x / trackWidth) * (TRACK_MAX - TRACK_MIN) + TRACK_MIN, TRACK_MIN, TRACK_MAX));

  const updatePreview = (nextMin: number, nextMax: number) => {
    currentMinRef.current = nextMin;
    currentMaxRef.current = nextMax;
    setInternalMin(nextMin);
    setInternalMax(nextMax);
  };

  const commitRange = (nextMin: number, nextMax: number) => {
    updatePreview(nextMin, nextMax);
    onChange(nextMin, nextMax);
  };

  const minResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          draggingRef.current = "min";
          dragStartMin.current = currentMinRef.current;
        },
        onPanResponderMove: (_, gestureState) => {
          const nextMin = clamp(xToValue(valueToX(dragStartMin.current) + gestureState.dx), TRACK_MIN, currentMaxRef.current - STEP);
          updatePreview(nextMin, currentMaxRef.current);
        },
        onPanResponderRelease: () => {
          draggingRef.current = null;
          commitRange(currentMinRef.current, currentMaxRef.current);
        },
        onPanResponderTerminate: () => {
          draggingRef.current = null;
          commitRange(currentMinRef.current, currentMaxRef.current);
        }
      }),
    [trackWidth]
  );

  const maxResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          draggingRef.current = "max";
          dragStartMax.current = currentMaxRef.current;
        },
        onPanResponderMove: (_, gestureState) => {
          const nextMax = clamp(xToValue(valueToX(dragStartMax.current) + gestureState.dx), currentMinRef.current + STEP, TRACK_MAX);
          updatePreview(currentMinRef.current, nextMax);
        },
        onPanResponderRelease: () => {
          draggingRef.current = null;
          commitRange(currentMinRef.current, currentMaxRef.current);
        },
        onPanResponderTerminate: () => {
          draggingRef.current = null;
          commitRange(currentMinRef.current, currentMaxRef.current);
        }
      }),
    [trackWidth]
  );

  const left = valueToX(internalMin);
  const right = valueToX(internalMax);

  return (
    <View>
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="font-jakarta text-sm text-rx-muted">GHS {internalMin.toLocaleString("en-GH")}</Text>
        <Text className="font-jakarta text-sm text-rx-muted">GHS {internalMax.toLocaleString("en-GH")}</Text>
      </View>

      <Pressable
        onLayout={(event) => setTrackWidth(Math.max(event.nativeEvent.layout.width, 1))}
        onPress={(event) => {
          const nextValue = xToValue(event.nativeEvent.locationX);
          const moveMin = Math.abs(nextValue - internalMin) <= Math.abs(nextValue - internalMax);
          if (moveMin) {
            commitRange(clamp(nextValue, TRACK_MIN, internalMax - STEP), internalMax);
            return;
          }
          commitRange(internalMin, clamp(nextValue, internalMin + STEP, TRACK_MAX));
        }}
        className="relative h-12 items-center justify-center"
      >
        <View className="h-2 w-full rounded-full bg-rx-border" />
        <View
          className="absolute h-2 rounded-full bg-rx-accent"
          style={{
            left,
            width: Math.max(right - left, 10)
          }}
        />
        <View
          {...minResponder.panHandlers}
          className="absolute h-12 w-12 items-center justify-center"
          style={{ left: Math.max(left - 24, -8) }}
        >
          <View
            className="h-7 w-7 rounded-full border-4 border-white bg-rx-accent"
            style={{
              shadowColor: "#111111",
              shadowOpacity: 0.16,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 4 },
              elevation: 4
            }}
          />
        </View>
        <View
          {...maxResponder.panHandlers}
          className="absolute h-12 w-12 items-center justify-center"
          style={{ left: Math.max(right - 24, -8) }}
        >
          <View
            className="h-7 w-7 rounded-full border-4 border-white bg-rx-accent"
            style={{
              shadowColor: "#111111",
              shadowOpacity: 0.16,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 4 },
              elevation: 4
            }}
          />
        </View>
      </Pressable>
    </View>
  );
}
