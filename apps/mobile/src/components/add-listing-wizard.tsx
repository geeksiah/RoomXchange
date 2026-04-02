import { zodResolver } from "@hookform/resolvers/zod";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { Image } from "expo-image";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import MapView, { Marker, type MapPressEvent } from "react-native-maps";
import { listingInputSchema, suggestedAmenities, type ListingInput } from "@roomxchange/contracts";
import {
  formatAmenityLabel,
  formatListingSubtypeLabel,
  formatMonthlyPrice
} from "@roomxchange/shared/src/mobile";
import { searchGhanaLocations } from "../ghana-locations";
import { DismissKeyboardView } from "./dismiss-keyboard-view";
import { EmptyStateCard } from "./empty-state-card";
import { LoadingLabel } from "./loading-label";
import { NativeMapBoundary } from "./native-map-boundary";
import { ScaleButton } from "./scale-button";
import { getMapAvailabilityHint, getNativeMapProvider, isNativeMapConfigured, logNativeMapDiagnostics } from "../lib/maps";
import { buildRuntimeMapboxSearchUrl } from "../lib/runtime-config";
import { uploadPresignedFile } from "../lib/presigned-upload";
import { useSession } from "../session-provider";

type Suggestion = {
  id: string;
  fullAddress: string;
  lat: number;
  lng: number;
};

const initialRegion = {
  latitude: 5.6037,
  longitude: -0.187,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08
};

const MAX_PHOTOS = 10;
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;
const PHOTO_GRID_GAP = 12;
const PHOTO_META_HEIGHT = 64;
const allSubtypes = ["studio", "single_room_sc", "one_bedroom", "two_bedroom_plus"] as const;

function getDefaultListingValues(initialValues?: Partial<ListingInput>): ListingInput {
  return {
    title: initialValues?.title ?? "",
    propertyType: initialValues?.propertyType ?? "room",
    listingSubtype: initialValues?.listingSubtype ?? "single_room_sc",
    price: initialValues?.price ?? 0,
    location: initialValues?.location ?? "",
    lat: initialValues?.lat ?? initialRegion.latitude,
    lng: initialValues?.lng ?? initialRegion.longitude,
    images: initialValues?.images ?? [],
    previewImage: initialValues?.previewImage ?? initialValues?.images?.[0] ?? "",
    vrUrl: initialValues?.vrUrl ?? "",
    description: initialValues?.description ?? "",
    amenities: initialValues?.amenities ?? [],
    mapboxPlaceId: initialValues?.mapboxPlaceId ?? "",
    status: initialValues?.status ?? "published"
  };
}

type AddListingWizardProps = {
  mode?: "create" | "edit";
  listingId?: string;
  initialValues?: Partial<ListingInput>;
  onCompleted?: (listingId: string) => void;
};

type FeedbackState = {
  variant: "success" | "error";
  title: string;
  message: string;
  primaryLabel: string;
  onPrimaryPress: () => void;
  secondaryLabel?: string;
  onSecondaryPress?: () => void;
} | null;

export function AddListingWizard({ mode = "create", listingId, initialValues, onCompleted }: AddListingWizardProps) {
  const router = useRouter();
  const { api, session } = useSession();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [amenityInput, setAmenityInput] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [mapRenderFailed, setMapRenderFailed] = useState(false);

  const form = useForm<ListingInput>({
    resolver: zodResolver(listingInputSchema),
    defaultValues: getDefaultListingValues(initialValues)
  });
  const {
    formState: { errors }
  } = form;

  const locationValue = useWatch({ control: form.control, name: "location" });
  const images = useWatch({ control: form.control, name: "images" });
  const amenities = useWatch({ control: form.control, name: "amenities" }) ?? [];
  const propertyType = useWatch({ control: form.control, name: "propertyType" });
  const listingSubtype = useWatch({ control: form.control, name: "listingSubtype" });
  const lat = useWatch({ control: form.control, name: "lat" });
  const lng = useWatch({ control: form.control, name: "lng" });
  const titleValue = useWatch({ control: form.control, name: "title" });
  const priceValue = useWatch({ control: form.control, name: "price" });
  const descriptionValue = useWatch({ control: form.control, name: "description" });
  const previewImage = useWatch({ control: form.control, name: "previewImage" });

  useEffect(() => {
    setError(null);
  }, [step]);

  useEffect(() => {
    if (!initialValues) {
      return;
    }

    form.reset(getDefaultListingValues(initialValues));
    setAmenityInput("");
    setStep(1);
  }, [form, initialValues]);

  useEffect(() => {
    const controller = new AbortController();
    const query = locationValue?.trim() ?? "";
    if (query.length < 2) {
      setSuggestions([]);
      return () => controller.abort();
    }

    const localMatches = searchGhanaLocations(query);

    const applyResolvedSuggestions = (items: Suggestion[]) => {
      setSuggestions(items);

      const topMatch = items[0];
      if (!topMatch) {
        return;
      }

      form.setValue("lat", topMatch.lat, { shouldValidate: true });
      form.setValue("lng", topMatch.lng, { shouldValidate: true });
      form.setValue("mapboxPlaceId", topMatch.id, { shouldValidate: false });
    };

    if (localMatches.length) {
      applyResolvedSuggestions(localMatches);
      return () => controller.abort();
    }

    const timer = setTimeout(() => {
      const searchUrl = buildRuntimeMapboxSearchUrl(query);
      if (!searchUrl) {
        applyResolvedSuggestions([]);
        return;
      }

      fetch(searchUrl, { signal: controller.signal })
        .then((response) => response.json())
        .then((payload) => {
          const remoteMatches = (payload.features ?? []).map((feature: any) => ({
            id: feature.properties?.mapbox_id ?? feature.id,
            fullAddress: feature.properties?.full_address ?? query,
            lat: feature.geometry?.coordinates?.[1] ?? initialRegion.latitude,
            lng: feature.geometry?.coordinates?.[0] ?? initialRegion.longitude
          }));
          applyResolvedSuggestions(remoteMatches);
        })
        .catch(() => applyResolvedSuggestions([]));
    }, 220);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [locationValue]);

  const currentRegion = useMemo(
    () => ({
      latitude: lat || initialRegion.latitude,
      longitude: lng || initialRegion.longitude,
      latitudeDelta: initialRegion.latitudeDelta,
      longitudeDelta: initialRegion.longitudeDelta
    }),
    [lat, lng]
  );
  const nativeMapConfigured = useMemo(() => isNativeMapConfigured(), []);
  const mapProvider = useMemo(() => getNativeMapProvider(), []);

  useEffect(() => {
    if (step === 2) {
      logNativeMapDiagnostics("add-listing.map_attempt");
    }
  }, [step]);

  useEffect(() => {
    if (step === 2) {
      setMapRenderFailed(false);
    }
  }, [currentRegion.latitude, currentRegion.longitude, step]);

  const addAmenity = (value: string) => {
    const normalized = value.trim();
    if (!normalized) {
      return;
    }

    const current = form.getValues("amenities") ?? [];
    if (current.some((item) => item.toLowerCase() === normalized.toLowerCase()) || current.length >= 12) {
      setAmenityInput("");
      return;
    }

    form.setValue("amenities", [...current, normalized], { shouldValidate: true });
    setAmenityInput("");
  };

  const removeAmenity = (value: string) => {
    form.setValue(
      "amenities",
      (form.getValues("amenities") ?? []).filter((item) => item !== value),
      { shouldValidate: true }
    );
  };

  const pickImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Allow photo access to continue.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS
    });

    if (result.canceled) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const existingImages = [...(form.getValues("images") ?? [])];
      const remainingSlots = Math.max(0, MAX_PHOTOS - existingImages.length);
      const nextAssets = result.assets.slice(0, remainingSlots);
      let uploadMessage: string | null = null;

      if (!nextAssets.length) {
        setError("You can upload up to 10 photos.");
        return;
      }

      const uploaded = [...existingImages];

      for (const asset of nextAssets) {
        const mimeType = (asset.mimeType ?? "").toLowerCase();
        const fileExtension = asset.fileName?.split(".").pop()?.toLowerCase();
        const isJpg = mimeType.includes("jpeg") || mimeType.includes("jpg") || fileExtension === "jpg" || fileExtension === "jpeg";
        const isPng = mimeType.includes("png") || fileExtension === "png";

        if (!isJpg && !isPng) {
          uploadMessage = "Use JPG, JPEG, or PNG photos only.";
          continue;
        }

        if ((asset.fileSize ?? 0) > MAX_FILE_SIZE_BYTES) {
          uploadMessage = "Each photo should be 8MB or less.";
          continue;
        }

        const format = isPng ? SaveFormat.PNG : SaveFormat.JPEG;
        const contentType = isPng ? "image/png" : "image/jpeg";
        const fileName = asset.fileName ?? `roomxchange-${Date.now()}.${isPng ? "png" : "jpg"}`;
        const compressed = await manipulateAsync(asset.uri, [{ resize: { width: 1600 } }], {
          compress: 0.82,
          format
        });

        const upload = await api.createUpload({
          fileName,
          contentType
        });
        await uploadPresignedFile({
          uri: compressed.uri,
          uploadUrl: upload.uploadUrl,
          headers: upload.headers
        });
        uploaded.push(upload.fileUrl);
      }

      const trimmedImages = uploaded.slice(0, MAX_PHOTOS);
      form.setValue("images", trimmedImages, { shouldValidate: true });
      form.setValue("previewImage", trimmedImages[0] ?? "", { shouldValidate: true });
      setError(uploadMessage);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? "We couldn't upload those photos right now." : "We couldn't upload those photos right now.");
    } finally {
      setBusy(false);
    }
  };

  const onMapPress = (event: MapPressEvent) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    form.setValue("lat", latitude, { shouldValidate: true });
    form.setValue("lng", longitude, { shouldValidate: true });
  };

  const submit = form.handleSubmit(
    async (values) => {
      try {
        setBusy(true);
        setError(null);
        const payload = {
          ...values,
          previewImage: values.previewImage || values.images[0]
        };
        const savedListing =
          mode === "edit" && listingId
            ? await api.updateListing(listingId, payload)
            : await api.createListing(payload);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["home-feed"] }),
          queryClient.invalidateQueries({ queryKey: ["explore-feed"] }),
          queryClient.invalidateQueries({ queryKey: ["my-listings"] }),
          queryClient.invalidateQueries({ queryKey: ["listing", savedListing.listingId] })
        ]);
        if (mode === "edit") {
        setFeedback({
          variant: "success",
          title: "Listing updated",
          message: "Your changes have been saved successfully.",
            primaryLabel: "Open listing",
            onPrimaryPress: () => {
              setFeedback(null);
              router.push({
                pathname: "/listings/[id]",
                params: { id: savedListing.listingId }
              } as never);
            },
            secondaryLabel: "Back to listings",
            onSecondaryPress: () => {
              setFeedback(null);
              onCompleted?.(savedListing.listingId);
            }
          });
        } else {
          form.reset(getDefaultListingValues());
          setStep(1);
          setAmenityInput("");
          setFeedback({
            variant: "success",
            title: "Listing published",
            message: "Your property is now live in the marketplace.",
            primaryLabel: "Open listing",
            onPrimaryPress: () => {
              setFeedback(null);
              router.push({
                pathname: "/listings/[id]",
                params: { id: savedListing.listingId }
              } as never);
            },
            secondaryLabel: "Done",
            onSecondaryPress: () => setFeedback(null)
          });
        }
      } catch (submissionError) {
        setError(
          submissionError instanceof Error
            ? mode === "edit"
              ? "We couldn't save your changes right now."
              : "We couldn't publish the listing right now."
            : mode === "edit"
              ? "We couldn't save your changes right now."
              : "We couldn't publish the listing right now."
        );
        setFeedback({
          variant: "error",
          title: mode === "edit" ? "Couldn't update listing" : "Couldn't publish listing",
          message: "Please review the form and try again.",
          primaryLabel: "Close",
          onPrimaryPress: () => setFeedback(null)
        });
      } finally {
        setBusy(false);
      }
    },
    () => {
      setError("Complete the required fields before publishing.");
    }
  );

  const reorderImages = (fromIndex: number, toIndex: number) => {
    const current = [...(form.getValues("images") ?? [])];
    if (toIndex < 0 || toIndex >= current.length) {
      return;
    }

    const [moved] = current.splice(fromIndex, 1);
    current.splice(toIndex, 0, moved);
    form.setValue("images", current, { shouldValidate: true });
    form.setValue("previewImage", current[0] ?? "", { shouldValidate: true });
  };

  const makeCover = (index: number) => {
    reorderImages(index, 0);
  };

  const removeImage = (index: number) => {
    const current = [...(form.getValues("images") ?? [])];
    current.splice(index, 1);
    form.setValue("images", current, { shouldValidate: true });
    form.setValue("previewImage", current[0] ?? "", { shouldValidate: true });
  };

  const selectPropertyType = (value: "room" | "apartment") => {
    form.setValue("propertyType", value, { shouldValidate: true });
  };

  const selectListingSubtype = (value: "studio" | "single_room_sc" | "one_bedroom" | "two_bedroom_plus") => {
    form.setValue("listingSubtype", value, { shouldValidate: true });
  };

  const goNext = async () => {
    setError(null);

    if (step === 1) {
      if (!images?.length) {
        setError("Add at least one photo to continue.");
        return;
      }
      setStep(2);
      return;
    }

    if (step === 2) {
      if (!locationValue?.trim()) {
        setError("Choose a location to continue.");
        return;
      }

      const bestMatch = suggestions[0];
      if (bestMatch) {
        form.setValue("location", bestMatch.fullAddress, { shouldValidate: true });
        form.setValue("lat", bestMatch.lat, { shouldValidate: true });
        form.setValue("lng", bestMatch.lng, { shouldValidate: true });
        form.setValue("mapboxPlaceId", bestMatch.id, { shouldValidate: true });
      }

      setStep(3);
      return;
    }

    if (step === 3) {
      const valid = await form.trigger(["title", "propertyType", "listingSubtype", "price", "description"]);
      if (!valid) {
        setError("Check the highlighted fields and continue.");
        return;
      }
      setStep(4);
    }
  };

  return (
    <DismissKeyboardView>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 176 }}>
        <View className="mb-5 flex-row gap-2">
          {[1, 2, 3, 4].map((value) => (
            <View key={value} className={`h-2 flex-1 rounded-full ${step >= value ? "bg-rx-accent" : "bg-rx-border"}`} />
          ))}
        </View>

        {step === 1 ? (
          <View className="rounded-3xl bg-white p-5">
            <Text className="font-jakarta-bold text-2xl text-rx-text">Upload images</Text>
            <Text className="mt-2 font-jakarta text-sm leading-6 text-rx-muted">
              Add up to 10 JPG or PNG photos, 8MB each. Choose the cover photo that should represent the listing first.
              </Text>
              <ScaleButton onPress={() => void pickImages()} className="mt-4 rounded-full border border-rx-border bg-rx-background py-4">
                <LoadingLabel
                  loading={busy}
                  label="Select photos"
                  loadingLabel="Uploading photos"
                  textClassName="text-center font-jakarta-bold text-base text-rx-text"
                  spinnerColor="#111111"
                />
              </ScaleButton>
            <View className="mt-4">
              <PhotoGrid images={images ?? []} onMakeCover={makeCover} onRemove={removeImage} />
            </View>
          </View>
        ) : null}

        {step === 2 ? (
        <View className="rounded-3xl bg-white p-5">
          <Text className="font-jakarta-bold text-2xl text-rx-text">Set the location</Text>
          <Text className="mt-2 font-jakarta text-sm leading-6 text-rx-muted">
            Search for the address, then fine-tune the pin directly on the map.
          </Text>
          <Controller
            control={form.control}
            name="location"
            render={({ field }) => (
              <Input
                placeholder="Search neighborhood or address"
                returnKeyType="search"
                value={field.value}
                onChangeText={field.onChange}
                errorText={errors.location?.message}
              />
            )}
          />
          {suggestions.map((suggestion) => (
            <Pressable
              key={suggestion.id}
              onPress={() => {
                form.setValue("location", suggestion.fullAddress, { shouldValidate: true });
                form.setValue("lat", suggestion.lat, { shouldValidate: true });
                form.setValue("lng", suggestion.lng, { shouldValidate: true });
                form.setValue("mapboxPlaceId", suggestion.id, { shouldValidate: true });
                setSuggestions([]);
              }}
              className="mt-3 rounded-2xl border border-rx-border bg-rx-background px-4 py-3"
            >
              <Text className="font-jakarta text-sm text-rx-text">{suggestion.fullAddress}</Text>
            </Pressable>
          ))}
          <View className="mt-4 overflow-hidden rounded-3xl">
            {nativeMapConfigured && !mapRenderFailed ? (
              <NativeMapBoundary
                resetKey={`${currentRegion.latitude}:${currentRegion.longitude}`}
                onError={() => setMapRenderFailed(true)}
                onReset={() => setMapRenderFailed(false)}
                fallback={
                  <View className="bg-rx-background p-4">
                    <EmptyStateCard
                      icon="map-outline"
                      title="Map pinning is unavailable in this build"
                      description={getMapAvailabilityHint()}
                    />
                  </View>
                }
              >
                <MapView
                  style={{ width: "100%", height: 260 }}
                  provider={mapProvider}
                  googleRenderer={Platform.OS === "android" ? "LEGACY" : undefined}
                  initialRegion={currentRegion}
                  region={currentRegion}
                  onMapReady={() => setMapRenderFailed(false)}
                  onPress={onMapPress}
                >
                  <Marker coordinate={{ latitude: currentRegion.latitude, longitude: currentRegion.longitude }} />
                </MapView>
              </NativeMapBoundary>
            ) : (
              <View className="bg-rx-background p-4">
                <EmptyStateCard
                  icon="map-outline"
                  title="Map pinning is unavailable in this build"
                  description={getMapAvailabilityHint()}
                />
              </View>
            )}
          </View>
        </View>
        ) : null}

        {step === 3 ? (
        <View className="rounded-3xl bg-white p-5">
          <Text className="font-jakarta-bold text-2xl text-rx-text">Core details</Text>
          <Controller
            control={form.control}
            name="title"
            render={({ field }) => (
              <Input
                placeholder="Cozy furnished room in East Legon"
                returnKeyType="next"
                value={field.value}
                onChangeText={field.onChange}
                errorText={errors.title?.message}
              />
            )}
          />
          <View className="mt-4">
            <Text className="mb-3 font-jakarta-bold text-sm text-rx-text">Listing type</Text>
            <View className="flex-row gap-2">
              {[
                { key: "room", label: "Room" },
                { key: "apartment", label: "Apartment" }
              ].map((item) => {
                const active = propertyType === item.key;
                return (
                  <ScaleButton
                    key={item.key}
                    onPress={() => selectPropertyType(item.key as "room" | "apartment")}
                    className={`flex-1 rounded-full px-4 py-3 ${active ? "bg-rx-text" : "border border-rx-border bg-rx-background"}`}
                  >
                    <Text className={`text-center font-jakarta-bold text-sm ${active ? "text-white" : "text-rx-text"}`}>{item.label}</Text>
                  </ScaleButton>
                );
              })}
            </View>
          </View>
          <View className="mt-4">
            <Text className="mb-3 font-jakarta-bold text-sm text-rx-text">Room type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2 pr-4">
              {allSubtypes.map((item) => {
                const active = listingSubtype === item;
                return (
                  <ScaleButton
                    key={item}
                    onPress={() => selectListingSubtype(item as "studio" | "single_room_sc" | "one_bedroom" | "two_bedroom_plus")}
                    className={`rounded-full px-4 py-3 ${active ? "bg-rx-text" : "border border-rx-border bg-rx-background"}`}
                  >
                    <Text className={`font-jakarta-bold text-sm ${active ? "text-white" : "text-rx-text"}`}>
                      {formatListingSubtypeLabel(item)}
                    </Text>
                  </ScaleButton>
                );
              })}
              </View>
            </ScrollView>
            {errors.listingSubtype?.message ? <FieldError text={errors.listingSubtype.message} /> : null}
          </View>
          <Controller
            control={form.control}
            name="price"
            render={({ field }) => (
              <Input
                placeholder="GHS 1,200"
                keyboardType="numeric"
                returnKeyType="done"
                value={field.value ? String(field.value) : ""}
                onChangeText={(value) => field.onChange(Number(value.replace(/[^\d]/g, "")) || 0)}
                errorText={errors.price?.message}
              />
            )}
          />
          <Controller
            control={form.control}
            name="description"
            render={({ field }) => (
              <TextInput
                placeholder="Short description"
                placeholderTextColor="#6B7280"
                value={field.value}
                onChangeText={field.onChange}
                multiline
                returnKeyType="done"
                textAlignVertical="top"
                className="mt-3 min-h-[140px] rounded-2xl border border-rx-border bg-rx-background px-4 py-4 font-jakarta text-base leading-6 text-rx-text"
              />
            )}
          />
          {errors.description?.message ? <FieldError text={errors.description.message} /> : null}
        </View>
        ) : null}

        {step === 4 ? (
        <View className="rounded-3xl bg-white p-5">
          <Text className="font-jakarta-bold text-2xl text-rx-text">Amenities</Text>
          <Text className="mt-2 font-jakarta text-sm leading-6 text-rx-muted">
            Add the amenities you want people to see on the final property card.
          </Text>

          <View className="mt-4 rounded-3xl bg-rx-background p-4">
            <Text className="font-jakarta-bold text-sm text-rx-text">Add amenities</Text>
            <Text className="mt-1 font-jakarta text-xs leading-5 text-rx-muted">
              Add the exact amenities available in this home. You can use the suggestions below or type your own.
            </Text>
            <View className="mt-4 flex-row gap-3">
              <TextInput
                value={amenityInput}
                onChangeText={setAmenityInput}
                placeholder="e.g. Balcony, Generator"
                placeholderTextColor="#6B7280"
                returnKeyType="done"
                onSubmitEditing={() => addAmenity(amenityInput)}
                className="flex-1 rounded-2xl bg-white px-4 py-4 font-jakarta text-base text-rx-text"
              />
              <ScaleButton onPress={() => addAmenity(amenityInput)} className="rounded-full bg-rx-text px-5 py-4">
                <Text className="font-jakarta-bold text-sm text-white">Add</Text>
              </ScaleButton>
            </View>
            <View className="mt-4 flex-row flex-wrap gap-2">
              {suggestedAmenities.map((amenity) => {
                const selected = amenities.some((item) => item.toLowerCase() === amenity.toLowerCase());
                return (
                  <ScaleButton
                    key={amenity}
                    onPress={() => (selected ? removeAmenity(amenity) : addAmenity(amenity))}
                    className={`rounded-full px-4 py-3 ${selected ? "bg-rx-text" : "border border-rx-border bg-white"}`}
                  >
                    <Text className={`font-jakarta text-sm ${selected ? "text-white" : "text-rx-text"}`}>{amenity}</Text>
                  </ScaleButton>
                );
              })}
            </View>
          </View>

          <View className="mt-4 flex-row flex-wrap gap-2">
            {amenities.map((amenity) => (
              <ScaleButton key={amenity} onPress={() => removeAmenity(amenity)} className="rounded-full bg-rx-accent px-4 py-3">
                <View className="flex-row items-center gap-2">
                  <Text className="font-jakarta text-sm text-white">{formatAmenityLabel(amenity)}</Text>
                  <Ionicons name="close" size={14} color="#FFFFFF" />
                </View>
              </ScaleButton>
            ))}
          </View>
          <View className="mt-5">
            <Text className="mb-3 font-jakarta-bold text-sm text-rx-text">Listing preview</Text>
            <View className="overflow-hidden rounded-[28px] bg-rx-background">
              <View className="relative">
                {previewImage || images?.[0] ? (
                  <Image
                    source={previewImage || images?.[0]}
                    style={{ width: "100%", height: 220 }}
                    contentFit="cover"
                  />
                ) : (
                  <View className="h-[220px] items-center justify-center bg-rx-border">
                    <Ionicons name="image-outline" size={34} color="#6B7280" />
                  </View>
                )}
                <View className="absolute inset-x-0 bottom-0 flex-row items-end justify-between bg-black/25 px-4 py-4">
                  <View className="rounded-full bg-black/45 px-4 py-2">
                    <Text className="font-jakarta-bold text-base text-white">
                      {formatMonthlyPrice(Number(priceValue || 0))}
                    </Text>
                  </View>
                </View>
              </View>

              <View className="p-4">
                <Text className="font-jakarta-bold text-xl leading-8 text-rx-text" numberOfLines={2}>
                  {titleValue?.trim() || "Your listing title will appear here"}
                </Text>
                <Text className="mt-1 font-jakarta text-sm text-rx-muted" numberOfLines={1}>
                  {locationValue?.trim() || "Choose a location"}
                </Text>

                <View className="mt-4 flex-row flex-wrap gap-2">
                  <View className="rounded-full bg-white px-3 py-2">
                    <Text className="font-jakarta text-xs text-rx-text">
                      {propertyType === "room" ? "Room" : "Apartment"}
                    </Text>
                  </View>
                  <View className="rounded-full bg-white px-3 py-2">
                    <Text className="font-jakarta text-xs text-rx-text">
                      {formatListingSubtypeLabel(listingSubtype ?? (propertyType === "room" ? "single_room_sc" : "studio"))}
                    </Text>
                  </View>
                  {amenities.length ? (
                    <View className="rounded-full bg-white px-3 py-2">
                      <Text className="font-jakarta text-xs text-rx-text">
                        {amenities.length} amenit{amenities.length === 1 ? "y" : "ies"}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {amenities.length ? (
                  <View className="mt-4 flex-row flex-wrap gap-2">
                    {amenities.slice(0, 4).map((amenity) => (
                      <View key={amenity} className="rounded-full border border-rx-border bg-white px-3 py-2">
                        <Text className="font-jakarta text-xs text-rx-muted">{formatAmenityLabel(amenity)}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                {descriptionValue?.trim() ? (
                  <Text className="mt-4 font-jakarta text-sm leading-6 text-rx-muted" numberOfLines={3}>
                    {descriptionValue.trim()}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        </View>
        ) : null}

        {error ? <Text className="mt-4 font-jakarta text-sm text-red-600">{error}</Text> : null}

        <View className="mt-5 flex-row gap-3">
          {step > 1 ? (
            <ScaleButton onPress={() => setStep((current) => current - 1)} className="flex-1 rounded-full border border-rx-border bg-white py-4">
              <Text className="text-center font-jakarta text-base text-rx-text">Back</Text>
            </ScaleButton>
          ) : null}
          {step < 4 ? (
            <ScaleButton onPress={() => void goNext()} className="flex-1 rounded-full bg-rx-accent py-4">
              <Text className="text-center font-jakarta-bold text-base text-white">Next</Text>
            </ScaleButton>
            ) : (
              <ScaleButton onPress={() => void submit()} disabled={busy} className="flex-1 rounded-full bg-rx-accent py-4">
                <LoadingLabel
                  loading={busy}
                  label={mode === "edit" ? "Save changes" : "Publish listing"}
                  loadingLabel={mode === "edit" ? "Saving changes" : "Publishing listing"}
                  textClassName="text-center font-jakarta-bold text-base text-white"
                />
              </ScaleButton>
            )}
        </View>
      </ScrollView>
      <Modal visible={Boolean(feedback)} transparent animationType="fade" onRequestClose={() => setFeedback(null)}>
        <View className="flex-1 items-center justify-center bg-black/30 px-6">
          <View
            className="w-full max-w-[360px] rounded-[28px] bg-white p-6"
            style={{
              shadowColor: "#111111",
              shadowOpacity: 0.14,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: 12 },
              elevation: 18
            }}
          >
            <View className="h-12 w-12 items-center justify-center rounded-full bg-rx-accentSoft">
              <Ionicons name={feedback?.variant === "success" ? "checkmark" : "alert"} size={22} color="#FF385C" />
            </View>
            <Text className="mt-4 font-jakarta-bold text-2xl text-rx-text">{feedback?.title}</Text>
            <Text className="mt-2 font-jakarta text-sm leading-6 text-rx-muted">{feedback?.message}</Text>
            <View className="mt-6 flex-row gap-3">
              {feedback?.secondaryLabel ? (
                <ScaleButton onPress={feedback.onSecondaryPress} className="flex-1 rounded-full bg-rx-background py-4">
                  <Text className="text-center font-jakarta-bold text-sm text-rx-text">{feedback.secondaryLabel}</Text>
                </ScaleButton>
              ) : null}
              <ScaleButton onPress={feedback?.onPrimaryPress} className="flex-1 rounded-full bg-rx-accent py-4">
                <Text className="text-center font-jakarta-bold text-sm text-white">{feedback?.primaryLabel}</Text>
              </ScaleButton>
            </View>
          </View>
        </View>
      </Modal>
    </DismissKeyboardView>
  );
}

function Input({
  placeholder,
  value,
  onChangeText,
  keyboardType,
  returnKeyType,
  errorText
}: {
  placeholder: string;
  value?: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "numeric";
  returnKeyType?: "done" | "next" | "search";
  errorText?: string;
}) {
  return (
    <View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        returnKeyType={returnKeyType}
        placeholder={placeholder}
        placeholderTextColor="#6B7280"
        className={`mt-3 rounded-2xl border bg-rx-background px-4 py-4 font-jakarta text-base leading-6 text-rx-text ${
          errorText ? "border-red-300" : "border-rx-border"
        }`}
      />
      {errorText ? <FieldError text={errorText} /> : null}
    </View>
  );
}

function FieldError({ text }: { text: string }) {
  return <Text className="mt-2 font-jakarta text-xs leading-5 text-red-600">{text}</Text>;
}

function PhotoGrid({
  images,
  onMakeCover,
  onRemove
}: {
  images: string[];
  onMakeCover: (index: number) => void;
  onRemove: (index: number) => void;
}) {
  const [containerWidth, setContainerWidth] = useState(320);
  const tileWidth = (containerWidth - PHOTO_GRID_GAP) / 2;
  void PHOTO_META_HEIGHT;

  return (
    <View
      className="flex-row flex-wrap"
      style={{ gap: PHOTO_GRID_GAP }}
      onLayout={(event) => setContainerWidth(Math.max(event.nativeEvent.layout.width, 260))}
    >
      {images.map((image, index) => {
        return (
          <View
            key={`${image}-${index}`}
            style={{ width: tileWidth }}
            className="rounded-[22px] border border-rx-border bg-rx-background p-3"
          >
            <View>
              <View className="relative">
                <Image source={image} style={{ width: "100%", height: tileWidth * 0.76, borderRadius: 16 }} contentFit="cover" />
                <View className="absolute inset-x-0 top-0 flex-row items-start justify-between p-3">
                  {index === 0 ? (
                    <View className="rounded-full bg-rx-accent px-3 py-1.5">
                      <Text className="font-jakarta-bold text-[11px] text-white">Cover</Text>
                    </View>
                  ) : (
                    <ScaleButton onPress={() => onMakeCover(index)} className="rounded-full bg-white/95 px-3 py-1.5">
                      <Text className="font-jakarta text-[11px] text-rx-text">Set cover</Text>
                    </ScaleButton>
                  )}
                  <ScaleButton onPress={() => onRemove(index)} className="h-8 w-8 items-center justify-center rounded-full bg-white/95">
                    <Ionicons name="close" size={16} color="#111111" />
                  </ScaleButton>
                </View>
              </View>
              <View className="pt-3">
                <Text className="font-jakarta-bold text-sm text-rx-text">Photo {index + 1}</Text>
                <Text className="mt-1 font-jakarta text-xs leading-5 text-rx-muted">
                  {index === 0 ? "Main cover image" : "Tap \"Set cover\" if this should be first"}
                </Text>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}
