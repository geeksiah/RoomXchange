import { Buffer } from "node:buffer";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import type { AuthSession, ListingSummary, UserProfile } from "@roomxchange/contracts";
import { db } from "./aws.js";
import { openConversation, sendConversationMessage } from "./conversations.js";
import { env } from "./config.js";
import type { ListingFeedItem, ListingItem, ListingLookupItem, UserItem } from "./domain.js";
import { subscriptionOperationalIndex, tableKeys } from "./keys.js";

const testUser = {
  userId: "6b1d0d8c-5650-4703-b6d4-20b8c2579e11",
  phone: "+233240000001",
  name: "Abbas Demo",
  avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
  email: "abbas.demo@roomxchange.dev",
  phonePublic: false
} as const;

const owners = [
  {
    userId: "f7e7b52a-1c14-4eb4-98bd-5737cded6f01",
    phone: "+233240000002",
    name: "Ama Ofori",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80",
    email: "ama.ofori@roomxchange.dev"
  },
  {
    userId: "1cf4c7b7-c7a7-4d3f-8ca1-2d9d3743d8d9",
    phone: "+233240000003",
    name: "Kojo Mensah",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80",
    email: "kojo.mensah@roomxchange.dev"
  },
  {
    userId: "305ef7fe-b253-4b9b-9087-879a846e9b47",
    phone: "+233240000004",
    name: "Naa Dedei",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",
    email: "naa.dedei@roomxchange.dev"
  }
] as const;

const rawListings = [
  {
    listingId: "f00dcafe-1000-4000-8000-000000000001",
    ownerId: owners[0].userId,
    title: "Sunlit Ensuite Room Near Osu Oxford Street",
    propertyType: "room" as const,
    listingSubtype: "single_room_sc" as const,
    price: 1200,
    location: "Osu, Accra",
    lat: 5.5601,
    lng: -0.1823,
    imageNames: ["download (7).jpg", "download (8).jpg", "download (9).jpg"],
    vrUrl: "https://poly.cam/capture/demo-roomxchange-osu",
    description:
      "A bright, furnished ensuite in the heart of Osu with fast Wi-Fi, air conditioning, and easy access to cafes, nightlife, and major transport links.",
    amenities: ["wifi", "air_conditioning", "workspace", "vr_ready"] as const,
    createdAt: "2026-03-24T08:00:00.000Z"
  },
  {
    listingId: "f00dcafe-1000-4000-8000-000000000002",
    ownerId: owners[1].userId,
    title: "Modern 1 Bedroom Apartment in East Legon",
    propertyType: "apartment" as const,
    listingSubtype: "one_bedroom" as const,
    price: 2300,
    location: "East Legon, Accra",
    lat: 5.6396,
    lng: -0.1537,
    imageNames: ["download (10).jpg", "download (11).jpg", "download (12).jpg"],
    vrUrl: null,
    description:
      "A polished one-bedroom apartment with a clean kitchen, secure parking, and a calm residential setting close to restaurants and shopping.",
    amenities: ["wifi", "parking", "kitchen", "laundry"] as const,
    createdAt: "2026-03-24T07:50:00.000Z"
  },
  {
    listingId: "f00dcafe-1000-4000-8000-000000000003",
    ownerId: owners[2].userId,
    title: "Budget Room With Shared Kitchen in Madina",
    propertyType: "room" as const,
    listingSubtype: "single_room_sc" as const,
    price: 650,
    location: "Madina, Accra",
    lat: 5.6814,
    lng: -0.1647,
    imageNames: ["download (13).jpg", "download (7).jpg"],
    vrUrl: null,
    description:
      "An affordable private room with practical storage, shared kitchen access, and reliable utility coverage in a busy, well-connected neighborhood.",
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
    imageNames: ["download (8).jpg", "download (11).jpg", "download (13).jpg"],
    vrUrl: "https://lumalabs.ai/capture/demo-roomxchange-cantonments",
    description:
      "A premium studio designed for young professionals, with a rooftop feel, pool access, strong natural light, and a polished finish throughout.",
    amenities: ["wifi", "pool", "workspace", "air_conditioning", "vr_ready"] as const,
    createdAt: "2026-03-24T07:10:00.000Z"
  },
  {
    listingId: "f00dcafe-1000-4000-8000-000000000005",
    ownerId: owners[0].userId,
    title: "Quiet Compound Room Near Airport Residential",
    propertyType: "room" as const,
    listingSubtype: "single_room_sc" as const,
    price: 1450,
    location: "Osu, Accra",
    lat: 5.5576,
    lng: -0.1829,
    imageNames: ["download (9).jpg", "download (10).jpg"],
    vrUrl: null,
    description:
      "A calm private room inside a secure compound with dependable utilities, easy ride access, and strong work-from-home comfort.",
    amenities: ["wifi", "workspace", "parking"] as const,
    createdAt: "2026-03-24T06:55:00.000Z"
  },
  {
    listingId: "f00dcafe-1000-4000-8000-000000000006",
    ownerId: owners[1].userId,
    title: "Furnished Apartment Close to UPSA",
    propertyType: "apartment" as const,
    listingSubtype: "one_bedroom" as const,
    price: 2600,
    location: "East Legon, Accra",
    lat: 5.6418,
    lng: -0.1505,
    imageNames: ["download (12).jpg", "download (13).jpg", "download (8).jpg"],
    vrUrl: null,
    description:
      "A furnished apartment with a practical layout, neat finishes, and quick access to campus, shops, and key city routes.",
    amenities: ["wifi", "parking", "laundry", "air_conditioning"] as const,
    createdAt: "2026-03-24T06:42:00.000Z"
  },
  {
    listingId: "f00dcafe-1000-4000-8000-000000000007",
    ownerId: owners[2].userId,
    title: "Compact Starter Room in Dansoman",
    propertyType: "room" as const,
    listingSubtype: "single_room_sc" as const,
    price: 700,
    location: "Cantonments, Accra",
    lat: 5.5715,
    lng: -0.1665,
    imageNames: ["download (7).jpg", "download (12).jpg"],
    vrUrl: null,
    description:
      "A compact but polished room for first-time renters looking for clean basics, affordable pricing, and a neighborhood with good transport links.",
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
    imageNames: ["download (10).jpg", "download (11).jpg", "download (9).jpg"],
    vrUrl: null,
    description:
      "A bright two-room flat with secure parking, practical storage, and a straightforward commute for professionals working around Spintex Road.",
    amenities: ["wifi", "parking", "kitchen", "workspace"] as const,
    createdAt: "2026-03-24T06:00:00.000Z"
  }
] as const;

function toProfile(values: typeof testUser | (typeof owners)[number], listingsCount: number): UserProfile {
  const now = "2026-03-24T08:30:00.000Z";
  return {
    userId: values.userId,
    phone: values.phone,
    name: values.name,
    avatar: values.avatar,
    email: values.email,
    phonePublic: "phonePublic" in values ? values.phonePublic : true,
    role: values.userId === testUser.userId ? "super_admin" : "member",
    accountStatus: "active",
    isSubscribed: true,
    subscriptionStatus: "active",
    subscriptionProvider: "roomxchange-dev",
    subscriptionPlan: "demo",
    subscriptionExpiresAt: "2027-03-24T00:00:00.000Z",
    listingsCount,
    successfulListings: 1,
    createdAt: now,
    updatedAt: now
  };
}

function toUserItem(profile: UserProfile): UserItem {
  return {
    ...tableKeys.user(profile.userId),
    entity: "USER",
    ...profile,
    ...subscriptionOperationalIndex(profile.subscriptionStatus, profile.subscriptionExpiresAt, profile.userId),
    paystackCustomerCode: null,
    paystackSubscriptionCode: null
  };
}

function createFakeJwt(payload: Record<string, string>) {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.roomxchange-dev`;
}

function buildSession(profile: UserProfile): AuthSession {
  const tokenPayload = {
    sub: profile.userId,
    phone_number: profile.phone,
    name: profile.name,
    email: profile.email ?? ""
  };
  const accessToken = createFakeJwt(tokenPayload);
  const idToken = createFakeJwt(tokenPayload);

  return {
    user: profile,
    tokens: {
      accessToken,
      idToken,
      refreshToken: "roomxchange-dev-refresh-token",
      expiresIn: 86_400
    }
  };
}

async function putItem(item: Record<string, unknown>) {
  await db.send(
    new PutCommand({
      TableName: env.TABLE_NAME,
      Item: item
    })
  );
}

function buildDemoImageUrl(baseUrl: string, fileName: string) {
  return `${baseUrl}/dev/assets/demo/${encodeURIComponent(fileName)}`;
}

function hydrateListing(baseUrl: string, source: (typeof rawListings)[number]) {
  const images = source.imageNames.map((fileName) => buildDemoImageUrl(baseUrl, fileName));
  return {
    ...source,
    images,
    previewImage: images[0]
  };
}

function toListingSummary(source: ReturnType<typeof hydrateListing>): ListingSummary {
  return {
    listingId: source.listingId,
    ownerId: source.ownerId,
    title: source.title,
    propertyType: source.propertyType,
    listingSubtype: source.listingSubtype,
    price: source.price,
    location: source.location,
    lat: source.lat,
    lng: source.lng,
    previewImage: source.previewImage,
    vrUrl: source.vrUrl,
    amenities: [...source.amenities],
    createdAt: source.createdAt
  };
}

function toListingItem(source: ReturnType<typeof hydrateListing>): ListingItem {
  return {
    ...tableKeys.listing(source.ownerId, source.listingId),
    entity: "LISTING",
    ...toListingSummary(source),
    images: [...source.images],
    description: source.description,
    mapboxPlaceId: null,
    status: "published",
    updatedAt: source.createdAt
  };
}

function toListingLookupItem(source: ReturnType<typeof hydrateListing>): ListingLookupItem {
  return {
    ...toListingItem(source),
    ...tableKeys.listingLookup(source.listingId),
    entity: "LISTING_LOOKUP"
  };
}

function toListingFeedItem(source: ReturnType<typeof hydrateListing>): ListingFeedItem {
  return {
    ...tableKeys.listingFeed(source.createdAt, source.ownerId, source.listingId),
    entity: "LISTING_INDEX",
    ...toListingSummary(source)
  };
}

export async function bootstrapDevData(baseUrl: string, signIn: boolean) {
  const hydratedListings = rawListings.map((listing) => hydrateListing(baseUrl, listing));
  const testProfile = toProfile(testUser, hydratedListings.filter((listing) => listing.ownerId === testUser.userId).length);
  const ownerProfiles = owners.map((owner) =>
    toProfile(owner, hydratedListings.filter((listing) => listing.ownerId === owner.userId).length)
  );

  for (const profile of [testProfile, ...ownerProfiles]) {
    await putItem(toUserItem(profile));
  }

  for (const listing of hydratedListings) {
    await putItem(toListingItem(listing));
    await putItem(toListingLookupItem(listing));
    await putItem(toListingFeedItem(listing));
  }

  const seededConversation = await openConversation(testUser.userId, { listingId: hydratedListings[0].listingId });
  if (seededConversation.lastMessagePreview === "Conversation started") {
    await sendConversationMessage(owners[0].userId, seededConversation.conversationId, {
      body: "Hi Abbas, the room is available this week and viewings can start tomorrow afternoon."
    });
    await sendConversationMessage(testUser.userId, seededConversation.conversationId, {
      body: "Perfect. I would like to visit after work and confirm the move-in date."
    });
  }

  return {
    session: signIn ? buildSession(testProfile) : null,
    listingsCount: hydratedListings.length,
    testUserPhone: testProfile.phone
  };
}
