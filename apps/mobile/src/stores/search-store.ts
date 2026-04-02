import { create } from "zustand";
import type { FeedQueryInput } from "@roomxchange/shared";

export type SearchFilters = {
  location: string;
  propertyType: "all" | "room" | "apartment";
  listingSubtypes: ("studio" | "single_room_sc" | "one_bedroom" | "two_bedroom_plus")[];
  minPrice: number;
  maxPrice: number;
  hasVr: boolean;
};

type SearchState = {
  locationLabel: string;
  query: string;
  location: SearchFilters["location"];
  propertyType: SearchFilters["propertyType"];
  listingSubtypes: SearchFilters["listingSubtypes"];
  minPrice: SearchFilters["minPrice"];
  maxPrice: SearchFilters["maxPrice"];
  hasVr: SearchFilters["hasVr"];
  setLocationLabel: (value: string) => void;
  setQuery: (value: string) => void;
  setLocation: (value: string) => void;
  setPropertyType: (value: "all" | "room" | "apartment") => void;
  toggleListingSubtype: (value: SearchState["listingSubtypes"][number]) => void;
  setPriceRange: (minPrice: number, maxPrice: number) => void;
  setHasVr: (value: boolean) => void;
  setFilters: (value: SearchFilters) => void;
  resetFilters: () => void;
  getActiveFilterCount: () => number;
  toFeedQuery: () => Partial<FeedQueryInput>;
};

const defaultSearchFilters: SearchFilters = {
  location: "",
  propertyType: "all",
  listingSubtypes: [],
  minPrice: 0,
  maxPrice: 6000,
  hasVr: false
};

const defaultFilters = {
  locationLabel: "Accra",
  query: "",
  ...defaultSearchFilters
};

export const useSearchStore = create<SearchState>((set, get) => ({
  ...defaultFilters,
  setLocationLabel: (value) => set({ locationLabel: value }),
  setQuery: (value) => set({ query: value }),
  setLocation: (value) =>
    set({
      location: value,
      locationLabel: value.trim() || "Accra"
      }),
  setPropertyType: (value) => set({ propertyType: value }),
  toggleListingSubtype: (value) =>
    set((state) => ({
      listingSubtypes: state.listingSubtypes.includes(value)
        ? state.listingSubtypes.filter((item) => item !== value)
        : [...state.listingSubtypes, value]
    })),
  setPriceRange: (minPrice, maxPrice) =>
    set({
      minPrice,
      maxPrice
    }),
  setHasVr: (value) => set({ hasVr: value }),
  setFilters: (value) =>
    set({
      ...value,
      locationLabel: value.location.trim() || "Accra"
    }),
  resetFilters: () => set({ ...defaultFilters }),
  getActiveFilterCount: () => {
    const { location, propertyType, listingSubtypes, minPrice, maxPrice, hasVr } = get();
    return [location.trim().length > 0, propertyType !== "all", listingSubtypes.length > 0, minPrice > 0, maxPrice < 6000, hasVr].filter(Boolean).length;
  },
  toFeedQuery: () => {
    const { query, location, propertyType, listingSubtypes, minPrice, maxPrice, hasVr } = get();
    return {
      query: query.trim() || undefined,
      location: location.trim() || undefined,
      propertyType: propertyType === "all" ? undefined : propertyType,
      listingSubtypes: listingSubtypes.length ? listingSubtypes : undefined,
      minPrice: minPrice > 0 ? minPrice : undefined,
      maxPrice: maxPrice < 6000 ? maxPrice : undefined,
      hasVr: hasVr || undefined
    };
  }
}));
