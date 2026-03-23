import { z } from "zod";

const envFields = {
  AWS_REGION: z.string().default("us-east-1"),
  ROOMXCHANGE_STAGE: z.string().default("dev"),
  TABLE_NAME: z.string().min(3),
  MEDIA_BUCKET_NAME: z.string().min(3),
  MEDIA_CDN_URL: z.string().url(),
  USER_POOL_ID: z.string().min(3),
  USER_POOL_CLIENT_ID: z.string().min(3),
  WEB_APP_URL: z.string().url().default("http://localhost:3000"),
  PAYSTACK_SECRET_KEY: z.string().min(3),
  PAYSTACK_PLAN_CODE: z.string().min(3),
  OTP_SMS_TEMPLATE: z.string().default("Your RoomXchange verification code is {{code}}"),
  SUPPORT_EMAIL: z.string().email().default("support@roomxchange.com")
} as const;

const aliases: Partial<Record<keyof typeof envFields, string[]>> = {
  TABLE_NAME: ["ROOMXCHANGE_TABLE_NAME"],
  MEDIA_BUCKET_NAME: ["ROOMXCHANGE_MEDIA_BUCKET_NAME"],
  MEDIA_CDN_URL: ["ROOMXCHANGE_MEDIA_CDN_URL", "ROOMXCHANGE_MEDIA_URL"],
  USER_POOL_ID: ["ROOMXCHANGE_USER_POOL_ID"],
  USER_POOL_CLIENT_ID: ["ROOMXCHANGE_USER_POOL_CLIENT_ID"],
  WEB_APP_URL: ["ROOMXCHANGE_WEB_URL"],
  PAYSTACK_SECRET_KEY: ["ROOMXCHANGE_PAYSTACK_SECRET_KEY"],
  PAYSTACK_PLAN_CODE: ["ROOMXCHANGE_PAYSTACK_PLAN_CODE"]
};

type Env = {
  [K in keyof typeof envFields]: z.infer<(typeof envFields)[K]>;
};

function resolveRawValue(key: keyof typeof envFields) {
  return [key, ...(aliases[key] ?? [])]
    .map((name) => process.env[name])
    .find((value) => value !== undefined);
}

function getEnvValue<K extends keyof typeof envFields>(key: K): Env[K] {
  const parsed = envFields[key].safeParse(resolveRawValue(key));
  if (!parsed.success) {
    const names = [key, ...(aliases[key] ?? [])].join(" / ");
    throw new Error(`Missing or invalid environment variable: ${names}`);
  }
  return parsed.data;
}

export const env = new Proxy(
  {},
  {
    get(_target, property: string) {
      if (!(property in envFields)) {
        return undefined;
      }
      return getEnvValue(property as keyof typeof envFields);
    }
  }
) as Env;
