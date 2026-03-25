import { createHash, randomUUID } from "node:crypto";
import { DeleteCommand, GetCommand as DbGetCommand, PutCommand, QueryCommand as DbQueryCommand, ScanCommand, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import {
  deleteConversationMessagesInputSchema,
  conversationMessageListQuerySchema,
  openConversationInputSchema,
  sendConversationMessageInputSchema,
  type ConversationMessage,
  type ConversationSummary,
  type RealtimeEvent
} from "@roomxchange/contracts";
import { db } from "./aws.js";
import { requireUserProfile } from "./auth.js";
import { env } from "./config.js";
import { decodeCursor, encodeCursor } from "./cursor.js";
import type {
  ConversationItem,
  ConversationMessageItem,
  ListingLookupItem,
  SocketLookupItem,
  UserConversationItem,
  UserItem,
  UserSocketItem
} from "./domain.js";
import { AppError, assertFound } from "./errors.js";
import { conversationInboxIndex, tableKeys } from "./keys.js";
import { createUserNotification } from "./notifications.js";
import { pushRealtimeToUser } from "./realtime.js";

function buildConversationId(listingId: string, buyerId: string, ownerId: string) {
  return createHash("sha256").update(`${listingId}:${buyerId}:${ownerId}`).digest("hex");
}

function buildLastMessagePreview(body: string) {
  return body.trim().replace(/\s+/g, " ").slice(0, 140);
}

async function getUserItem(userId: string) {
  const result = await db.send(
    new DbGetCommand({
      TableName: env.TABLE_NAME,
      Key: tableKeys.user(userId)
    })
  );

  return result.Item as UserItem | undefined;
}

async function getConversation(conversationId: string) {
  const result = await db.send(
    new DbGetCommand({
      TableName: env.TABLE_NAME,
      Key: tableKeys.conversation(conversationId)
    })
  );

  return result.Item as ConversationItem | undefined;
}

async function getUserConversation(userId: string, conversationId: string) {
  const result = await db.send(
    new DbGetCommand({
      TableName: env.TABLE_NAME,
      Key: tableKeys.userConversation(userId, conversationId)
    })
  );

  return result.Item as UserConversationItem | undefined;
}

async function getAllUserConversations(userId: string) {
  const result = await db.send(
    new DbQueryCommand({
      TableName: env.TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `USER#${userId}`,
        ":sk": "CONVERSATION#"
      }
    })
  );

  return (result.Items ?? []) as UserConversationItem[];
}

async function findExistingConversationForPair(buyerId: string, ownerId: string) {
  const userConversations = await getAllUserConversations(buyerId);
  const directMatch = userConversations
    .filter((item) => item.participantId === ownerId)
    .sort((left, right) => (right.updatedAt ?? right.lastMessageAt).localeCompare(left.updatedAt ?? left.lastMessageAt))[0];

  if (directMatch) {
    return assertFound(await getConversation(directMatch.conversationId), "Conversation not found.");
  }

  const result = await db.send(
    new ScanCommand({
      TableName: env.TABLE_NAME,
      FilterExpression: "#entity = :entity AND buyerId = :buyerId AND ownerId = :ownerId",
      ExpressionAttributeNames: {
        "#entity": "entity"
      },
      ExpressionAttributeValues: {
        ":entity": "CONVERSATION",
        ":buyerId": buyerId,
        ":ownerId": ownerId
      }
    })
  );

  return ((result.Items ?? []) as ConversationItem[])
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
}

function toConversationSummary(item: UserConversationItem): ConversationSummary {
  return {
    conversationId: item.conversationId,
    listingId: item.listingId,
    listingTitle: item.listingTitle,
    listingPreviewImage: item.listingPreviewImage,
    participant: {
      userId: item.participantId,
      name: item.participantName,
      avatar: item.participantAvatar
    },
    lastMessagePreview: item.lastMessagePreview,
    lastMessageAt: item.lastMessageAt,
    unreadCount: item.unreadCount,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  };
}

function buildUserConversationItem(
  userId: string,
  conversation: ConversationItem,
  unreadCount: number,
  hiddenMessageIds: string[] = []
): UserConversationItem {
  const participantId = userId === conversation.ownerId ? conversation.buyerId : conversation.ownerId;
  const participantName = userId === conversation.ownerId ? conversation.buyerName : conversation.ownerName;
  const participantAvatar = userId === conversation.ownerId ? conversation.buyerAvatar : conversation.ownerAvatar;

  return {
    ...tableKeys.userConversation(userId, conversation.conversationId),
    entity: "USER_CONVERSATION",
    userId,
    conversationId: conversation.conversationId,
    listingId: conversation.listingId,
    listingTitle: conversation.listingTitle,
    listingPreviewImage: conversation.listingPreviewImage,
    participantId,
    participantName,
    participantAvatar,
    lastMessagePreview: conversation.lastMessagePreview,
    lastMessageAt: conversation.lastMessageAt,
    unreadCount,
    hiddenMessageIds,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    ...conversationInboxIndex(userId, conversation.lastMessageAt, conversation.conversationId)
  };
}

function assertConversationParticipant(conversation: ConversationItem, userId: string) {
  if (conversation.ownerId !== userId && conversation.buyerId !== userId) {
    throw new AppError(403, "Conversation access is denied.");
  }
}

async function upsertUserConversation(userId: string, conversation: ConversationItem, unreadCount: number, hiddenMessageIds: string[] = []) {
  const item = buildUserConversationItem(userId, conversation, unreadCount, hiddenMessageIds);
  await db.send(
    new PutCommand({
      TableName: env.TABLE_NAME,
      Item: item
    })
  );
  return item;
}

export async function openConversation(userId: string, input: unknown) {
  const parsed = openConversationInputSchema.parse(input);
  const listing = assertFound(
    (
      await db.send(
        new DbGetCommand({
          TableName: env.TABLE_NAME,
          Key: tableKeys.listingLookup(parsed.listingId)
        })
      )
    ).Item as ListingLookupItem | undefined,
    "Listing not found."
  );

  if (listing.ownerId === userId) {
    throw new AppError(400, "Owners cannot start a contact thread with themselves.");
  }

  const [buyer, owner] = await Promise.all([requireUserProfile(userId), requireUserProfile(listing.ownerId)]);
  const conversationId = buildConversationId(parsed.listingId, buyer.userId, owner.userId);
  const existing = (await getConversation(conversationId)) ?? (await findExistingConversationForPair(buyer.userId, owner.userId));

  if (existing) {
    assertConversationParticipant(existing, userId);
    const current =
      (await getUserConversation(userId, existing.conversationId)) ?? (await upsertUserConversation(userId, existing, 0));
    return toConversationSummary(current);
  }

  const now = new Date().toISOString();
  const conversation: ConversationItem = {
    ...tableKeys.conversation(conversationId),
    entity: "CONVERSATION",
    conversationId,
    listingId: listing.listingId,
    listingTitle: listing.title,
    listingPreviewImage: listing.previewImage,
    buyerId: buyer.userId,
    buyerName: buyer.name,
    buyerAvatar: buyer.avatar,
    ownerId: owner.userId,
    ownerName: owner.name,
    ownerAvatar: owner.avatar,
    lastMessagePreview: "Conversation started",
    lastMessageAt: now,
    createdAt: now,
    updatedAt: now
  };

  const buyerConversation = buildUserConversationItem(buyer.userId, conversation, 0);
  const ownerConversation = buildUserConversationItem(owner.userId, conversation, 0);

  await db.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: env.TABLE_NAME,
            Item: conversation
          }
        },
        {
          Put: {
            TableName: env.TABLE_NAME,
            Item: buyerConversation
          }
        },
        {
          Put: {
            TableName: env.TABLE_NAME,
            Item: ownerConversation
          }
        }
      ]
    })
  );

  return toConversationSummary(userId === buyer.userId ? buyerConversation : ownerConversation);
}

export async function getConversations(userId: string) {
  const result = await db.send(
    new DbQueryCommand({
      TableName: env.TABLE_NAME,
      IndexName: "GSI3",
      KeyConditionExpression: "GSI3PK = :pk",
      ExpressionAttributeValues: {
        ":pk": `USER_CONVERSATION#${userId}`
      },
      ScanIndexForward: false
    })
  );

  const dedupedByParticipant = new Map<string, UserConversationItem>();
  for (const item of (result.Items ?? []) as UserConversationItem[]) {
    const existing = dedupedByParticipant.get(item.participantId);
    if (!existing) {
      dedupedByParticipant.set(item.participantId, item);
      continue;
    }

    const existingUpdated = existing.updatedAt ?? existing.lastMessageAt;
    const currentUpdated = item.updatedAt ?? item.lastMessageAt;
    if (currentUpdated.localeCompare(existingUpdated) > 0) {
      dedupedByParticipant.set(item.participantId, {
        ...item,
        unreadCount: Math.max(item.unreadCount, existing.unreadCount)
      });
      continue;
    }

    dedupedByParticipant.set(item.participantId, {
      ...existing,
      unreadCount: Math.max(existing.unreadCount, item.unreadCount)
    });
  }

  return {
    items: [...dedupedByParticipant.values()].map(toConversationSummary)
  };
}

export async function markAllConversationsRead(userId: string) {
  const conversations = await getAllUserConversations(userId);
  await Promise.all(
    conversations
      .filter((item) => item.unreadCount > 0)
      .map(async (item) => {
        const conversation = await getConversation(item.conversationId);
        if (!conversation) {
          return;
        }
        await upsertUserConversation(userId, conversation, 0, item.hiddenMessageIds ?? []);
      })
  );

  return { success: true as const };
}

export async function deleteConversation(userId: string, conversationId: string) {
  const userConversation = await getUserConversation(userId, conversationId);
  assertFound(userConversation, "Conversation not found.");

  await db.send(
    new DeleteCommand({
      TableName: env.TABLE_NAME,
      Key: tableKeys.userConversation(userId, conversationId)
    })
  );

  return { success: true as const };
}

export async function getConversationMessages(userId: string, conversationId: string, query: Record<string, unknown>) {
  const conversation = assertFound(await getConversation(conversationId), "Conversation not found.");
  assertConversationParticipant(conversation, userId);

  const parsed = conversationMessageListQuerySchema.parse(query);
  const result = await db.send(
    new DbQueryCommand({
      TableName: env.TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `CONVERSATION#${conversationId}`,
        ":sk": "MESSAGE#"
      },
      ExclusiveStartKey: decodeCursor(parsed.cursor),
      Limit: parsed.limit,
      ScanIndexForward: false
    })
  );

  const items = ((result.Items ?? []) as ConversationMessageItem[]).reverse();
  const currentUserConversation = await getUserConversation(userId, conversationId);
  const hiddenMessageIds = new Set(currentUserConversation?.hiddenMessageIds ?? []);
  if (currentUserConversation && currentUserConversation.unreadCount > 0) {
    await upsertUserConversation(userId, conversation, 0, currentUserConversation.hiddenMessageIds ?? []);
  }

  return {
    items: items.filter((item) => !hiddenMessageIds.has(item.messageId)),
    nextCursor: result.LastEvaluatedKey ? encodeCursor(result.LastEvaluatedKey as Record<string, unknown>) : null
  };
}

export async function sendConversationMessage(userId: string, conversationId: string, input: unknown) {
  const parsed = sendConversationMessageInputSchema.parse(input);
  const conversation = assertFound(await getConversation(conversationId), "Conversation not found.");
  assertConversationParticipant(conversation, userId);

  const senderId = userId;
  const recipientId = senderId === conversation.ownerId ? conversation.buyerId : conversation.ownerId;
  const senderConversation = await getUserConversation(senderId, conversationId);
  const recipientConversation = await getUserConversation(recipientId, conversationId);
  const nextRecipientUnread = (recipientConversation?.unreadCount ?? 0) + 1;

  const now = new Date().toISOString();
  const messageId = randomUUID();
  const message: ConversationMessageItem = {
    ...tableKeys.conversationMessage(conversationId, now, messageId),
    entity: "CONVERSATION_MESSAGE",
    messageId,
    conversationId,
    listingId: conversation.listingId,
    senderId,
    body: parsed.body.trim(),
    createdAt: now
  };

  const updatedConversation: ConversationItem = {
    ...conversation,
    lastMessagePreview: buildLastMessagePreview(message.body),
    lastMessageAt: now,
    updatedAt: now
  };

  const senderSummaryItem = buildUserConversationItem(senderId, updatedConversation, 0, senderConversation?.hiddenMessageIds ?? []);
  const recipientSummaryItem = buildUserConversationItem(
    recipientId,
    updatedConversation,
    nextRecipientUnread,
    recipientConversation?.hiddenMessageIds ?? []
  );

  await db.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: env.TABLE_NAME,
            Item: updatedConversation
          }
        },
        {
          Put: {
            TableName: env.TABLE_NAME,
            Item: message
          }
        },
        {
          Put: {
            TableName: env.TABLE_NAME,
            Item: senderSummaryItem
          }
        },
        {
          Put: {
            TableName: env.TABLE_NAME,
            Item: recipientSummaryItem
          }
        }
      ]
    })
  );

  const senderSummary = toConversationSummary(senderSummaryItem);
  const recipientSummary = toConversationSummary(recipientSummaryItem);

  await Promise.all([
    pushRealtimeToUser(senderId, {
      type: "message.sent",
      conversation: senderSummary,
      message
    }),
    pushRealtimeToUser(recipientId, {
      type: "message.sent",
      conversation: recipientSummary,
      message
    }),
    createUserNotification(recipientId, {
      title: recipientSummary.participant.name,
      body: message.body,
      listingId: message.listingId,
      kind: "message",
      sourceKey: `message:${message.messageId}`
    })
  ]);

  return message satisfies ConversationMessage;
}

export async function deleteConversationMessages(userId: string, conversationId: string, input: unknown) {
  const parsed = deleteConversationMessagesInputSchema.parse(input);
  const conversation = assertFound(await getConversation(conversationId), "Conversation not found.");
  assertConversationParticipant(conversation, userId);
  const currentUserConversation = assertFound(await getUserConversation(userId, conversationId), "Conversation not found.");

  const result = await db.send(
    new DbQueryCommand({
      TableName: env.TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `CONVERSATION#${conversationId}`,
        ":sk": "MESSAGE#"
      }
    })
  );

  const allMessages = (result.Items ?? []) as ConversationMessageItem[];
  const selectedMessages = allMessages.filter((item) => parsed.messageIds.includes(item.messageId));
  if (!selectedMessages.length) {
    return { success: true as const };
  }

  const nextHiddenMessageIds = Array.from(new Set([...(currentUserConversation.hiddenMessageIds ?? []), ...parsed.messageIds]));
  const remainingMessages = allMessages
    .filter((item) => !nextHiddenMessageIds.includes(item.messageId))
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  const lastMessage = remainingMessages.at(-1);
  const updatedUserConversation: UserConversationItem = {
    ...currentUserConversation,
    lastMessagePreview: lastMessage ? buildLastMessagePreview(lastMessage.body) : "Conversation started",
    lastMessageAt: lastMessage?.createdAt ?? conversation.createdAt,
    updatedAt: new Date().toISOString(),
    hiddenMessageIds: nextHiddenMessageIds,
    ...conversationInboxIndex(userId, lastMessage?.createdAt ?? conversation.createdAt, conversationId)
  };

  await db.send(
    new PutCommand({
      TableName: env.TABLE_NAME,
      Item: updatedUserConversation
    })
  );

  return { success: true as const };
}

export async function connectSocket(userId: string, connectionId: string) {
  const connectedAt = new Date().toISOString();

  await db.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: env.TABLE_NAME,
            Item: {
              ...tableKeys.userSocket(userId, connectionId),
              entity: "SOCKET_CONNECTION",
              userId,
              connectionId,
              connectedAt
            } satisfies UserSocketItem
          }
        },
        {
          Put: {
            TableName: env.TABLE_NAME,
            Item: {
              ...tableKeys.socketLookup(connectionId),
              entity: "SOCKET_LOOKUP",
              userId,
              connectionId,
              connectedAt
            } satisfies SocketLookupItem
          }
        }
      ]
    })
  );
}

export async function disconnectSocket(connectionId: string) {
  const lookup = (
    await db.send(
      new DbGetCommand({
        TableName: env.TABLE_NAME,
        Key: tableKeys.socketLookup(connectionId)
      })
    )
  ).Item as SocketLookupItem | undefined;

  if (!lookup) {
    return;
  }

  await db.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Delete: {
            TableName: env.TABLE_NAME,
            Key: tableKeys.socketLookup(connectionId)
          }
        },
        {
          Delete: {
            TableName: env.TABLE_NAME,
            Key: tableKeys.userSocket(lookup.userId, connectionId)
          }
        }
      ]
    })
  );
}
