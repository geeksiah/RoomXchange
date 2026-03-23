import { randomUUID } from "node:crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { uploadPresignSchema, type UploadPresignResponse } from "@roomxchange/contracts";
import { db, s3 } from "./aws.js";
import { env } from "./config.js";
import type { UploadItem } from "./domain.js";
import { tableKeys, uploadOperationalIndex } from "./keys.js";

const extensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

export async function createPresignedUpload(userId: string, input: unknown): Promise<UploadPresignResponse> {
  const parsed = uploadPresignSchema.parse(input);
  const uploadId = randomUUID();
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const key = `users/${userId}/uploads/${uploadId}.${extensions[parsed.contentType]}`;
  const fileUrl = `${env.MEDIA_CDN_URL}/${key}`;
  const uploadUrl = await getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: env.MEDIA_BUCKET_NAME,
      Key: key,
      ContentType: parsed.contentType
    }),
    {
      expiresIn: 60 * 15
    }
  );

  const item: UploadItem = {
    ...tableKeys.upload(userId, uploadId),
    entity: "UPLOAD",
    uploadId,
    userId,
    key,
    fileUrl,
    contentType: parsed.contentType,
    status: "pending",
    expiresAt,
    createdAt,
    updatedAt: createdAt,
    ...uploadOperationalIndex("pending", expiresAt, uploadId)
  };

  await db.send(
    new PutCommand({
      TableName: env.TABLE_NAME,
      Item: item
    })
  );

  return {
    uploadId,
    key,
    uploadUrl,
    fileUrl,
    headers: {
      "content-type": parsed.contentType
    }
  };
}

export async function markUploadsComplete(userId: string, imageUrls: string[]) {
  await Promise.all(
    imageUrls.map(async (imageUrl) => {
      const path = new URL(imageUrl).pathname.split("/").pop();
      const uploadId = path?.split(".")[0];
      if (!uploadId) {
        return;
      }

      const timestamp = new Date().toISOString();
      await db.send(
        new UpdateCommand({
          TableName: env.TABLE_NAME,
          Key: tableKeys.upload(userId, uploadId),
          UpdateExpression: "SET #status = :status, updatedAt = :updatedAt, GSI2PK = :gsi2pk, GSI2SK = :gsi2sk",
          ExpressionAttributeNames: {
            "#status": "status"
          },
          ExpressionAttributeValues: {
            ":status": "completed",
            ":updatedAt": timestamp,
            ":gsi2pk": "UPLOAD_STATUS#COMPLETED",
            ":gsi2sk": `UPDATED_AT#${timestamp}#UPLOAD#${uploadId}`
          }
        })
      );
    })
  );
}
