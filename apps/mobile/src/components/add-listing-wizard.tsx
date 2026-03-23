import { zodResolver } from "@hookform/resolvers/zod";
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { amenitySchema, listingInputSchema, type ListingInput } from "@roomxchange/contracts";
import { amenityLabels, buildMapboxSearchUrl } from "@roomxchange/shared";
import { useSession } from "../session-provider";
import { theme } from "../theme";

type Suggestion = {
  id: string;
  fullAddress: string;
  lat: number;
  lng: number;
};

const amenityOptions = amenitySchema.options;

export function AddListingWizard() {
  const { api } = useSession();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  const form = useForm<ListingInput>({
    resolver: zodResolver(listingInputSchema),
    defaultValues: {
      title: "",
      price: 0,
      location: "",
      lat: 0,
      lng: 0,
      images: [],
      previewImage: "",
      vrUrl: undefined,
      description: "",
      amenities: [],
      mapboxPlaceId: undefined,
      status: "published"
    }
  });

  const location = form.watch("location");
  const images = form.watch("images");

  useEffect(() => {
    const controller = new AbortController();
    if (!location || location.length < 3) {
      setSuggestions([]);
      return () => controller.abort();
    }

    fetch(buildMapboxSearchUrl(location), { signal: controller.signal })
      .then((response) => response.json())
      .then((payload) => {
        setSuggestions(
          (payload.features ?? []).map((feature: any) => ({
            id: feature.properties?.mapbox_id ?? feature.id,
            fullAddress: feature.properties?.full_address ?? location,
            lat: feature.geometry?.coordinates?.[1] ?? 0,
            lng: feature.geometry?.coordinates?.[0] ?? 0
          }))
        );
      })
      .catch(() => setSuggestions([]));

    return () => controller.abort();
  }, [location]);

  const pickImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Media library access is required.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 10
    });

    if (result.canceled) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const uploaded = [...form.getValues("images")];
      for (const asset of result.assets) {
        const compressed = await manipulateAsync(asset.uri, [{ resize: { width: 1600 } }], {
          compress: 0.82,
          format: SaveFormat.JPEG
        });
        const upload = await api.createUpload({
          fileName: asset.fileName ?? `listing-${Date.now()}.jpg`,
          contentType: "image/jpeg"
        });
        const blob = await fetch(compressed.uri).then((response) => response.blob());
        await fetch(upload.uploadUrl, {
          method: "PUT",
          headers: upload.headers,
          body: blob
        });
        uploaded.push(upload.fileUrl);
      }
      form.setValue("images", uploaded, { shouldValidate: true });
      if (!form.getValues("previewImage") && uploaded[0]) {
        form.setValue("previewImage", uploaded[0], { shouldValidate: true });
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  const submit = form.handleSubmit(async (values) => {
    try {
      setBusy(true);
      setError(null);
      await api.createListing(values);
      form.reset();
      setStep(1);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Unable to publish listing.");
    } finally {
      setBusy(false);
    }
  });

  return (
    <ScrollView contentContainerStyle={{ gap: 18, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
      <View style={{ flexDirection: "row", gap: 10 }}>
        {[1, 2, 3].map((value) => (
          <View key={value} style={{ flex: 1, height: 10, borderRadius: 999, backgroundColor: step >= value ? theme.colors.accent : theme.colors.surfaceMuted }} />
        ))}
      </View>

      {step === 1 ? (
        <View style={panelStyle}>
          <Text style={titleStyle}>Upload images</Text>
          <Text style={copyStyle}>Images are compressed on-device before they go to S3.</Text>
          <Pressable style={buttonStyle} onPress={() => void pickImages()}>
            <Text style={buttonLabelStyle}>{busy ? "Uploading..." : "Pick photos"}</Text>
          </Pressable>
          {images.map((image) => (
            <Text key={image} numberOfLines={1} style={{ color: theme.colors.text }}>
              {image}
            </Text>
          ))}
        </View>
      ) : null}

      {step === 2 ? (
        <View style={panelStyle}>
          <Text style={titleStyle}>Core details</Text>
          <Controller control={form.control} name="title" render={({ field }) => <TextInput style={fieldStyle} placeholder="Modern A-frame cabin with deck" value={field.value} onChangeText={field.onChange} />} />
          <Controller
            control={form.control}
            name="price"
            render={({ field }) => <TextInput style={fieldStyle} placeholder="289" keyboardType="numeric" value={field.value ? String(field.value) : ""} onChangeText={(value) => field.onChange(Number(value))} />}
          />
          <Controller
            control={form.control}
            name="description"
            render={({ field }) => (
              <TextInput
                style={[fieldStyle, { minHeight: 150, textAlignVertical: "top" }]}
                multiline
                placeholder="Describe the space, neighborhood, and what makes it special."
                value={field.value}
                onChangeText={field.onChange}
              />
            )}
          />
        </View>
      ) : null}

      {step === 3 ? (
        <View style={panelStyle}>
          <Text style={titleStyle}>Location and extras</Text>
          <Controller control={form.control} name="location" render={({ field }) => <TextInput style={fieldStyle} placeholder="Search a city or neighborhood" value={field.value} onChangeText={field.onChange} />} />
          {suggestions.map((suggestion) => (
            <Pressable
              key={suggestion.id}
              style={[buttonStyle, { backgroundColor: "white", borderWidth: 1, borderColor: theme.colors.border }]}
              onPress={() => {
                form.setValue("location", suggestion.fullAddress, { shouldValidate: true });
                form.setValue("lat", suggestion.lat, { shouldValidate: true });
                form.setValue("lng", suggestion.lng, { shouldValidate: true });
                form.setValue("mapboxPlaceId", suggestion.id, { shouldValidate: true });
                setSuggestions([]);
              }}
            >
              <Text style={{ color: theme.colors.text }}>{suggestion.fullAddress}</Text>
            </Pressable>
          ))}
          <Controller control={form.control} name="vrUrl" render={({ field }) => <TextInput style={fieldStyle} placeholder="https://capture.lumalabs.ai/..." value={field.value ?? ""} onChangeText={field.onChange} />} />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {amenityOptions.map((amenity) => {
              const selected = form.watch("amenities").includes(amenity);
              return (
                <Pressable
                  key={amenity}
                  onPress={() => {
                    const current = form.getValues("amenities");
                    form.setValue("amenities", selected ? current.filter((item) => item !== amenity) : [...current, amenity], { shouldValidate: true });
                  }}
                  style={[buttonStyle, { backgroundColor: selected ? theme.colors.accent : "white", borderWidth: selected ? 0 : 1, borderColor: theme.colors.border, paddingHorizontal: 14 }]}
                >
                  <Text style={{ color: selected ? "white" : theme.colors.text }}>{amenityLabels[amenity]}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {error ? <Text style={{ color: theme.colors.danger }}>{error}</Text> : null}

      <View style={{ flexDirection: "row", gap: 12 }}>
        {step > 1 ? (
          <Pressable style={[buttonStyle, secondaryButtonStyle, { flex: 1 }]} onPress={() => setStep(step - 1)}>
            <Text style={{ color: theme.colors.text }}>Back</Text>
          </Pressable>
        ) : null}
        {step < 3 ? (
          <Pressable style={[buttonStyle, { flex: 1 }]} onPress={() => setStep(step + 1)}>
            <Text style={buttonLabelStyle}>Next</Text>
          </Pressable>
        ) : (
          <Pressable style={[buttonStyle, { flex: 1 }]} onPress={() => void submit()}>
            <Text style={buttonLabelStyle}>{busy ? "Publishing..." : "Publish listing"}</Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}

const panelStyle = {
  backgroundColor: "rgba(255,253,250,0.96)",
  borderWidth: 1,
  borderColor: theme.colors.border,
  borderRadius: 26,
  padding: 20,
  gap: 14
} as const;

const fieldStyle = {
  borderWidth: 1,
  borderColor: theme.colors.border,
  borderRadius: 18,
  paddingHorizontal: 16,
  paddingVertical: 14,
  backgroundColor: "white",
  color: theme.colors.text
} as const;

const buttonStyle = {
  borderRadius: 999,
  paddingVertical: 15,
  paddingHorizontal: 18,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: theme.colors.accent
} as const;

const secondaryButtonStyle = {
  backgroundColor: "white",
  borderWidth: 1,
  borderColor: theme.colors.border
} as const;

const buttonLabelStyle = {
  color: "white",
  fontWeight: "700"
} as const;

const titleStyle = {
  fontSize: 26,
  fontWeight: "700",
  color: theme.colors.text
} as const;

const copyStyle = {
  color: theme.colors.textMuted
} as const;
