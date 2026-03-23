"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { amenitySchema, listingInputSchema, type ListingInput } from "@roomxchange/contracts";
import { amenityLabels, buildMapboxSearchUrl, buildStaticMapUrl } from "@roomxchange/shared";
import { useSession } from "./session-provider";

type Suggestion = {
  id: string;
  name: string;
  fullAddress: string;
  lat: number;
  lng: number;
};

const amenityOptions = amenitySchema.options;

export function ListingForm({
  defaultValues,
  submitLabel,
  onSubmit
}: {
  defaultValues?: Partial<ListingInput>;
  submitLabel: string;
  onSubmit: (values: ListingInput) => Promise<void>;
}) {
  const { api } = useSession();
  const [uploading, setUploading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const form = useForm<ListingInput>({
    resolver: zodResolver(listingInputSchema),
    defaultValues: {
      title: defaultValues?.title ?? "",
      price: defaultValues?.price ?? 0,
      location: defaultValues?.location ?? "",
      lat: defaultValues?.lat ?? 0,
      lng: defaultValues?.lng ?? 0,
      images: defaultValues?.images ?? [],
      previewImage: defaultValues?.previewImage ?? "",
      vrUrl: defaultValues?.vrUrl ?? undefined,
      description: defaultValues?.description ?? "",
      amenities: defaultValues?.amenities ?? [],
      mapboxPlaceId: defaultValues?.mapboxPlaceId ?? undefined,
      status: defaultValues?.status ?? "published"
    }
  });

  const location = form.watch("location");
  const images = form.watch("images");
  const lat = form.watch("lat");
  const lng = form.watch("lng");

  useEffect(() => {
    const controller = new AbortController();
    if (!location || location.length < 3) {
      setSuggestions([]);
      return () => controller.abort();
    }

    fetch(buildMapboxSearchUrl(location), { signal: controller.signal })
      .then((response) => response.json())
      .then((payload) => {
        const nextSuggestions = (payload.features ?? []).map((feature: any) => ({
          id: feature.properties?.mapbox_id ?? feature.id,
          name: feature.properties?.name ?? feature.properties?.full_address ?? location,
          fullAddress: feature.properties?.full_address ?? feature.place_name ?? location,
          lat: feature.geometry?.coordinates?.[1] ?? 0,
          lng: feature.geometry?.coordinates?.[0] ?? 0
        }));
        setSuggestions(nextSuggestions);
      })
      .catch(() => setSuggestions([]));

    return () => controller.abort();
  }, [location]);

  const uploadFiles = async (files: FileList | null) => {
    if (!files?.length) {
      return;
    }

    setUploading(true);
    try {
      const uploaded = [...images];
      for (const file of Array.from(files)) {
        const presign = await api.createUpload({
          fileName: file.name,
          contentType: file.type as "image/jpeg" | "image/png" | "image/webp"
        });
        await fetch(presign.uploadUrl, {
          method: "PUT",
          headers: presign.headers,
          body: file
        });
        uploaded.push(presign.fileUrl);
      }
      form.setValue("images", uploaded, { shouldValidate: true });
      if (!form.getValues("previewImage") && uploaded[0]) {
        form.setValue("previewImage", uploaded[0], { shouldValidate: true });
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <form
      className="card"
      style={{ padding: 24, display: "grid", gap: 16 }}
      onSubmit={form.handleSubmit(async (values) => {
        await onSubmit(values);
      })}
    >
      <div className="form-grid">
        <label className="field full">
          <span>Title</span>
          <input placeholder="Forest-edge A-frame with deck" {...form.register("title")} />
        </label>
        <label className="field">
          <span>Nightly price</span>
          <input type="number" min={0} step={1} {...form.register("price", { valueAsNumber: true })} />
        </label>
        <label className="field">
          <span>Status</span>
          <select {...form.register("status")}>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </label>
        <label className="field full">
          <span>Location</span>
          <input placeholder="Berkeley Springs, West Virginia" {...form.register("location")} />
        </label>
        {suggestions.length ? (
          <div className="full card" style={{ padding: 12, display: "grid", gap: 8 }}>
            {suggestions.slice(0, 4).map((suggestion) => (
              <button
                key={suggestion.id}
                className="button secondary"
                type="button"
                onClick={() => {
                  form.setValue("location", suggestion.fullAddress, { shouldValidate: true });
                  form.setValue("lat", suggestion.lat, { shouldValidate: true });
                  form.setValue("lng", suggestion.lng, { shouldValidate: true });
                  form.setValue("mapboxPlaceId", suggestion.id, { shouldValidate: true });
                  setSuggestions([]);
                }}
                style={{ justifyContent: "flex-start" }}
              >
                {suggestion.fullAddress}
              </button>
            ))}
          </div>
        ) : null}
        <label className="field">
          <span>VR tour URL</span>
          <input placeholder="https://capture.lumalabs.ai/..." {...form.register("vrUrl")} />
        </label>
        <label className="field">
          <span>Preview image URL</span>
          <input placeholder="Auto-filled from upload" {...form.register("previewImage")} />
        </label>
        <label className="field full">
          <span>Description</span>
          <textarea placeholder="Describe the space, neighborhood, and what makes the stay special." {...form.register("description")} />
        </label>
        <label className="field full">
          <span>Upload images</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => uploadFiles(event.target.files)} />
          <span className="muted">{uploading ? "Uploading to S3..." : `${images.length} image(s) ready`}</span>
        </label>
        <div className="field full">
          <span>Amenities</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {amenityOptions.map((amenity) => {
              const selected = form.watch("amenities").includes(amenity);
              return (
                <button
                  key={amenity}
                  type="button"
                  className={selected ? "button" : "button secondary"}
                  onClick={() => {
                    const current = form.getValues("amenities");
                    form.setValue(
                      "amenities",
                      selected ? current.filter((item) => item !== amenity) : [...current, amenity],
                      { shouldValidate: true }
                    );
                  }}
                >
                  {amenityLabels[amenity]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {lat && lng ? (
        <div className="card" style={{ overflow: "hidden" }}>
          {buildStaticMapUrl(lat, lng) ? <img src={buildStaticMapUrl(lat, lng)!} alt="Map preview" /> : null}
        </div>
      ) : null}

      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <span className="muted">Web checkout only. Mobile stays outside payment flows.</span>
        <button className="button" type="submit" disabled={uploading}>
          {uploading ? "Uploading..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
