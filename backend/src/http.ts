import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { z } from "zod";
import { AppError } from "./errors.js";

type Claims = Record<string, string | undefined>;

export function json<T>(statusCode: number, body: T): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "authorization,content-type,x-paystack-signature",
      "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS"
    },
    body: JSON.stringify(body)
  };
}

export function ok<T>(body: T) {
  return json(200, body);
}

export function created<T>(body: T) {
  return json(201, body);
}

export function noContent(): APIGatewayProxyResult {
  return {
    statusCode: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "authorization,content-type,x-paystack-signature",
      "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS"
    },
    body: ""
  };
}

export function parseBody<T>(event: APIGatewayProxyEvent, schema: z.Schema<T>) {
  const body = event.body ? JSON.parse(event.body) : {};
  return schema.parse(body);
}

export function getQuery(event: APIGatewayProxyEvent) {
  return event.queryStringParameters ?? {};
}

export function getClaims(event: APIGatewayProxyEvent): Claims {
  return (event.requestContext.authorizer?.claims as Claims | undefined) ?? {};
}

export function getCurrentUserId(event: APIGatewayProxyEvent) {
  return getClaims(event).sub ?? null;
}

function isZodLikeError(error: unknown): error is { flatten: () => unknown } {
  return Boolean(
    error &&
      typeof error === "object" &&
      "issues" in error &&
      Array.isArray((error as { issues?: unknown }).issues) &&
      "flatten" in error &&
      typeof (error as { flatten?: unknown }).flatten === "function"
  );
}

export function handleError(error: unknown) {
  if (error instanceof AppError) {
    return json(error.statusCode, {
      message: error.message,
      details: error.details ?? null
    });
  }

  if (error instanceof z.ZodError || isZodLikeError(error)) {
    return json(400, {
      message: "Validation failed.",
      details: error.flatten()
    });
  }

  console.error("Unhandled error", error);
  return json(500, {
    message: "Internal server error."
  });
}
