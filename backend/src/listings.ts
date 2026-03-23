import { randomUUID } from "node:crypto";
import { GetCommand, QueryCommand, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import {
  feedQuerySchema,
  listingInputSchema,
  listingUpdateSchema,
  type FeedQueryInput,
  type Listing,
  type ListingSummary
} from "@roomxchange/contracts";
import { isAllowedVrUrl, maskPhone } from "@roomxchange/shared";
import { db } from "./aws.js";
import { env } from "./config.js";
import { decodeCursor, encodeCursor } from "./cursor.js";
import type { ListingFeedItem, ListingItem, ListingLookupItem, UserItem } from "./domain.js";
import { AppError, assert, assertFound } from "./errors.js";
import { tableKeys } from "./keys.js";
import { markUploadsComplete } from "./uploads.js";

async function getOwner(ownerId: string) {
  const result = await db.send(
    new GetCommand({
      TableName: env.TABLE_NAME,
      Key: tableKeys.user(ownerId)
    })
  );

  return result.Item as UserItem | undefined;
}

function toListingSummary(item: ListingItem | ListingLookupItem): ListingSummary {
  return {
    listingId: item.listingId,
    ownerId: item.ownerId,
    title: item.title,
    price: item.price,
    location: item.location,
    lat: item.lat,
    lng: item.lng,
    previewImage: item.previewImage,
    vrUrl: item.vrUrl ?? null,
    amenities: item.amenities,
    createdAt: item.createdAt
  };
}

async function getOwnerContact(viewerId: string | null, ownerId: string) {
  const owner = assertFound(await getOwner(ownerId), "Listing owner not found.");
  if (!viewerId) {
    return {
      name: owner.name,
      phoneMasked: maskPhone(owner.phone),
      phone: null,
      canContact: false
    };
  }

  if (viewerId === ownerId) {
    return {
      name: owner.name,
      phoneMasked: maskPhone(owner.phone),
      phone: owner.phone,
      canContact: true
    };
  }

  const viewer = await getOwner(viewerId);
  const subscribed = viewer?.isSubscribed && viewer.subscriptionStatus === "active";
  return {
    name: owner.name,
    phoneMasked: maskPhone(owner.phone),
    phone: subscribed ? owner.phone : null,
    canContact: Boolean(subscribed)
  };
}

function applyFeedFilters(item: ListingFeedItem, query: FeedQueryInput) {
  if (query.location && !item.location.toLowerCase().includes(query.location.toLowerCase())) {
    return false;
  }

  if (query.minPrice !== undefined && item.price < query.minPrice) {
    return false;
  }

  if (query.maxPrice !== undefined && item.price > query.maxPrice) {
    return false;
  }

  if (query.hasVr && !item.vrUrl) {
    return false;
  }

  if (query.amenities.length && !query.amenities.every((amenity) => item.amenities.includes(amenity))) {
    return false;
  }

  return true;
}

export async function createListing(userId: string, input: unknown) {
  const parsed = listingInputSchema.parse(input);
  if (parsed.vrUrl) {
    assert(isAllowedVrUrl(parsed.vrUrl), 400, "VR URL must be a valid Polycam or Luma HTTPS link.");
  }

  const owner = assertFound(await getOwner(userId), "User profile not found.");
  const listingId = randomUUID();
  const createdAt = new Date().toISOString();

  const item: ListingItem = {
    ...tableKeys.listing(userId, listingId),
    entity: "LISTING",
    listingId,
    ownerId: userId,
    title: parsed.title,
    price: parsed.price,
    location: parsed.location,
    lat: parsed.lat,
    lng: parsed.lng,
    images: parsed.images,
    previewImage: parsed.previewImage,
    vrUrl: parsed.vrUrl ?? null,
    description: parsed.description,
    amenities: parsed.amenities,
    mapboxPlaceId: parsed.mapboxPlaceId ?? null,
    status: parsed.status,
    createdAt,
    updatedAt: createdAt
  };

  const lookup: ListingLookupItem = {
    ...item,
    ...tableKeys.listingLookup(listingId),
    entity: "LISTING_LOOKUP"
  };

  const feed: ListingFeedItem = {
    ...tableKeys.listingFeed(createdAt, userId, listingId),
    entity: "LISTING_INDEX",
    ...toListingSummary(item)
  };

  await db.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: env.TABLE_NAME,
            Item: item
          }
        },
        {
          Put: {
            TableName: env.TABLE_NAME,
            Item: lookup
          }
        },
        {
          Put: {
            TableName: env.TABLE_NAME,
            Item: feed
          }
        },
        {
          Update: {
            TableName: env.TABLE_NAME,
            Key: tableKeys.user(userId),
            UpdateExpression: "SET listingsCount = if_not_exists(listingsCount, :zero) + :one, updatedAt = :updatedAt",
            ExpressionAttributeValues: {
              ":zero": 0,
              ":one": 1,
              ":updatedAt": createdAt
            }
          }
        }
      ]
    })
  );

  await markUploadsComplete(userId, parsed.images);

  return {
    ...item,
    ownerContact: {
      name: owner.name,
      phoneMasked: maskPhone(owner.phone),
      phone: owner.phone,
      canContact: true
    }
  } satisfies Listing;
}

export async function getListingById(listingId: string, viewerId: string | null) {
  const result = await db.send(
    new GetCommand({
      TableName: env.TABLE_NAME,
      Key: tableKeys.listingLookup(listingId)
    })
  );

  const item = assertFound(result.Item as ListingLookupItem | undefined, "Listing not found.");
  return {
    ...item,
    ownerContact: await getOwnerContact(viewerId, item.ownerId)
  } satisfies Listing;
}

export async function getFeed(input: Record<string, unknown>) {
  const query = feedQuerySchema.parse(input);
  const limit = query.limit;
  let cursor = decodeCursor(query.cursor);
  let lastEvaluatedKey: Record<string, unknown> | undefined;
  const items: ListingSummary[] = [];

  while (items.length < limit) {
    const result = await db.send(
      new QueryCommand({
        TableName: env.TABLE_NAME,
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: {
          ":pk": "LISTING"
        },
        ExclusiveStartKey: cursor,
        Limit: limit * 3,
        ScanIndexForward: false
      })
    );

    const page = (result.Items ?? []) as ListingFeedItem[];
    for (const item of page) {
      if (applyFeedFilters(item, query)) {
        items.push(item);
      }

      if (items.length >= limit) {
        break;
      }
    }

    lastEvaluatedKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
    if (!lastEvaluatedKey) {
      break;
    }

    cursor = lastEvaluatedKey;
  }

  return {
    items,
    nextCursor: lastEvaluatedKey ? encodeCursor(lastEvaluatedKey) : null
  };
}

export async function getUserListings(userId: string) {
  const result = await db.send(
    new QueryCommand({
      TableName: env.TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `USER#${userId}`,
        ":sk": "LISTING#"
      },
      ScanIndexForward: false
    })
  );

  return ((result.Items ?? []) as ListingItem[]).map(toListingSummary);
}

export async function updateListing(userId: string, listingId: string, input: unknown) {
  const parsed = listingUpdateSchema.parse(input);
  const current = assertFound(
    (
      await db.send(
        new GetCommand({
          TableName: env.TABLE_NAME,
          Key: tableKeys.listing(userId, listingId)
        })
      )
    ).Item as ListingItem | undefined,
    "Listing not found."
  );

  if (parsed.vrUrl && !isAllowedVrUrl(parsed.vrUrl)) {
    throw new AppError(400, "VR URL must be a valid Polycam or Luma HTTPS link.");
  }

  const updated: ListingItem = {
    ...current,
    ...parsed,
    vrUrl: parsed.vrUrl === undefined ? current.vrUrl : parsed.vrUrl ?? null,
    mapboxPlaceId: parsed.mapboxPlaceId === undefined ? current.mapboxPlaceId : parsed.mapboxPlaceId ?? null,
    updatedAt: new Date().toISOString()
  };

  await db.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: env.TABLE_NAME,
            Item: updated
          }
        },
        {
          Put: {
            TableName: env.TABLE_NAME,
            Item: {
              ...updated,
              ...tableKeys.listingLookup(listingId),
              entity: "LISTING_LOOKUP"
            } satisfies ListingLookupItem
          }
        },
        ...(updated.status === "published"
          ? [
              {
                Put: {
                  TableName: env.TABLE_NAME,
                  Item: {
                    ...tableKeys.listingFeed(updated.createdAt, userId, listingId),
                    entity: "LISTING_INDEX",
                    ...toListingSummary(updated)
                  } satisfies ListingFeedItem
                }
              }
            ]
          : [
              {
                Delete: {
                  TableName: env.TABLE_NAME,
                  Key: tableKeys.listingFeed(updated.createdAt, userId, listingId)
                }
              }
            ])
      ]
    })
  );

  await markUploadsComplete(userId, updated.images);
  return getListingById(listingId, userId);
}

export async function archiveListing(userId: string, listingId: string) {
  const current = assertFound(
    (
      await db.send(
        new GetCommand({
          TableName: env.TABLE_NAME,
          Key: tableKeys.listing(userId, listingId)
        })
      )
    ).Item as ListingItem | undefined,
    "Listing not found."
  );

  const archived: ListingItem = {
    ...current,
    status: "archived",
    updatedAt: new Date().toISOString()
  };

  await db.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: env.TABLE_NAME,
            Item: archived
          }
        },
        {
          Put: {
            TableName: env.TABLE_NAME,
            Item: {
              ...archived,
              ...tableKeys.listingLookup(listingId),
              entity: "LISTING_LOOKUP"
            } satisfies ListingLookupItem
          }
        },
        {
          Delete: {
            TableName: env.TABLE_NAME,
            Key: tableKeys.listingFeed(current.createdAt, userId, listingId)
          }
        }
      ]
    })
  );
}
