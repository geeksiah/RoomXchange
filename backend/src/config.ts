import { z } from "zod";

const envSchema = z.object({
  AWS_REGION: z.string().default("us-east-1"),
  ROOMXCHANGE_STAGE: z.string().default("dev"),
  TABLE_NAME: z.string().min(3),
  MEDIA_BUCKET_NAME: z.string().min(3),
  MEDIA_CDN_URL: z.string().url(),
  USER_POOL_ID: z.string().min(3),
  USER_POOL_CLIENT_ID: z.string().min(3),
  WEB_APP_URL: z.string().url(),
  PAYSTACK_SECRET_KEY: z.string().min(3),
  PAYSTACK_PLAN_CODE: z.string().min(3),
  OTP_SMS_TEMPLATE: z.string().default("Your RoomXchange verification code is {{code}}"),
  SUPPORT_EMAIL: z.string().email().default("support@roomxchange.com")
});

export const env = envSchema.parse(process.env);
