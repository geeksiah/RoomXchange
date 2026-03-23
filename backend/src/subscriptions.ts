import { GetCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { subscriptionCheckoutSchema, subscriptionStatusSchema, subscriptionVerifySchema, type SubscriptionStatus } from "@roomxchange/contracts";
import { db } from "./aws.js";
import { env } from "./config.js";
import type { PaymentEventItem, SubscriptionItem } from "./domain.js";
import { assert, assertFound } from "./errors.js";
import { tableKeys } from "./keys.js";
import { getUserProfile, requireUserProfile, setUserSubscriptionState } from "./auth.js";
import { initializeSubscriptionTransaction, verifyPaystackSignature, verifyTransaction, type PaystackVerifyResponse } from "./paystack.js";

function buildReference() {
  return `rx_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function inferExpiry(paidAt?: string) {
  const date = paidAt ? new Date(paidAt) : new Date();
  date.setUTCMonth(date.getUTCMonth() + 1);
  return date.toISOString();
}

async function storePaymentEvent(item: PaymentEventItem) {
  await db.send(
    new PutCommand({
      TableName: env.TABLE_NAME,
      Item: item
    })
  );
}

async function upsertSubscription(reference: string, verified: PaystackVerifyResponse) {
  const current = await db.send(
    new GetCommand({
      TableName: env.TABLE_NAME,
      Key: tableKeys.paymentCurrent(reference)
    })
  );
  const payment = assertFound(current.Item as PaymentEventItem | undefined, "Payment reference not found.");

  assert(verified.data.status === "success", 400, "Payment has not completed successfully yet.");

  const subscriptionExpiresAt = inferExpiry(verified.data.paid_at);
  const updatedUser = await setUserSubscriptionState(payment.userId, {
    isSubscribed: true,
    subscriptionStatus: "active",
    subscriptionExpiresAt,
    subscriptionPlan: verified.data.plan_object?.plan_code ?? env.PAYSTACK_PLAN_CODE,
    subscriptionProvider: "paystack",
    paystackCustomerCode: verified.data.customer?.customer_code ?? null,
    paystackSubscriptionCode: verified.data.subscription ?? null
  });

  const subscriptionItem: SubscriptionItem = {
    ...tableKeys.subscription(payment.userId),
    entity: "SUBSCRIPTION",
    isSubscribed: true,
    subscriptionStatus: "active",
    subscriptionExpiresAt,
    provider: "paystack",
    plan: verified.data.plan_object?.plan_code ?? env.PAYSTACK_PLAN_CODE,
    providerCode: verified.data.subscription ?? null,
    customerCode: verified.data.customer?.customer_code ?? null,
    reference,
    createdAt: updatedUser.createdAt,
    updatedAt: new Date().toISOString()
  };

  await db.send(
    new PutCommand({
      TableName: env.TABLE_NAME,
      Item: subscriptionItem
    })
  );

  await storePaymentEvent({
    ...tableKeys.paymentEvent(reference, new Date().toISOString()),
    entity: "PAYMENT_EVENT",
    reference,
    userId: payment.userId,
    status: "verified",
    source: "paystack",
    amount: verified.data.amount ?? null,
    raw: verified,
    createdAt: new Date().toISOString()
  });

  return subscriptionStatusSchema.parse({
    isSubscribed: updatedUser.isSubscribed,
    subscriptionStatus: updatedUser.subscriptionStatus,
    subscriptionExpiresAt: updatedUser.subscriptionExpiresAt,
    provider: updatedUser.subscriptionProvider,
    plan: updatedUser.subscriptionPlan
  });
}

export async function getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
  const user = await requireUserProfile(userId);
  return {
    isSubscribed: user.isSubscribed,
    subscriptionStatus: user.subscriptionStatus,
    subscriptionExpiresAt: user.subscriptionExpiresAt,
    provider: user.subscriptionProvider,
    plan: user.subscriptionPlan
  };
}

export async function createCheckoutLink(userId: string, input: unknown) {
  const parsed = subscriptionCheckoutSchema.parse(input);
  const user = await requireUserProfile(userId);
  const email = parsed.email ?? user.email;
  assert(email, 400, "An email address is required before starting checkout.");

  const reference = buildReference();
  const initializedAt = new Date().toISOString();
  const currentPayment: PaymentEventItem = {
    ...tableKeys.paymentCurrent(reference),
    entity: "PAYMENT_EVENT",
    reference,
    userId,
    status: "initialized",
    source: "checkout",
    amount: 0,
    raw: {
      userId,
      email
    },
    createdAt: initializedAt
  };

  await storePaymentEvent({
    ...tableKeys.paymentEvent(reference, initializedAt),
    ...currentPayment,
    SK: `EVENT#${initializedAt}`
  });

  await storePaymentEvent(currentPayment);

  const response = await initializeSubscriptionTransaction({
    email,
    amount: 5000,
    plan: env.PAYSTACK_PLAN_CODE,
    reference,
    callback_url: parsed.successUrl ?? `${env.WEB_APP_URL}/success?reference=${reference}`,
    metadata: {
      userId,
      phone: user.phone,
      source: "roomxchange-web"
    }
  });

  return {
    authorizationUrl: response.data.authorization_url,
    reference: response.data.reference
  };
}

export async function verifySubscription(input: unknown, rawBody?: string, signature?: string) {
  const parsed = subscriptionVerifySchema.parse(input);

  if (parsed.source === "webhook") {
    assert(rawBody, 400, "Webhook body is required.");
    assert(verifyPaystackSignature(rawBody, signature), 401, "Invalid Paystack signature.");
    const eventPayload = JSON.parse(rawBody) as { data?: { reference?: string } };
    assert(eventPayload.data?.reference, 400, "Webhook payload is missing a payment reference.");
    const verified = await verifyTransaction(eventPayload.data.reference);
    return upsertSubscription(eventPayload.data.reference, verified);
  }

  const verified = await verifyTransaction(parsed.reference);
  return upsertSubscription(parsed.reference, verified);
}

export async function expireSubscriptions(now = new Date().toISOString()) {
  const result = await db.send(
    new QueryCommand({
      TableName: env.TABLE_NAME,
      IndexName: "GSI2",
      KeyConditionExpression: "GSI2PK = :pk AND GSI2SK <= :cutoff",
      ExpressionAttributeValues: {
        ":pk": "SUBSCRIPTION_STATUS#ACTIVE",
        ":cutoff": `EXPIRES_AT#${now}#USER#zzzz`
      }
    })
  );

  await Promise.all(
    (result.Items ?? []).map(async (item) => {
      const userId = (item as { userId?: string }).userId;
      if (!userId) {
        return;
      }

      await setUserSubscriptionState(userId, {
        isSubscribed: false,
        subscriptionStatus: "expired",
        subscriptionExpiresAt: now,
        subscriptionPlan: env.PAYSTACK_PLAN_CODE,
        subscriptionProvider: "paystack"
      });
    })
  );

  return {
    expiredUsers: (result.Items ?? []).length
  };
}

export async function getCheckoutReadyProfile(userId: string) {
  return getUserProfile(userId);
}
