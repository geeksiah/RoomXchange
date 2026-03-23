import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { ScheduledEvent } from "aws-lambda";
import { db, s3 } from "./aws.js";
import { env } from "./config.js";
import type { UploadItem } from "./domain.js";
import { tableKeys } from "./keys.js";
import { expireSubscriptions } from "./subscriptions.js";

export async function subscriptionReconciliationHandler(_event: ScheduledEvent) {
  const result = await expireSubscriptions();
  return {
    ok: true,
    ...result
  };
}

export async function staleUploadCleanupHandler(_event: ScheduledEvent) {
  const now = new Date().toISOString();
  const result = await db.send(
    new QueryCommand({
      TableName: env.TABLE_NAME,
      IndexName: "GSI2",
      KeyConditionExpression: "GSI2PK = :pk AND GSI2SK <= :cutoff",
      ExpressionAttributeValues: {
        ":pk": "UPLOAD_STATUS#PENDING",
        ":cutoff": `EXPIRES_AT#${now}#UPLOAD#zzzz`
      }
    })
  );

  for (const item of (result.Items ?? []) as UploadItem[]) {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: env.MEDIA_BUCKET_NAME,
        Key: item.key
      })
    );

    await db.send(
      new UpdateCommand({
        TableName: env.TABLE_NAME,
        Key: tableKeys.upload(item.userId, item.uploadId),
        UpdateExpression: "SET #status = :status, updatedAt = :updatedAt, GSI2PK = :gsi2pk, GSI2SK = :gsi2sk",
        ExpressionAttributeNames: {
          "#status": "status"
        },
        ExpressionAttributeValues: {
          ":status": "deleted",
          ":updatedAt": now,
          ":gsi2pk": "UPLOAD_STATUS#DELETED",
          ":gsi2sk": `UPDATED_AT#${now}#UPLOAD#${item.uploadId}`
        }
      })
    );
  }

  return {
    ok: true,
    deletedUploads: (result.Items ?? []).length
  };
}

export async function operationalAuditHandler(_event: ScheduledEvent) {
  return {
    ok: true,
    stage: env.ROOMXCHANGE_STAGE,
    auditedAt: new Date().toISOString()
  };
}
