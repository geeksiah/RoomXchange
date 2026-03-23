import { randomUUID } from "node:crypto";
import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { reportCreateSchema, reportUpdateSchema } from "@roomxchange/contracts";
import { db } from "./aws.js";
import { env } from "./config.js";
import type { ReportItem } from "./domain.js";
import { AppError, assertFound } from "./errors.js";
import { tableKeys } from "./keys.js";

export async function createReport(userId: string, input: unknown) {
  const parsed = reportCreateSchema.parse(input);
  const now = new Date().toISOString();
  const reportId = randomUUID();

  const listing = await db.send(
    new GetCommand({
      TableName: env.TABLE_NAME,
      Key: tableKeys.listingLookup(parsed.listingId)
    })
  );
  assertFound(listing.Item, "Listing not found.");

  const item: ReportItem = {
    ...tableKeys.report(reportId),
    entity: "REPORT",
    reportId,
    listingId: parsed.listingId,
    reporterId: userId,
    targetUserId: parsed.targetUserId,
    reason: parsed.reason,
    status: "open",
    resolutionNote: null,
    createdAt: now,
    updatedAt: now,
    GSI1PK: "REPORT_STATUS#OPEN",
    GSI1SK: `CREATED_AT#${now}#REPORT#${reportId}`
  };

  await db.send(
    new PutCommand({
      TableName: env.TABLE_NAME,
      Item: item
    })
  );

  return item;
}

export async function getReports(status = "open") {
  const result = await db.send(
    new QueryCommand({
      TableName: env.TABLE_NAME,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :pk",
      ExpressionAttributeValues: {
        ":pk": `REPORT_STATUS#${status.toUpperCase()}`
      },
      ScanIndexForward: false
    })
  );

  return (result.Items ?? []) as ReportItem[];
}

export async function updateReport(reportId: string, adminId: string, input: unknown) {
  const parsed = reportUpdateSchema.parse(input);
  const now = new Date().toISOString();

  await db.send(
    new UpdateCommand({
      TableName: env.TABLE_NAME,
      Key: tableKeys.report(reportId),
      UpdateExpression:
        "SET #status = :status, resolutionNote = :resolutionNote, updatedAt = :updatedAt, GSI1PK = :gsi1pk, GSI1SK = :gsi1sk",
      ExpressionAttributeNames: {
        "#status": "status"
      },
      ExpressionAttributeValues: {
        ":status": parsed.status,
        ":resolutionNote": parsed.resolutionNote ?? null,
        ":updatedAt": now,
        ":gsi1pk": `REPORT_STATUS#${parsed.status.toUpperCase()}`,
        ":gsi1sk": `CREATED_AT#${now}#REPORT#${reportId}`
      }
    })
  );

  await db.send(
    new PutCommand({
      TableName: env.TABLE_NAME,
      Item: {
        ...tableKeys.adminEvent(adminId, now),
        entity: "ADMIN_EVENT",
        adminId,
        reportId,
        action: "report.update",
        resolutionNote: parsed.resolutionNote ?? null,
        status: parsed.status,
        createdAt: now
      }
    })
  );

  const updated = await db.send(
    new GetCommand({
      TableName: env.TABLE_NAME,
      Key: tableKeys.report(reportId)
    })
  );

  return updated.Item as ReportItem;
}

export async function assertAdmin(userId: string) {
  const result = await db.send(
    new GetCommand({
      TableName: env.TABLE_NAME,
      Key: tableKeys.user(userId)
    })
  );

  if ((result.Item as { role?: string } | undefined)?.role !== "admin") {
    throw new AppError(403, "Admin access is required.");
  }
}
