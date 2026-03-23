import crypto from "node:crypto";
import { env } from "./config.js";
import { AppError } from "./errors.js";

type PaystackInitializeResponse = {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    reference: string;
  };
};

export type PaystackVerifyResponse = {
  status: boolean;
  message: string;
  data: {
    status: string;
    paid_at?: string;
    amount?: number;
    reference: string;
    customer?: {
      customer_code?: string;
      email?: string;
    };
    metadata?: Record<string, unknown>;
    plan_object?: {
      plan_code?: string;
      interval?: string;
    };
    subscription?: string;
  };
};

async function paystackFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`https://api.paystack.co${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
      ...(init?.headers ?? {})
    }
  });

  const payload = (await response.json()) as T & { message?: string };
  if (!response.ok) {
    throw new AppError(502, payload.message ?? "Paystack request failed.");
  }

  return payload;
}

export async function initializeSubscriptionTransaction(input: {
  email: string;
  amount: number;
  plan: string;
  reference: string;
  callback_url: string;
  metadata: Record<string, unknown>;
}) {
  return paystackFetch<PaystackInitializeResponse>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function verifyTransaction(reference: string) {
  return paystackFetch<PaystackVerifyResponse>(`/transaction/verify/${reference}`);
}

export function verifyPaystackSignature(rawBody: string, signature: string | undefined) {
  if (!signature) {
    return false;
  }

  const digest = crypto.createHmac("sha512", env.PAYSTACK_SECRET_KEY).update(rawBody).digest("hex");
  return digest === signature;
}
