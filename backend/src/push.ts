import { DeleteCommand, GetCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { pushTokenDeleteSchema, pushTokenUpsertSchema, type NotificationRecord } from "@roomxchange/contracts";
import { db } from "./aws.js";
import { env } from "./config.js";
import type { PushTokenLookupItem, UserPushTokenItem } from "./domain.js";
import { tableKeys } from "./keys.js";

function toUserPushTokenItem(userId: string, token: string, platform: "ios" | "android", createdAt?: string): UserPushTokenItem {
  const now = new Date().toISOString();
  return {
    ...tableKeys.userPushToken(userId, token),
    entity: "USER_PUSH_TOKEN",
    userId,
    token,
    platform,
    createdAt: createdAt ?? now,
    updatedAt: now
  };
}

function toPushTokenLookupItem(userId: string, token: string, platform: "ios" | "android", createdAt?: string): PushTokenLookupItem {
  const now = new Date().toISOString();
  return {
    ...tableKeys.pushTokenLookup(token),
    entity: "PUSH_TOKEN_LOOKUP",
    userId,
    token,
    platform,
    createdAt: createdAt ?? now,
    updatedAt: now
  };
}

export async function registerPushToken(userId: string, input: unknown) {
  const parsed = pushTokenUpsertSchema.parse(input);
  const existingLookupResult = await db.send(
    new GetCommand({
      TableName: env.TABLE_NAME,
      Key: tableKeys.pushTokenLookup(parsed.token)
    })
  );
  const existingLookup = existingLookupResult.Item as PushTokenLookupItem | undefined;

  if (existingLookup && existingLookup.userId !== userId) {
    await db.send(
      new DeleteCommand({
        TableName: env.TABLE_NAME,
        Key: tableKeys.userPushToken(existingLookup.userId, parsed.token)
      })
    );
  }

  const createdAt = existingLookup?.createdAt;
  await db.send(
    new PutCommand({
      TableName: env.TABLE_NAME,
      Item: toUserPushTokenItem(userId, parsed.token, parsed.platform, createdAt)
    })
  );
  await db.send(
    new PutCommand({
      TableName: env.TABLE_NAME,
      Item: toPushTokenLookupItem(userId, parsed.token, parsed.platform, createdAt)
    })
  );

  return { success: true as const };
}

export async function unregisterPushToken(userId: string, input: unknown) {
  const parsed = pushTokenDeleteSchema.parse(input);
  await db.send(
    new DeleteCommand({
      TableName: env.TABLE_NAME,
      Key: tableKeys.userPushToken(userId, parsed.token)
    })
  );

  const lookupResult = await db.send(
    new GetCommand({
      TableName: env.TABLE_NAME,
      Key: tableKeys.pushTokenLookup(parsed.token)
    })
  );
  const lookup = lookupResult.Item as PushTokenLookupItem | undefined;
  if (lookup?.userId === userId) {
    await db.send(
      new DeleteCommand({
        TableName: env.TABLE_NAME,
        Key: tableKeys.pushTokenLookup(parsed.token)
      })
    );
  }

  return { success: true as const };
}

export async function getUserPushTokens(userId: string) {
  const result = await db.send(
    new QueryCommand({
      TableName: env.TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `USER#${userId}`,
        ":sk": "PUSH_TOKEN#"
      }
    })
  );

  return (result.Items ?? []) as UserPushTokenItem[];
}

async function removeInvalidPushToken(userId: string, token: string) {
  await db.send(
    new DeleteCommand({
      TableName: env.TABLE_NAME,
      Key: tableKeys.userPushToken(userId, token)
    })
  );
  await db.send(
    new DeleteCommand({
      TableName: env.TABLE_NAME,
      Key: tableKeys.pushTokenLookup(token)
    })
  );
}

export async function sendPushNotificationToUser(userId: string, notification: NotificationRecord) {
  const tokens = await getUserPushTokens(userId);
  if (!tokens.length) {
    return;
  }

  const messages = tokens.map((item) => ({
    to: item.token,
    sound: "default",
    title: notification.title,
    body: notification.body,
    data: notification.listingId ? { listingId: notification.listingId } : {}
  }));

  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(messages)
    });

    const payload = (await response.json()) as {
      data?: Array<{ status?: string; details?: { error?: string } }>;
    };

    const results = payload.data ?? [];
    await Promise.all(
      results.map(async (result, index) => {
        if (result.status !== "error") {
          return;
        }

        const errorCode = result.details?.error ?? "";
        if (errorCode === "DeviceNotRegistered" || errorCode === "ExpoPushTokenInvalid") {
          const token = tokens[index]?.token;
          if (token) {
            await removeInvalidPushToken(userId, token);
          }
        }
      })
    );
  } catch {
    return;
  }
}
