import { Image as RNImage } from "react-native";
import type { AuthSession, ConversationMessage, ConversationSummary, Listing, ListingSummary, UserProfile } from "@roomxchange/shared";

const testUser: UserProfile = {
  userId: "6b1d0d8c-5650-4703-b6d4-20b8c2579e11",
  phone: "+233240000001",
  name: "Abbas Demo",
  avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
  email: "abbas.demo@roomxchange.dev",
  phonePublic: false,
  role: "super_admin",
  accountStatus: "active",
  isSubscribed: true,
  subscriptionStatus: "active",
  subscriptionProvider: "roomxchange-dev",
  subscriptionPlan: "demo",
  subscriptionExpiresAt: "2027-03-24T00:00:00.000Z",
  listingsCount: 2,
  successfulListings: 1,
  createdAt: "2026-03-24T08:30:00.000Z",
  updatedAt: "2026-03-24T08:30:00.000Z"
};

const owners: Record<string, { name: string; avatar: string; phone: string }> = {
  "f7e7b52a-1c14-4eb4-98bd-5737cded6f01": {
    name: "Ama Ofori",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80",
    phone: "+233240000002"
  },
  "1cf4c7b7-c7a7-4d3f-8ca1-2d9d3743d8d9": {
    name: "Kojo Mensah",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80",
    phone: "+233240000003"
  },
  "305ef7fe-b253-4b9b-9087-879a846e9b47": {
    name: "Naa Dedei",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",
    phone: "+233240000004"
  }
};

export const demoUserDirectory = {
  [testUser.userId]: {
    userId: testUser.userId,
    name: testUser.name,
    avatar: testUser.avatar,
    phone: testUser.phone,
    phonePublic: false
  },
  ...Object.fromEntries(
    Object.entries(owners).map(([userId, owner]) => [
      userId,
      {
        userId,
        name: owner.name,
        avatar: owner.avatar,
        phone: owner.phone,
        phonePublic: true
      }
    ])
  )
} as const;

function assetUri(module: number) {
  return RNImage.resolveAssetSource(module).uri;
}

const demoAssetUris = {
  a: assetUri(require("./assets/demo/download (7).jpg")),
  b: assetUri(require("./assets/demo/download (8).jpg")),
  c: assetUri(require("./assets/demo/download (9).jpg")),
  d: assetUri(require("./assets/demo/download (10).jpg")),
  e: assetUri(require("./assets/demo/download (11).jpg")),
  f: assetUri(require("./assets/demo/download (12).jpg")),
  g: assetUri(require("./assets/demo/download (13).jpg"))
};

const listingBase = [
  {
    listingId: "f00dcafe-1000-4000-8000-000000000001",
    ownerId: "f7e7b52a-1c14-4eb4-98bd-5737cded6f01",
    title: "Sunlit Ensuite Room Near Osu Oxford Street",
    propertyType: "room" as const,
    listingSubtype: "single_room_sc" as const,
    price: 1200,
    location: "Osu, Accra",
    lat: 5.5601,
    lng: -0.1823,
    images: [demoAssetUris.a, demoAssetUris.b, demoAssetUris.c],
    vrUrl: "https://poly.cam/capture/demo-roomxchange-osu",
    description: "A bright, furnished ensuite in the heart of Osu with fast Wi-Fi, air conditioning, and quick access to nightlife and transport.",
    amenities: ["wifi", "air_conditioning", "workspace", "vr_ready"] as const,
    createdAt: "2026-03-24T08:00:00.000Z"
  },
  {
    listingId: "f00dcafe-1000-4000-8000-000000000002",
    ownerId: "1cf4c7b7-c7a7-4d3f-8ca1-2d9d3743d8d9",
    title: "Modern 1 Bedroom Apartment in East Legon",
    propertyType: "apartment" as const,
    listingSubtype: "one_bedroom" as const,
    price: 2300,
    location: "East Legon, Accra",
    lat: 5.6396,
    lng: -0.1537,
    images: [demoAssetUris.d, demoAssetUris.e, demoAssetUris.f],
    vrUrl: null,
    description: "A polished one-bedroom apartment with a clean kitchen, secure parking, and a calm residential setting near restaurants and shopping.",
    amenities: ["wifi", "parking", "kitchen", "laundry"] as const,
    createdAt: "2026-03-24T07:50:00.000Z"
  },
  {
    listingId: "f00dcafe-1000-4000-8000-000000000003",
    ownerId: "305ef7fe-b253-4b9b-9087-879a846e9b47",
    title: "Budget Room With Shared Kitchen in Madina",
    propertyType: "room" as const,
    listingSubtype: "single_room_sc" as const,
    price: 650,
    location: "Madina, Accra",
    lat: 5.6814,
    lng: -0.1647,
    images: [demoAssetUris.g, demoAssetUris.a],
    vrUrl: null,
    description: "An affordable private room with practical storage, shared kitchen access, and reliable utilities in a well-connected neighborhood.",
    amenities: ["wifi", "kitchen", "laundry"] as const,
    createdAt: "2026-03-24T07:35:00.000Z"
  },
  {
    listingId: "f00dcafe-1000-4000-8000-000000000004",
    ownerId: testUser.userId,
    title: "Rooftop Studio With Pool Access in Cantonments",
    propertyType: "apartment" as const,
    listingSubtype: "studio" as const,
    price: 3100,
    location: "Cantonments, Accra",
    lat: 5.5726,
    lng: -0.1672,
    images: [demoAssetUris.b, demoAssetUris.e, demoAssetUris.g],
    vrUrl: "https://lumalabs.ai/capture/demo-roomxchange-cantonments",
    description: "A premium studio designed for young professionals, with strong natural light, pool access, and a polished finish throughout.",
    amenities: ["wifi", "pool", "workspace", "air_conditioning", "vr_ready"] as const,
    createdAt: "2026-03-24T07:10:00.000Z"
  },
  {
    listingId: "f00dcafe-1000-4000-8000-000000000005",
    ownerId: "f7e7b52a-1c14-4eb4-98bd-5737cded6f01",
    title: "Quiet Compound Room Near Airport Residential",
    propertyType: "room" as const,
    listingSubtype: "single_room_sc" as const,
    price: 1450,
    location: "Osu, Accra",
    lat: 5.5576,
    lng: -0.1829,
    images: [demoAssetUris.c, demoAssetUris.d],
    vrUrl: null,
    description: "A calm private room inside a secure compound with dependable utilities, easy ride access, and strong work-from-home comfort.",
    amenities: ["wifi", "workspace", "parking"] as const,
    createdAt: "2026-03-24T06:55:00.000Z"
  },
  {
    listingId: "f00dcafe-1000-4000-8000-000000000006",
    ownerId: "1cf4c7b7-c7a7-4d3f-8ca1-2d9d3743d8d9",
    title: "Furnished Apartment Close to UPSA",
    propertyType: "apartment" as const,
    listingSubtype: "one_bedroom" as const,
    price: 2600,
    location: "East Legon, Accra",
    lat: 5.6418,
    lng: -0.1505,
    images: [demoAssetUris.f, demoAssetUris.g, demoAssetUris.b],
    vrUrl: null,
    description: "A furnished apartment with a practical layout, neat finishes, and quick access to campus, shops, and key city routes.",
    amenities: ["wifi", "parking", "laundry", "air_conditioning"] as const,
    createdAt: "2026-03-24T06:42:00.000Z"
  },
  {
    listingId: "f00dcafe-1000-4000-8000-000000000007",
    ownerId: "305ef7fe-b253-4b9b-9087-879a846e9b47",
    title: "Compact Starter Room in Dansoman",
    propertyType: "room" as const,
    listingSubtype: "single_room_sc" as const,
    price: 700,
    location: "Cantonments, Accra",
    lat: 5.5715,
    lng: -0.1665,
    images: [demoAssetUris.a, demoAssetUris.f],
    vrUrl: null,
    description: "A compact but polished room for first-time renters looking for clean basics, affordable pricing, and a neighborhood with good transport links.",
    amenities: ["wifi", "kitchen"] as const,
    createdAt: "2026-03-24T06:18:00.000Z"
  },
  {
    listingId: "f00dcafe-1000-4000-8000-000000000008",
    ownerId: testUser.userId,
    title: "Bright Two-Room Flat in Spintex With Parking",
    propertyType: "apartment" as const,
    listingSubtype: "two_bedroom_plus" as const,
    price: 2800,
    location: "Spintex, Accra",
    lat: 5.6224,
    lng: -0.0958,
    images: [demoAssetUris.d, demoAssetUris.e, demoAssetUris.c],
    vrUrl: null,
    description: "A bright two-room flat with secure parking, practical storage, and a straightforward commute for professionals working around Spintex Road.",
    amenities: ["wifi", "parking", "kitchen", "workspace"] as const,
    createdAt: "2026-03-24T06:00:00.000Z"
  }
] as const;

export const demoListings: Listing[] = listingBase.map((listing) => ({
  ...listing,
  images: [...listing.images],
  amenities: [...listing.amenities],
  previewImage: listing.images[0],
  mapboxPlaceId: null,
  status: "published",
  updatedAt: listing.createdAt,
  ownerContact:
    listing.ownerId === testUser.userId
      ? {
          name: testUser.name,
          avatar: testUser.avatar,
          phoneMasked: "+233 **** 01",
          phone: testUser.phone,
          canContact: true
        }
      : {
          name: owners[listing.ownerId].name,
          avatar: owners[listing.ownerId].avatar,
          phoneMasked: "+233 **** 02",
          phone: owners[listing.ownerId].phone,
          canContact: true
        }
}));

export const demoListingSummaries: ListingSummary[] = demoListings.map(({ ownerContact, images, description, mapboxPlaceId, status, updatedAt, ...summary }) => summary);

export const demoSession: AuthSession = {
  user: testUser,
  tokens: {
    accessToken: "demo.local.access-token",
    idToken: "demo.local.id-token",
    refreshToken: "demo.local.refresh-token",
    expiresIn: 86400
  }
};

export const demoConversations: ConversationSummary[] = [
  {
    conversationId: "demo-conversation-0001",
    listingId: demoListings[0].listingId,
    listingTitle: demoListings[0].title,
    listingPreviewImage: demoListings[0].previewImage,
    participant: {
      userId: demoListings[0].ownerId,
      name: owners[demoListings[0].ownerId].name,
      avatar: owners[demoListings[0].ownerId].avatar
    },
    lastMessagePreview: "Perfect. I would like to visit after work and confirm the move-in date.",
    lastMessageAt: "2026-03-24T08:10:00.000Z",
    unreadCount: 0,
    createdAt: "2026-03-24T08:00:00.000Z",
    updatedAt: "2026-03-24T08:10:00.000Z"
  },
  {
    conversationId: "demo-conversation-0002",
    listingId: demoListings[1].listingId,
    listingTitle: demoListings[1].title,
    listingPreviewImage: demoListings[1].previewImage,
    participant: {
      userId: demoListings[1].ownerId,
      name: owners[demoListings[1].ownerId].name,
      avatar: owners[demoListings[1].ownerId].avatar
    },
    lastMessagePreview: "I can share a video walkthrough tonight if you want a closer look first.",
    lastMessageAt: "2026-03-24T09:00:00.000Z",
    unreadCount: 1,
    createdAt: "2026-03-24T08:45:00.000Z",
    updatedAt: "2026-03-24T09:00:00.000Z"
  }
];

export const demoMessagesByConversationId: Record<string, ConversationMessage[]> = {
  "demo-conversation-0001": [
    {
      messageId: "1d0b4844-1b7d-4aab-92f8-e44278d71111",
      conversationId: "demo-conversation-0001",
      listingId: demoListings[0].listingId,
      senderId: demoListings[0].ownerId,
      body: "Hi Abbas, the room is available this week and viewings can start tomorrow afternoon.",
      createdAt: "2026-03-24T08:05:00.000Z"
    },
    {
      messageId: "1d0b4844-1b7d-4aab-92f8-e44278d72222",
      conversationId: "demo-conversation-0001",
      listingId: demoListings[0].listingId,
      senderId: testUser.userId,
      body: "Perfect. I would like to visit after work and confirm the move-in date.",
      createdAt: "2026-03-24T08:10:00.000Z"
    }
  ],
  "demo-conversation-0002": [
    {
      messageId: "1d0b4844-1b7d-4aab-92f8-e44278d73333",
      conversationId: "demo-conversation-0002",
      listingId: demoListings[1].listingId,
      senderId: testUser.userId,
      body: "Is the apartment available from next month?",
      createdAt: "2026-03-24T08:52:00.000Z"
    },
    {
      messageId: "1d0b4844-1b7d-4aab-92f8-e44278d74444",
      conversationId: "demo-conversation-0002",
      listingId: demoListings[1].listingId,
      senderId: demoListings[1].ownerId,
      body: "I can share a video walkthrough tonight if you want a closer look first.",
      createdAt: "2026-03-24T09:00:00.000Z"
    }
  ]
};

export function isDemoSession(session: AuthSession | null) {
  return session?.user.userId === demoSession.user.userId;
}

export function getDemoListing(listingId: string) {
  return demoListings.find((listing) => listing.listingId === listingId) ?? null;
}
