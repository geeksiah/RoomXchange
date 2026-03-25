import {
  AdminCreateUserCommand,
  AdminGetUserCommand,
  AdminInitiateAuthCommand,
  AdminRespondToAuthChallengeCommand,
  AdminSetUserPasswordCommand,
  AdminUpdateUserAttributesCommand
} from "@aws-sdk/client-cognito-identity-provider";
import { randomUUID } from "node:crypto";
import { GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { otpRequestSchema, otpVerifySchema, profileUpdateSchema, type ProfileUpdateInput, type UserProfile } from "@roomxchange/contracts";
import { maskPhone, sanitizePhone } from "@roomxchange/shared";
import { cognito, db } from "./aws.js";
import { env } from "./config.js";
import type { UserItem } from "./domain.js";
import { AppError, assertFound } from "./errors.js";
import { subscriptionOperationalIndex, tableKeys } from "./keys.js";

type CognitoClaims = {
  sub: string;
  phone_number: string;
  name?: string;
  email?: string;
};

function randomPassword() {
  return `${randomUUID()}Aa!1`;
}

function decodeJwtPayload<T>(token: string) {
  const [, payload] = token.split(".");
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as T;
}

async function ensureCognitoUser(phone: string, name?: string, email?: string) {
  try {
    await cognito.send(
      new AdminGetUserCommand({
        UserPoolId: env.USER_POOL_ID,
        Username: phone
      })
    );
  } catch (error) {
    if (!String(error).includes("UserNotFoundException")) {
      throw error;
    }

    await cognito.send(
      new AdminCreateUserCommand({
        UserPoolId: env.USER_POOL_ID,
        Username: phone,
        MessageAction: "SUPPRESS",
        UserAttributes: [
          { Name: "phone_number", Value: phone },
          ...(name ? [{ Name: "name", Value: name }] : []),
          ...(email ? [{ Name: "email", Value: email }] : [])
        ]
      })
    );

    await cognito.send(
      new AdminSetUserPasswordCommand({
        UserPoolId: env.USER_POOL_ID,
        Username: phone,
        Password: randomPassword(),
        Permanent: true
      })
    );
  }
}

async function getUserItem(userId: string) {
  const result = await db.send(
    new GetCommand({
      TableName: env.TABLE_NAME,
      Key: tableKeys.user(userId)
    })
  );

  return result.Item as UserItem | undefined;
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

async function upsertUserProfile(claims: CognitoClaims) {
  const timestamp = new Date().toISOString();
  const current = await getUserItem(claims.sub);

  const item: UserItem = {
    ...tableKeys.user(claims.sub),
    entity: "USER",
    userId: claims.sub,
    phone: claims.phone_number,
    name: claims.name ?? current?.name ?? "RoomXchange Member",
    avatar: current?.avatar ?? null,
    email: claims.email ?? current?.email ?? null,
    phonePublic: current?.phonePublic ?? false,
    role: current?.role ?? "member",
    accountStatus: current?.accountStatus ?? "active",
    isSubscribed: current?.isSubscribed ?? false,
    subscriptionStatus: current?.subscriptionStatus ?? "inactive",
    subscriptionProvider: current?.subscriptionProvider ?? null,
    subscriptionPlan: current?.subscriptionPlan ?? null,
    subscriptionExpiresAt: current?.subscriptionExpiresAt ?? null,
    paystackCustomerCode: current?.paystackCustomerCode ?? null,
    paystackSubscriptionCode: current?.paystackSubscriptionCode ?? null,
    listingsCount: current?.listingsCount ?? 0,
    successfulListings: current?.successfulListings ?? 0,
    createdAt: current?.createdAt ?? timestamp,
    updatedAt: timestamp,
    ...subscriptionOperationalIndex(current?.subscriptionStatus ?? "inactive", current?.subscriptionExpiresAt ?? null, claims.sub)
  };

  await db.send(
    new PutCommand({
      TableName: env.TABLE_NAME,
      Item: item
    })
  );

  return toPublicUser(item);
}

export async function requestOtp(input: unknown) {
  const parsed = otpRequestSchema.parse(input);
  const phone = sanitizePhone(parsed.phone);
  await ensureCognitoUser(phone, parsed.name, parsed.email);

  const response = await cognito.send(
    new AdminInitiateAuthCommand({
      UserPoolId: env.USER_POOL_ID,
      ClientId: env.USER_POOL_CLIENT_ID,
      AuthFlow: "CUSTOM_AUTH",
      AuthParameters: {
        USERNAME: phone
      }
    })
  );

  return {
    session: response.Session,
    challengeName: response.ChallengeName ?? "CUSTOM_CHALLENGE"
  };
}

export async function verifyOtp(input: unknown) {
  const parsed = otpVerifySchema.parse(input);
  const phone = sanitizePhone(parsed.phone);

  const response = await cognito.send(
    new AdminRespondToAuthChallengeCommand({
      UserPoolId: env.USER_POOL_ID,
      ClientId: env.USER_POOL_CLIENT_ID,
      ChallengeName: "CUSTOM_CHALLENGE",
      Session: parsed.session,
      ChallengeResponses: {
        USERNAME: phone,
        ANSWER: parsed.code
      }
    })
  );

  if (!response.AuthenticationResult?.IdToken || !response.AuthenticationResult.AccessToken) {
    throw new AppError(401, "The OTP code is invalid or expired.");
  }

  await cognito.send(
    new AdminUpdateUserAttributesCommand({
      UserPoolId: env.USER_POOL_ID,
      Username: phone,
      UserAttributes: [
        { Name: "phone_number_verified", Value: "true" },
        ...(parsed.name ? [{ Name: "name", Value: parsed.name }] : []),
        ...(parsed.email ? [{ Name: "email", Value: parsed.email }] : [])
      ]
    })
  );

  const claims = decodeJwtPayload<CognitoClaims>(response.AuthenticationResult.IdToken);
  const user = await upsertUserProfile({
    ...claims,
    name: parsed.name ?? claims.name,
    email: parsed.email ?? claims.email
  });

  if (user.accountStatus === "frozen" || user.accountStatus === "removed") {
    throw new AppError(403, "This account is not active.");
  }

  return {
    user,
    tokens: {
      accessToken: response.AuthenticationResult.AccessToken,
      idToken: response.AuthenticationResult.IdToken,
      refreshToken: response.AuthenticationResult.RefreshToken,
      expiresIn: response.AuthenticationResult.ExpiresIn ?? 3600
    }
  };
}

export async function getUserProfile(userId: string) {
  const item = await getUserItem(userId);
  return item ? toPublicUser(item) : null;
}

export async function requireUserProfile(userId: string) {
  return assertFound(await getUserProfile(userId), "User profile not found.");
}

export async function updateUserProfile(userId: string, input: unknown) {
  const parsed = profileUpdateSchema.parse(input);
  const current = assertFound(await getUserItem(userId), "User profile not found.");
  const updatedItem: UserItem = {
    ...current,
    ...parsed,
    updatedAt: new Date().toISOString()
  };

  await db.send(
    new PutCommand({
      TableName: env.TABLE_NAME,
      Item: updatedItem
    })
  );

  return toPublicUser(updatedItem);
}

export async function setUserSubscriptionState(
  userId: string,
  values: Pick<UserProfile, "subscriptionStatus" | "isSubscribed" | "subscriptionExpiresAt" | "subscriptionPlan" | "subscriptionProvider"> &
    Partial<{ paystackCustomerCode: string | null; paystackSubscriptionCode: string | null }>
) {
  const updatedAt = new Date().toISOString();
  const operational = subscriptionOperationalIndex(values.subscriptionStatus, values.subscriptionExpiresAt, userId);

  await db.send(
    new UpdateCommand({
      TableName: env.TABLE_NAME,
      Key: tableKeys.user(userId),
      UpdateExpression:
        "SET isSubscribed = :isSubscribed, subscriptionStatus = :subscriptionStatus, subscriptionExpiresAt = :subscriptionExpiresAt, subscriptionPlan = :subscriptionPlan, subscriptionProvider = :subscriptionProvider, paystackCustomerCode = :customerCode, paystackSubscriptionCode = :subscriptionCode, updatedAt = :updatedAt, GSI2PK = :gsi2pk, GSI2SK = :gsi2sk",
      ExpressionAttributeValues: {
        ":isSubscribed": values.isSubscribed,
        ":subscriptionStatus": values.subscriptionStatus,
        ":subscriptionExpiresAt": values.subscriptionExpiresAt,
        ":subscriptionPlan": values.subscriptionPlan,
        ":subscriptionProvider": values.subscriptionProvider,
        ":customerCode": values.paystackCustomerCode ?? null,
        ":subscriptionCode": values.paystackSubscriptionCode ?? null,
        ":updatedAt": updatedAt,
        ":gsi2pk": operational.GSI2PK,
        ":gsi2sk": operational.GSI2SK
      }
    })
  );

  return requireUserProfile(userId);
}

export function buildMaskedContact(name: string, phone: string) {
  return {
    name,
    phoneMasked: maskPhone(phone),
    phone: null,
    canContact: false
  };
}
