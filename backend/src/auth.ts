import {
  AdminCreateUserCommand,
  AdminGetUserCommand,
  AdminInitiateAuthCommand,
  AdminRespondToAuthChallengeCommand,
  AdminSetUserPasswordCommand,
  AdminUpdateUserAttributesCommand,
  ListUsersCommand
} from "@aws-sdk/client-cognito-identity-provider";
import { randomUUID } from "node:crypto";
import { DeleteCommand, GetCommand, PutCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import {
  authLoginSchema,
  authPasswordResetRequestSchema,
  authPasswordResetVerifySchema,
  authSignupRequestSchema,
  authSignupVerifySchema,
  otpRequestSchema,
  otpVerifySchema,
  profileUpdateSchema,
  type AuthSession,
  type ProfileUpdateInput,
  type UserProfile
} from "@roomxchange/contracts";
import { maskPhone, sanitizePhone } from "@roomxchange/shared";
import { cognito, db } from "./aws.js";
import { env } from "./config.js";
import type { PendingPasswordResetItem, PendingSignupItem, UserItem } from "./domain.js";
import { AppError, assertFound } from "./errors.js";
import { subscriptionOperationalIndex, tableKeys } from "./keys.js";
import { sendOtpSms } from "./sms.js";

type CognitoClaims = {
  sub: string;
  phone_number: string;
  name?: string;
  email?: string;
  "cognito:username"?: string;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isEmail(value: string) {
  return value.includes("@");
}

function normalizeIdentifier(identifier: string) {
  return isEmail(identifier) ? normalizeEmail(identifier) : sanitizePhone(identifier);
}

function createCode() {
  return `${Math.floor(100000 + Math.random() * 900000)}`;
}

function randomPassword() {
  return `${randomUUID()}Aa!1`;
}

function decodeJwtPayload<T>(token: string) {
  const [, payload] = token.split(".");
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as T;
}

function buildAuthTokens(result: NonNullable<Awaited<ReturnType<typeof signInWithPassword>>["AuthenticationResult"]>) {
  return {
    accessToken: result.AccessToken!,
    idToken: result.IdToken!,
    refreshToken: result.RefreshToken,
    expiresIn: result.ExpiresIn ?? 3600
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

async function getUserItem(userId: string) {
  const result = await db.send(
    new GetCommand({
      TableName: env.TABLE_NAME,
      Key: tableKeys.user(userId)
    })
  );

  return result.Item as UserItem | undefined;
}

async function findUserByIdentifier(identifier: string) {
  const normalized = normalizeIdentifier(identifier);
  const result = await db.send(
    new ScanCommand({
      TableName: env.TABLE_NAME,
      FilterExpression: "#entity = :entity AND (#phone = :identifier OR #email = :identifier)",
      ExpressionAttributeNames: {
        "#entity": "entity",
        "#phone": "phone",
        "#email": "email"
      },
      ExpressionAttributeValues: {
        ":entity": "USER",
        ":identifier": normalized
      },
      Limit: 1
    })
  );

  return (result.Items?.[0] as UserItem | undefined) ?? null;
}

async function getPendingSignup(sessionId: string) {
  const result = await db.send(
    new GetCommand({
      TableName: env.TABLE_NAME,
      Key: tableKeys.pendingSignup(sessionId)
    })
  );

  return result.Item as PendingSignupItem | undefined;
}

async function getPendingPasswordReset(sessionId: string) {
  const result = await db.send(
    new GetCommand({
      TableName: env.TABLE_NAME,
      Key: tableKeys.pendingPasswordReset(sessionId)
    })
  );

  return result.Item as PendingPasswordResetItem | undefined;
}

function assertCodeValid(item: { code: string; expiresAt: string }, code: string) {
  if (item.code !== code.trim() || Date.parse(item.expiresAt) < Date.now()) {
    throw new AppError(401, "The OTP code is invalid or expired.");
  }
}

async function findCognitoUsernameByAlias(identifier: string) {
  const normalized = normalizeIdentifier(identifier);
  const filter = isEmail(normalized)
    ? `email = "${normalized}"`
    : `phone_number = "${normalized}"`;

  const result = await cognito.send(
    new ListUsersCommand({
      UserPoolId: env.USER_POOL_ID,
      Filter: filter,
      Limit: 1
    })
  );

  return result.Users?.[0]?.Username ?? null;
}

async function upsertVerifiedUserProfile(input: {
  userId: string;
  cognitoUsername: string;
  phone: string;
  name: string;
  email: string;
}) {
  const timestamp = new Date().toISOString();
  const current = await getUserItem(input.userId);

  const item: UserItem = {
    ...tableKeys.user(input.userId),
    entity: "USER",
    userId: input.userId,
    phone: input.phone,
    name: input.name || current?.name || "RoomXchange Member",
    avatar: current?.avatar ?? null,
    email: input.email || current?.email || null,
    phonePublic: current?.phonePublic ?? false,
    role: current?.role ?? "member",
    accountStatus: current?.accountStatus ?? "active",
    isSubscribed: current?.isSubscribed ?? false,
    subscriptionStatus: current?.subscriptionStatus ?? "inactive",
    subscriptionProvider: current?.subscriptionProvider ?? null,
    subscriptionPlan: current?.subscriptionPlan ?? null,
    subscriptionExpiresAt: current?.subscriptionExpiresAt ?? null,
    cognitoUsername: input.cognitoUsername,
    paystackCustomerCode: current?.paystackCustomerCode ?? null,
    paystackSubscriptionCode: current?.paystackSubscriptionCode ?? null,
    listingsCount: current?.listingsCount ?? 0,
    successfulListings: current?.successfulListings ?? 0,
    createdAt: current?.createdAt ?? timestamp,
    updatedAt: timestamp,
    ...subscriptionOperationalIndex(current?.subscriptionStatus ?? "inactive", current?.subscriptionExpiresAt ?? null, input.userId)
  };

  await db.send(
    new PutCommand({
      TableName: env.TABLE_NAME,
      Item: item
    })
  );

  return toPublicUser(item);
}

async function upsertUserProfileFromClaims(claims: CognitoClaims) {
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
    cognitoUsername: current?.cognitoUsername ?? claims["cognito:username"] ?? claims.phone_number,
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

async function getCognitoSub(username: string) {
  const response = await cognito.send(
    new AdminGetUserCommand({
      UserPoolId: env.USER_POOL_ID,
      Username: username
    })
  );

  const sub = response.UserAttributes?.find((attribute) => attribute.Name === "sub")?.Value;
  if (!sub) {
    throw new AppError(500, "Cognito user is missing the subject identifier.");
  }

  return sub;
}

async function createOrUpdatePasswordUser(input: {
  phone: string;
  email: string;
  name: string;
  password: string;
  username?: string | null;
}) {
  const username = input.username ?? randomUUID();

  if (!input.username) {
    await cognito.send(
      new AdminCreateUserCommand({
        UserPoolId: env.USER_POOL_ID,
        Username: username,
        MessageAction: "SUPPRESS",
        UserAttributes: [
          { Name: "phone_number", Value: input.phone },
          { Name: "email", Value: input.email },
          { Name: "name", Value: input.name },
          { Name: "phone_number_verified", Value: "false" }
        ]
      })
    );
  } else {
    await cognito.send(
      new AdminUpdateUserAttributesCommand({
        UserPoolId: env.USER_POOL_ID,
        Username: username,
        UserAttributes: [
          { Name: "phone_number", Value: input.phone },
          { Name: "email", Value: input.email },
          { Name: "name", Value: input.name }
        ]
      })
    );
  }

  await cognito.send(
    new AdminSetUserPasswordCommand({
      UserPoolId: env.USER_POOL_ID,
      Username: username,
      Password: input.password,
      Permanent: true
    })
  );

  return {
    cognitoUsername: username,
    userId: await getCognitoSub(username)
  };
}

async function signInWithPassword(identifier: string, password: string) {
  return cognito.send(
    new AdminInitiateAuthCommand({
      UserPoolId: env.USER_POOL_ID,
      ClientId: env.USER_POOL_CLIENT_ID,
      AuthFlow: "ADMIN_USER_PASSWORD_AUTH",
      AuthParameters: {
        USERNAME: normalizeIdentifier(identifier),
        PASSWORD: password
      }
    })
  );
}

function assertActiveUser(user: UserProfile) {
  if (user.accountStatus === "frozen" || user.accountStatus === "removed") {
    throw new AppError(403, "This account is not active.");
  }
}

export async function loginWithPassword(input: unknown): Promise<AuthSession> {
  const parsed = authLoginSchema.parse(input);
  const response = await signInWithPassword(parsed.identifier, parsed.password);

  if (!response.AuthenticationResult?.IdToken || !response.AuthenticationResult.AccessToken) {
    throw new AppError(401, "Invalid login credentials.");
  }

  const claims = decodeJwtPayload<CognitoClaims>(response.AuthenticationResult.IdToken);
  const item = await getUserItem(claims.sub);
  if (!item) {
    throw new AppError(403, "Complete signup verification before logging in.");
  }

  const user = toPublicUser(item);
  assertActiveUser(user);
  return {
    user,
    tokens: buildAuthTokens(response.AuthenticationResult)
  };
}

export async function requestSignup(input: unknown) {
  const parsed = authSignupRequestSchema.parse(input);
  const phone = sanitizePhone(parsed.phone);
  const email = normalizeEmail(parsed.email);

  if (await findUserByIdentifier(phone) || (await findUserByIdentifier(email))) {
    throw new AppError(409, "An account with this phone or email already exists.");
  }

  const existingPhoneUsername = await findCognitoUsernameByAlias(phone);
  const existingEmailUsername = await findCognitoUsernameByAlias(email);
  if (existingPhoneUsername && existingEmailUsername && existingPhoneUsername !== existingEmailUsername) {
    throw new AppError(409, "This phone or email is already linked to another account.");
  }

  const createdUser = await createOrUpdatePasswordUser({
    phone,
    email,
    name: parsed.name,
    password: parsed.password,
    username: existingPhoneUsername ?? existingEmailUsername
  });

  const sessionId = randomUUID();
  const code = createCode();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 10 * 60_000).toISOString();
  const pending: PendingSignupItem = {
    ...tableKeys.pendingSignup(sessionId),
    entity: "PENDING_SIGNUP",
    sessionId,
    userId: createdUser.userId,
    cognitoUsername: createdUser.cognitoUsername,
    phone,
    email,
    name: parsed.name,
    code,
    expiresAt,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };

  await db.send(
    new PutCommand({
      TableName: env.TABLE_NAME,
      Item: pending
    })
  );

  await sendOtpSms(phone, code);

  return {
    session: sessionId,
    destination: maskPhone(phone)
  };
}

export async function verifySignup(input: unknown) {
  const parsed = authSignupVerifySchema.parse(input);
  const phone = sanitizePhone(parsed.phone);
  const pending = assertFound(await getPendingSignup(parsed.session), "Signup session not found.");
  assertCodeValid(pending, parsed.code);

  if (pending.phone !== phone) {
    throw new AppError(400, "This verification session does not match the phone number.");
  }

  await cognito.send(
    new AdminUpdateUserAttributesCommand({
      UserPoolId: env.USER_POOL_ID,
      Username: pending.cognitoUsername,
      UserAttributes: [
        { Name: "phone_number", Value: pending.phone },
        { Name: "phone_number_verified", Value: "true" },
        { Name: "email", Value: pending.email },
        { Name: "name", Value: pending.name }
      ]
    })
  );

  await upsertVerifiedUserProfile({
    userId: pending.userId,
    cognitoUsername: pending.cognitoUsername,
    phone: pending.phone,
    email: pending.email,
    name: pending.name
  });

  await db.send(
    new DeleteCommand({
      TableName: env.TABLE_NAME,
      Key: tableKeys.pendingSignup(parsed.session)
    })
  );

  return { success: true as const };
}

export async function requestPasswordReset(input: unknown) {
  const parsed = authPasswordResetRequestSchema.parse(input);
  const user = assertFound(await findUserByIdentifier(parsed.identifier), "Account not found.");
  const sessionId = randomUUID();
  const code = createCode();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 10 * 60_000).toISOString();
  const pending: PendingPasswordResetItem = {
    ...tableKeys.pendingPasswordReset(sessionId),
    entity: "PASSWORD_RESET",
    sessionId,
    userId: user.userId,
    cognitoUsername: user.cognitoUsername ?? user.phone,
    phone: user.phone,
    identifier: normalizeIdentifier(parsed.identifier),
    code,
    expiresAt,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };

  await db.send(
    new PutCommand({
      TableName: env.TABLE_NAME,
      Item: pending
    })
  );

  await sendOtpSms(user.phone, code);

  return {
    session: sessionId,
    destination: maskPhone(user.phone)
  };
}

export async function verifyPasswordReset(input: unknown) {
  const parsed = authPasswordResetVerifySchema.parse(input);
  const pending = assertFound(await getPendingPasswordReset(parsed.session), "Password reset session not found.");
  assertCodeValid(pending, parsed.code);

  if (pending.identifier !== normalizeIdentifier(parsed.identifier)) {
    throw new AppError(400, "This password reset session does not match the account.");
  }

  await cognito.send(
    new AdminSetUserPasswordCommand({
      UserPoolId: env.USER_POOL_ID,
      Username: pending.cognitoUsername,
      Password: parsed.newPassword,
      Permanent: true
    })
  );

  await db.send(
    new DeleteCommand({
      TableName: env.TABLE_NAME,
      Key: tableKeys.pendingPasswordReset(parsed.session)
    })
  );

  return { success: true as const };
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
        ...(parsed.email ? [{ Name: "email", Value: normalizeEmail(parsed.email) }] : [])
      ]
    })
  );

  const claims = decodeJwtPayload<CognitoClaims>(response.AuthenticationResult.IdToken);
  const user = await upsertUserProfileFromClaims({
    ...claims,
    name: parsed.name ?? claims.name,
    email: parsed.email ? normalizeEmail(parsed.email) : claims.email
  });

  assertActiveUser(user);

  return {
    user,
    tokens: buildAuthTokens(response.AuthenticationResult)
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
