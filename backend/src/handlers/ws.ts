import type { APIGatewayProxyResult, APIGatewayProxyWebsocketEventV2 } from "aws-lambda";
import { GetUserCommand } from "@aws-sdk/client-cognito-identity-provider";
import { cognito } from "../aws.js";
import { disconnectSocket, connectSocket } from "../conversations.js";

function response(statusCode: number, body: string) {
  return {
    statusCode,
    body
  } satisfies APIGatewayProxyResult;
}

function getSub(attributes: Array<{ Name?: string; Value?: string }> | undefined) {
  return attributes?.find((attribute) => attribute.Name === "sub")?.Value ?? null;
}

export async function connectHandler(event: APIGatewayProxyWebsocketEventV2) {
  const token = (event as { queryStringParameters?: Record<string, string | undefined> }).queryStringParameters?.token;
  const connectionId = event.requestContext.connectionId;

  if (!token || !connectionId) {
    return response(401, "Missing websocket token.");
  }

  try {
    const result = await cognito.send(
      new GetUserCommand({
        AccessToken: token
      })
    );

    const userId = getSub(result.UserAttributes);
    if (!userId) {
      return response(401, "User identity is missing.");
    }

    await connectSocket(userId, connectionId);
    return response(200, "Connected.");
  } catch {
    return response(401, "Invalid websocket token.");
  }
}

export async function disconnectHandler(event: APIGatewayProxyWebsocketEventV2) {
  const connectionId = event.requestContext.connectionId;
  if (!connectionId) {
    return response(200, "No connection.");
  }

  await disconnectSocket(connectionId);
  return response(200, "Disconnected.");
}

export async function defaultHandler() {
  return response(200, "Ignored.");
}
