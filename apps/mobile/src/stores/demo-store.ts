import { create } from "zustand";
import type {
  ConversationListResponse,
  ConversationMessage,
  ConversationMessageListQuery,
  ConversationMessageListResponse,
  ConversationSummary,
  FeedQueryInput,
  FeedResponse,
  Listing,
  ListingInput,
  ListingUpdateInput,
  ListingSummary,
  ProfileUpdateInput,
  Report,
  ReportCreateInput,
  UserProfile
} from "@roomxchange/shared";
import {
  demoConversations,
  demoListings,
  demoMessagesByConversationId,
  demoSession,
  demoUserDirectory
} from "../demo-data";
import { useNotificationStore } from "./notification-store";

type DemoState = {
  profile: UserProfile;
  listings: Listing[];
  conversations: ConversationSummary[];
  messagesByConversationId: Record<string, ConversationMessage[]>;
  hiddenMessageIdsByConversationId: Record<string, string[]>;
  reports: Report[];
  publicPhoneByUserId: Record<string, boolean>;
  reset: () => void;
  getMe: () => UserProfile;
  updateProfile: (input: ProfileUpdateInput) => UserProfile;
  updatePhoneVisibility: (userId: string, isPublic: boolean) => void;
  getPhoneVisibility: (userId: string) => boolean;
  getPublisherDirectoryEntry: (userId: string) => { userId: string; name: string; avatar: string | null; phone: string | null; phonePublic: boolean } | null;
  getFeed: (query?: Partial<FeedQueryInput>) => FeedResponse;
  getListing: (listingId: string) => Listing | null;
  getUserListings: (userId: string) => ListingSummary[];
  createListing: (ownerId: string, input: ListingInput) => Listing;
  updateListing: (listingId: string, input: ListingUpdateInput) => Listing;
  deleteListing: (listingId: string) => void;
  getConversations: () => ConversationListResponse;
  markAllConversationsRead: () => { success: true };
  deleteConversation: (conversationId: string) => { success: true };
  getConversationMessages: (conversationId: string, query?: Partial<ConversationMessageListQuery>) => ConversationMessageListResponse;
  deleteConversationMessages: (userId: string, conversationId: string, messageIds: string[]) => { success: true };
  openConversation: (listingId: string) => ConversationSummary;
  sendConversationMessage: (senderId: string, conversationId: string, body: string) => ConversationMessage;
  getMyReports: () => Report[];
  createReport: (userId: string, input: ReportCreateInput) => Report;
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createUuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function getInitialState() {
  return {
    profile: clone(demoSession.user),
    listings: clone(demoListings),
    conversations: clone(demoConversations),
    messagesByConversationId: clone(demoMessagesByConversationId),
    hiddenMessageIdsByConversationId: {},
    reports: [] as Report[],
    publicPhoneByUserId: {
      [demoSession.user.userId]: false,
      ...Object.fromEntries(Object.values(demoUserDirectory).map((entry) => [entry.userId, entry.phonePublic]))
    }
  };
}

function toListingSummary(listing: Listing): ListingSummary {
  return {
    listingId: listing.listingId,
    ownerId: listing.ownerId,
    title: listing.title,
    propertyType: listing.propertyType,
    listingSubtype: listing.listingSubtype,
    price: listing.price,
    location: listing.location,
    lat: listing.lat,
    lng: listing.lng,
    previewImage: listing.previewImage,
    vrUrl: listing.vrUrl,
    amenities: listing.amenities,
    createdAt: listing.createdAt
  };
}

function sortByNewest<T extends { createdAt?: string; updatedAt?: string; lastMessageAt?: string }>(items: T[]) {
  return [...items].sort((left, right) => {
    const leftValue = left.updatedAt ?? left.lastMessageAt ?? left.createdAt ?? "";
    const rightValue = right.updatedAt ?? right.lastMessageAt ?? right.createdAt ?? "";
    return rightValue.localeCompare(leftValue);
  });
}

function listingMatchesQuery(listing: Listing, query: Partial<FeedQueryInput>) {
  const search = query.query?.trim().toLowerCase();
  if (search) {
    const haystack = `${listing.title} ${listing.location} ${listing.propertyType}`.toLowerCase();
    if (!haystack.includes(search)) {
      return false;
    }
  }

  if (query.location && !listing.location.toLowerCase().includes(query.location.trim().toLowerCase())) {
    return false;
  }

  if (query.propertyType && listing.propertyType !== query.propertyType) {
    return false;
  }

  if (query.listingSubtypes?.length && (!listing.listingSubtype || !query.listingSubtypes.includes(listing.listingSubtype))) {
    return false;
  }

  if (typeof query.minPrice === "number" && listing.price < query.minPrice) {
    return false;
  }

  if (typeof query.maxPrice === "number" && listing.price > query.maxPrice) {
    return false;
  }

  if (query.hasVr && !listing.vrUrl) {
    return false;
  }

  if ((query.amenities ?? []).length > 0 && !(query.amenities ?? []).every((amenity) => listing.amenities.includes(amenity))) {
    return false;
  }

  return true;
}

function getOwnerProfile(state: DemoState, ownerId: string) {
  if (ownerId === state.profile.userId) {
    return state.profile;
  }

  return demoListings.find((listing) => listing.ownerId === ownerId)?.ownerContact ?? null;
}

export const useDemoStore = create<DemoState>((set, get) => ({
  ...getInitialState(),
  reset: () => set(getInitialState()),
  getMe: () => clone(get().profile),
  updateProfile: (input) => {
    let nextProfile: UserProfile = clone(get().profile);

    set((state) => {
      nextProfile = {
        ...state.profile,
        name: input.name ?? state.profile.name,
        email: input.email ?? state.profile.email,
        avatar: input.avatar ?? state.profile.avatar,
        phonePublic: input.phonePublic ?? state.profile.phonePublic,
        updatedAt: new Date().toISOString()
      };

      return {
        profile: nextProfile,
        publicPhoneByUserId: {
          ...state.publicPhoneByUserId,
          [state.profile.userId]: nextProfile.phonePublic
        },
        listings: state.listings.map((listing) =>
          listing.ownerId === state.profile.userId
            ? {
                ...listing,
                ownerContact: {
                  ...listing.ownerContact,
                  name: nextProfile.name,
                  avatar: nextProfile.avatar,
                  phone: nextProfile.phonePublic ? nextProfile.phone : null,
                  phoneMasked: nextProfile.phonePublic ? "+233 **** 01" : "Hidden"
                }
              }
            : listing
        )
      };
    });

    return clone(nextProfile);
  },
  updatePhoneVisibility: (userId, isPublic) =>
    set((state) => ({
      publicPhoneByUserId: {
        ...state.publicPhoneByUserId,
        [userId]: isPublic
      },
      listings: state.listings.map((listing) =>
        listing.ownerId === userId
          ? {
              ...listing,
              ownerContact: {
                ...listing.ownerContact,
                phone: isPublic ? (userId === state.profile.userId ? state.profile.phone : listing.ownerContact.phone) : null,
                phoneMasked: isPublic ? "+233 **** 01" : "Hidden",
                canContact: true
              }
            }
          : listing
      )
    })),
  getPhoneVisibility: (userId) => Boolean(get().publicPhoneByUserId[userId]),
  getPublisherDirectoryEntry: (userId) => {
    const state = get();
    if (userId === state.profile.userId) {
      return {
        userId,
        name: state.profile.name,
        avatar: state.profile.avatar,
        phone: state.publicPhoneByUserId[userId] ? state.profile.phone : null,
        phonePublic: Boolean(state.publicPhoneByUserId[userId])
      };
    }

    const entry = demoUserDirectory[userId];
    if (!entry) {
      return null;
    }

    return {
      userId,
      name: entry.name,
      avatar: entry.avatar,
      phone: state.publicPhoneByUserId[userId] ? entry.phone : null,
      phonePublic: Boolean(state.publicPhoneByUserId[userId])
    };
  },
  getFeed: (query = {}) => {
    const limit = query.limit ?? 12;
    const items = sortByNewest(get().listings).filter((listing) => listingMatchesQuery(listing, query)).slice(0, limit).map(toListingSummary);
    return { items, nextCursor: null };
  },
  getListing: (listingId) => clone(get().listings.find((listing) => listing.listingId === listingId) ?? null),
  getUserListings: (userId) => sortByNewest(get().listings.filter((listing) => listing.ownerId === userId)).map(toListingSummary),
  createListing: (ownerId, input) => {
    const now = new Date().toISOString();
    const state = get();
    const ownerProfile = state.profile.userId === ownerId ? state.profile : null;
    const listing: Listing = {
      listingId: createUuid(),
      ownerId,
      title: input.title,
      propertyType: input.propertyType,
      listingSubtype: input.listingSubtype ?? null,
      price: input.price,
      location: input.location,
      lat: input.lat,
      lng: input.lng,
      images: input.images,
      previewImage: input.previewImage || input.images[0],
      vrUrl: input.vrUrl ?? null,
      description: input.description,
      amenities: input.amenities,
      mapboxPlaceId: input.mapboxPlaceId ?? null,
      status: input.status,
      createdAt: now,
      updatedAt: now,
      ownerContact: {
        name: ownerProfile?.name ?? "Property owner",
        avatar: ownerProfile?.avatar ?? null,
        phoneMasked: "+233 **** 01",
        phone: ownerProfile?.phonePublic ? ownerProfile.phone : null,
        canContact: true
      }
    };

    set((current) => ({
      listings: sortByNewest([listing, ...current.listings]),
      profile:
        current.profile.userId === ownerId
          ? {
              ...current.profile,
              listingsCount: current.profile.listingsCount + 1,
              updatedAt: now
            }
          : current.profile
    }));

    useNotificationStore.getState().evaluateListingsAgainstReminders([toListingSummary(listing)]);

    return clone(listing);
  },
  updateListing: (listingId, input) => {
    let updatedListing: Listing | null = null;
    set((state) => {
      const listings = state.listings.map((listing) => {
        if (listing.listingId !== listingId) {
          return listing;
        }

        updatedListing = {
          ...listing,
          ...input,
          listingSubtype: input.listingSubtype === undefined ? listing.listingSubtype : input.listingSubtype ?? null,
          images: input.images ?? listing.images,
          previewImage: input.previewImage ?? listing.previewImage,
          vrUrl: input.vrUrl === undefined ? listing.vrUrl : input.vrUrl ?? null,
          mapboxPlaceId: input.mapboxPlaceId === undefined ? listing.mapboxPlaceId : input.mapboxPlaceId ?? null,
          updatedAt: new Date().toISOString()
        };
        return updatedListing!;
      });
      return { listings };
    });

    if (!updatedListing) {
      throw new Error("Listing not found.");
    }

    return clone(updatedListing);
  },
  deleteListing: (listingId) =>
    set((state) => ({
      listings: state.listings.filter((listing) => listing.listingId !== listingId),
      conversations: state.conversations.filter((conversation) => conversation.listingId !== listingId)
    })),
  getConversations: () => ({
    items: sortByNewest(get().conversations).map((conversation) => clone(conversation))
  }),
  markAllConversationsRead: () => {
    set((state) => ({
      conversations: state.conversations.map((conversation) => ({
        ...conversation,
        unreadCount: 0
      }))
    }));

    return { success: true as const };
  },
  deleteConversation: (conversationId) => {
    set((state) => {
      const nextConversations = state.conversations.filter((conversation) => conversation.conversationId !== conversationId);
      const nextMessages = { ...state.messagesByConversationId };
      const nextHidden = { ...state.hiddenMessageIdsByConversationId };
      delete nextMessages[conversationId];
      delete nextHidden[conversationId];
      return {
        conversations: nextConversations,
        messagesByConversationId: nextMessages,
        hiddenMessageIdsByConversationId: nextHidden
      };
    });

    return { success: true as const };
  },
  getConversationMessages: (conversationId, query = {}) => {
    const limit = query.limit ?? 30;
    const hiddenIds = new Set(get().hiddenMessageIdsByConversationId[conversationId] ?? []);
    return {
      items: [...(get().messagesByConversationId[conversationId] ?? [])]
        .filter((message) => !hiddenIds.has(message.messageId))
        .slice(-limit)
        .map((message) => clone(message)),
      nextCursor: null
    };
  },
  deleteConversationMessages: (_userId, conversationId, messageIds) => {
    set((state) => {
      const currentMessages = state.messagesByConversationId[conversationId] ?? [];
      const hiddenMessageIds = Array.from(
        new Set([...(state.hiddenMessageIdsByConversationId[conversationId] ?? []), ...messageIds])
      );
      const filteredMessages = currentMessages.filter((message) => !hiddenMessageIds.includes(message.messageId));
      const lastMessage = filteredMessages.at(-1);

      return {
        conversations: sortByNewest(
          state.conversations.map((conversation) =>
            conversation.conversationId === conversationId
              ? {
                  ...conversation,
                  lastMessagePreview: lastMessage?.body ?? "Conversation started",
                  lastMessageAt: lastMessage?.createdAt ?? conversation.createdAt,
                  updatedAt: new Date().toISOString()
                }
              : conversation
          )
        ),
        messagesByConversationId: {
          ...state.messagesByConversationId,
          [conversationId]: filteredMessages
        },
        hiddenMessageIdsByConversationId: {
          ...state.hiddenMessageIdsByConversationId,
          [conversationId]: hiddenMessageIds
        }
      };
    });

    return { success: true as const };
  },
  openConversation: (listingId) => {
    const state = get();
    const listing = state.listings.find((item) => item.listingId === listingId);
    if (!listing) {
      throw new Error("Listing not found.");
    }

    const existing =
      state.conversations.find((conversation) => conversation.listingId === listingId) ??
      state.conversations.find((conversation) => conversation.participant.userId === listing.ownerId);
    if (existing) {
      return clone(existing);
    }

    const owner = getOwnerProfile(state, listing.ownerId);
    const createdAt = new Date().toISOString();
    const conversation: ConversationSummary = {
      conversationId: `demo-conversation-${Date.now()}`,
      listingId: listing.listingId,
      listingTitle: listing.title,
      listingPreviewImage: listing.previewImage,
      participant: {
        userId: listing.ownerId,
        name: owner?.name ?? listing.ownerContact.name,
        avatar: owner?.avatar ?? listing.ownerContact.avatar
      },
      lastMessagePreview: "Conversation started.",
      lastMessageAt: createdAt,
      unreadCount: 0,
      createdAt,
      updatedAt: createdAt
    };

    set((current) => ({
      conversations: sortByNewest([conversation, ...current.conversations]),
      messagesByConversationId: {
        ...current.messagesByConversationId,
        [conversation.conversationId]: []
      },
      hiddenMessageIdsByConversationId: {
        ...current.hiddenMessageIdsByConversationId,
        [conversation.conversationId]: []
      }
    }));

    return clone(conversation);
  },
  sendConversationMessage: (senderId, conversationId, body) => {
    const state = get();
    const conversation = state.conversations.find((item) => item.conversationId === conversationId);
    if (!conversation) {
      throw new Error("Conversation not found.");
    }

    const message: ConversationMessage = {
      messageId: createUuid(),
      conversationId,
      listingId: conversation.listingId,
      senderId,
      body,
      createdAt: new Date().toISOString()
    };

    const nextConversation: ConversationSummary = {
      ...conversation,
      lastMessagePreview: body,
      lastMessageAt: message.createdAt,
      updatedAt: message.createdAt,
      unreadCount: 0
    };

    set((current) => ({
      conversations: sortByNewest(current.conversations.map((item) => (item.conversationId === conversationId ? nextConversation : item))),
      messagesByConversationId: {
        ...current.messagesByConversationId,
        [conversationId]: [...(current.messagesByConversationId[conversationId] ?? []), message]
      }
    }));

    return clone(message);
  },
  getMyReports: () => clone(get().reports),
  createReport: (userId, input) => {
    const report: Report = {
      reportId: createUuid(),
      listingId: input.listingId,
      reporterId: userId,
      targetUserId: input.targetUserId,
      reason: input.reason,
      status: "open",
      resolutionNote: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    set((state) => ({
      reports: [report, ...state.reports]
    }));

    return clone(report);
  }
}));

export function resetDemoStore() {
  useDemoStore.getState().reset();
}
