import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { adminLoginSchema, type AuthSession, type UserProfile } from "@roomxchange/contracts";
import { db } from "./aws.js";
import { env } from "./config.js";
import type { UserItem } from "./domain.js";
import { AppError } from "./errors.js";
import { subscriptionOperationalIndex, tableKeys } from "./keys.js";

function createFakeJwt(payload: Record<string, string>) {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.roomxchange-admin`;
}

function toSession(user: UserProfile): AuthSession {
  const tokenPayload = {
    sub: user.userId,
    phone_number: user.phone,
    name: user.name,
    email: user.email ?? ""
  };

  return {
    user,
    tokens: {
      accessToken: createFakeJwt(tokenPayload),
      idToken: createFakeJwt(tokenPayload),
      refreshToken: "roomxchange-admin-refresh-token",
      expiresIn: 86_400
    }
  };
}

function toPublicUser(item: UserItem): UserProfile {
  return {
    userId: item.userId,
    phone: item.phone,
    name: item.name,
    avatar: item.avatar ?? null,
    email: item.email ?? null,
    phonePublic: item.phonePublic ?? false,
    role: item.role,
    accountStatus: item.accountStatus ?? "active",
    isSubscribed: item.isSubscribed,
    subscriptionStatus: item.subscriptionStatus,
    subscriptionProvider: item.subscriptionProvider ?? null,
    subscriptionPlan: item.subscriptionPlan ?? null,
    subscriptionExpiresAt: item.subscriptionExpiresAt ?? null,
    listingsCount: item.listingsCount,
    successfulListings: item.successfulListings,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  };
}

async function bootstrapAdminUser(email: string) {
  const timestamp = new Date().toISOString();
  const userId = randomUUID();
  const item: UserItem = {
    ...tableKeys.user(userId),
    entity: "USER",
    userId,
    phone: env.ADMIN_WEB_PHONE,
    name: "RoomXchange Admin",
    avatar: null,
    email,
    phonePublic: false,
    role: "super_admin",
    accountStatus: "active",
    isSubscribed: true,
    subscriptionStatus: "active",
    subscriptionProvider: "roomxchange-admin",
    subscriptionPlan: "ops",
    subscriptionExpiresAt: null,
    paystackCustomerCode: null,
    paystackSubscriptionCode: null,
    listingsCount: 0,
    successfulListings: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...subscriptionOperationalIndex("active", null, userId)
  };

  await db.send(
    new PutCommand({
      TableName: env.TABLE_NAME,
      Item: item
    })
  );

  return item;
}

export async function adminLogin(input: unknown) {
  const parsed = adminLoginSchema.parse(input);
  if (
    parsed.email.toLowerCase() !== env.ADMIN_WEB_EMAIL.toLowerCase() ||
    parsed.password !== env.ADMIN_WEB_PASSWORD
  ) {
    throw new AppError(401, "Invalid admin credentials.");
  }

  const result = await db.send(
    new ScanCommand({
      TableName: env.TABLE_NAME,
      FilterExpression: "#entity = :entity AND email = :email",
      ExpressionAttributeNames: {
        "#entity": "entity"
      },
      ExpressionAttributeValues: {
        ":entity": "USER",
        ":email": parsed.email
      },
      Limit: 1
    })
  );

  const user = ((result.Items?.[0] as UserItem | undefined) ?? null) ?? (await bootstrapAdminUser(parsed.email));

  if (!["moderator", "admin", "super_admin"].includes(user.role)) {
    throw new AppError(403, "Admin access is required.");
  }

  if ((user.accountStatus ?? "active") !== "active") {
    throw new AppError(403, "Admin account is not active.");
  }

  return toSession(toPublicUser(user));
}
