import { randomUUID } from "node:crypto";
import { DeleteCommand, GetCommand, PutCommand, QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import {
  notificationRecordSchema,
  notificationSettingsSchema,
  notificationUpdateSchema,
  reminderPreferenceSchema,
  reminderUpsertInputSchema,
  type ListingSummary,
  type NotificationRecord,
  type ReminderPreference
} from "@roomxchange/contracts";
import { db } from "./aws.js";
import { env } from "./config.js";
import type { NotificationSettingsItem, UserNotificationItem, UserReminderItem } from "./domain.js";
import { AppError, assertFound } from "./errors.js";
import { tableKeys } from "./keys.js";
import { pushRealtimeToUser } from "./realtime.js";

function getDefaultNotificationSettings() {
  return {
    pushEnabled: true,
    messageNotificationsEnabled: true,
    listingMatchNotificationsEnabled: true,
    updatedAt: new Date().toISOString()
  };
}

function byNewest<T extends { createdAt: string }>(items: T[]) {
  return [...items].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function toNotificationRecord(item: UserNotificationItem): NotificationRecord {
  return notificationRecordSchema.parse({
    id: item.id,
    title: item.title,
    body: item.body,
    createdAt: item.createdAt,
    listingId: item.listingId ?? undefined,
    read: item.read,
    kind: item.kind
  });
}

function toReminder(item: UserReminderItem): ReminderPreference {
  return reminderPreferenceSchema.parse({
    id: item.id,
    location: item.location,
    propertyType: item.propertyType,
    listingSubtypes: item.listingSubtypes,
    minBudget: item.minBudget,
    maxBudget: item.maxBudget,
    enabled: item.enabled,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  });
}

export async function getNotificationSettings() {
  const result = await db.send(
    new GetCommand({
      TableName: env.TABLE_NAME,
      Key: tableKeys.appSetting("NOTIFICATIONS")
    })
  );

  return notificationSettingsSchema.parse(result.Item ?? getDefaultNotificationSettings());
}

export async function getUserNotifications(userId: string) {
  const result = await db.send(
    new QueryCommand({
      TableName: env.TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `USER#${userId}`,
        ":sk": "NOTIFICATION#"
      }
    })
  );

  return {
    items: byNewest((result.Items ?? []) as UserNotificationItem[]).map(toNotificationRecord)
  };
}

export async function updateUserNotification(userId: string, notificationId: string, input: unknown) {
  const parsed = notificationUpdateSchema.parse(input);
  const current = assertFound(
    (
      await db.send(
        new GetCommand({
          TableName: env.TABLE_NAME,
          Key: tableKeys.userNotification(userId, notificationId)
        })
      )
    ).Item as UserNotificationItem | undefined,
    "Notification not found."
  );

  const updated: UserNotificationItem = {
    ...current,
    read: parsed.read
  };

  await db.send(
    new PutCommand({
      TableName: env.TABLE_NAME,
      Item: updated
    })
  );

  return toNotificationRecord(updated);
}

export async function markAllNotificationsRead(userId: string) {
  const notifications = await getUserNotifications(userId);
  await Promise.all(
    notifications.items
      .filter((item) => !item.read)
      .map((item) => updateUserNotification(userId, item.id, { read: true }))
  );
  return { success: true as const };
}

export async function deleteUserNotification(userId: string, notificationId: string) {
  await db.send(
    new DeleteCommand({
      TableName: env.TABLE_NAME,
      Key: tableKeys.userNotification(userId, notificationId)
    })
  );
  return { success: true as const };
}

export async function clearUserNotifications(userId: string) {
  const notifications = await getUserNotifications(userId);
  await Promise.all(notifications.items.map((item) => deleteUserNotification(userId, item.id)));
  return { success: true as const };
}

export async function getUserReminders(userId: string) {
  const result = await db.send(
    new QueryCommand({
      TableName: env.TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `USER#${userId}`,
        ":sk": "REMINDER#"
      }
    })
  );

  return {
    items: ((result.Items ?? []) as UserReminderItem[])
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map(toReminder)
  };
}

export async function upsertUserReminder(userId: string, input: unknown, reminderId?: string) {
  const parsed = reminderUpsertInputSchema.parse(input);
  const id = reminderId ?? parsed.id ?? randomUUID();
  const current =
    (
      await db.send(
        new GetCommand({
          TableName: env.TABLE_NAME,
          Key: tableKeys.userReminder(userId, id)
        })
      )
    ).Item as UserReminderItem | undefined;
  const now = new Date().toISOString();
  const item: UserReminderItem = {
    ...tableKeys.userReminder(userId, id),
    entity: "USER_REMINDER",
    userId,
    id,
    location: parsed.location ?? current?.location ?? "",
    propertyType: parsed.propertyType ?? current?.propertyType ?? "all",
    listingSubtypes: parsed.listingSubtypes ?? current?.listingSubtypes ?? [],
    minBudget: parsed.minBudget ?? current?.minBudget ?? 0,
    maxBudget: parsed.maxBudget ?? current?.maxBudget ?? 6000,
    enabled: parsed.enabled ?? current?.enabled ?? true,
    createdAt: current?.createdAt ?? now,
    updatedAt: now
  };

  if (!item.location.trim()) {
    throw new AppError(400, "Location is required.");
  }

  await db.send(
    new PutCommand({
      TableName: env.TABLE_NAME,
      Item: item
    })
  );

  return toReminder(item);
}

export async function deleteUserReminder(userId: string, reminderId: string) {
  await db.send(
    new DeleteCommand({
      TableName: env.TABLE_NAME,
      Key: tableKeys.userReminder(userId, reminderId)
    })
  );
  return { success: true as const };
}

function matchesReminder(listing: ListingSummary, reminder: ReminderPreference) {
  if (!reminder.enabled) {
    return false;
  }
  if (reminder.location.trim() && !listing.location.toLowerCase().includes(reminder.location.trim().toLowerCase())) {
    return false;
  }
  if (reminder.propertyType !== "all" && listing.propertyType !== reminder.propertyType) {
    return false;
  }
  if (reminder.listingSubtypes.length && (!listing.listingSubtype || !reminder.listingSubtypes.includes(listing.listingSubtype))) {
    return false;
  }
  if (listing.price < reminder.minBudget || listing.price > reminder.maxBudget) {
    return false;
  }
  return true;
}

async function notificationExistsForSource(userId: string, sourceKey: string) {
  const result = await db.send(
    new QueryCommand({
      TableName: env.TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `USER#${userId}`,
        ":sk": "NOTIFICATION#"
      }
    })
  );

  return ((result.Items ?? []) as UserNotificationItem[]).some((item) => item.sourceKey === sourceKey);
}

export async function createUserNotification(
  userId: string,
  input: Omit<NotificationRecord, "id" | "createdAt" | "read"> & { sourceKey?: string | null }
) {
  const settings = await getNotificationSettings();
  if (!settings.pushEnabled) {
    return null;
  }
  if (input.kind === "message" && !settings.messageNotificationsEnabled) {
    return null;
  }
  if (input.kind === "listing_match" && !settings.listingMatchNotificationsEnabled) {
    return null;
  }

  if (input.sourceKey && (await notificationExistsForSource(userId, input.sourceKey))) {
    return null;
  }

  const notificationId = randomUUID();
  const item: UserNotificationItem = {
    ...tableKeys.userNotification(userId, notificationId),
    entity: "USER_NOTIFICATION",
    userId,
    id: notificationId,
    title: input.title,
    body: input.body,
    createdAt: new Date().toISOString(),
    listingId: input.listingId,
    read: false,
    kind: input.kind,
    sourceKey: input.sourceKey ?? null
  };

  item.PK = `USER#${userId}`;
  item.SK = `NOTIFICATION#${item.id}`;

  await db.send(
    new PutCommand({
      TableName: env.TABLE_NAME,
      Item: item
    })
  );

  const notification = toNotificationRecord(item);
  await pushRealtimeToUser(userId, {
    type: "notification.created",
    notification
  });

  return notification;
}

export async function evaluateListingMatches(listing: ListingSummary) {
  const result = await db.send(
    new ScanCommand({
      TableName: env.TABLE_NAME,
      FilterExpression: "#entity = :entity",
      ExpressionAttributeNames: {
        "#entity": "entity"
      },
      ExpressionAttributeValues: {
        ":entity": "USER_REMINDER"
      }
    })
  );

  const reminders = (result.Items ?? []) as UserReminderItem[];
  await Promise.all(
    reminders
      .filter((item) => matchesReminder(listing, toReminder(item)))
      .map((item) =>
        createUserNotification(item.userId, {
          title: `New match in ${listing.location}`,
          body: `${listing.title} matches your saved alert.`,
          listingId: listing.listingId,
          kind: "listing_match",
          sourceKey: `listing-match:${listing.listingId}:${item.id}`
        })
      )
  );
}
