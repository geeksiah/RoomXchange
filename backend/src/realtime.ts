import { Buffer } from "node:buffer";
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from "@aws-sdk/client-apigatewaymanagementapi";
import { DeleteCommand, QueryCommand as DbQueryCommand } from "@aws-sdk/lib-dynamodb";
import type { RealtimeEvent } from "@roomxchange/contracts";
import { db } from "./aws.js";
import { env } from "./config.js";
import type { UserSocketItem } from "./domain.js";
import { tableKeys } from "./keys.js";

const managementClient = env.WEBSOCKET_API_ENDPOINT
  ? new ApiGatewayManagementApiClient({ endpoint: env.WEBSOCKET_API_ENDPOINT })
  : null;

export async function pushRealtimeToUser(userId: string, event: RealtimeEvent) {
  if (!managementClient) {
    return;
  }

  const sockets = await db.send(
    new DbQueryCommand({
      TableName: env.TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `USER#${userId}`,
        ":sk": "SOCKET#"
      }
    })
  );

  for (const socket of (sockets.Items ?? []) as UserSocketItem[]) {
    try {
      await managementClient.send(
        new PostToConnectionCommand({
          ConnectionId: socket.connectionId,
          Data: Buffer.from(JSON.stringify(event))
        })
      );
    } catch (error) {
      if (String(error).includes("GoneException")) {
        await db.send(
          new DeleteCommand({
            TableName: env.TABLE_NAME,
            Key: tableKeys.userSocket(userId, socket.connectionId)
          })
        );
        await db.send(
          new DeleteCommand({
            TableName: env.TABLE_NAME,
            Key: tableKeys.socketLookup(socket.connectionId)
          })
        );
      }
    }
  }
}
