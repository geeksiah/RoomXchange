import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { Buffer } from "node:buffer";
import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import type { IncomingHttpHeaders, IncomingMessage } from "node:http";
import type { APIGatewayProxyEvent } from "aws-lambda";
import { handler } from "./handlers/api.js";

const port = Number(process.env.PORT ?? 4000);

function loadDotEnvIntoProcess() {
  const candidatePaths = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "..", ".env"),
    path.resolve(process.cwd(), "..", "..", ".env")
  ];

  const envFilePath = candidatePaths.find((candidate) => existsSync(candidate));
  if (!envFilePath) {
    return;
  }

  const values = Object.fromEntries(
    readFileSync(envFilePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const separatorIndex = line.indexOf("=");
        const key = line.slice(0, separatorIndex).trim();
        const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");
        return [key, value];
      })
  );

  for (const [key, value] of Object.entries(values)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadDotEnvIntoProcess();

function readBody(req: IncomingMessage) {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function normalizeHeaders(headers: IncomingHttpHeaders) {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key, Array.isArray(value) ? value.join(",") : value ?? ""])
  );
}

function decodeClaims(headers: Record<string, string>) {
  const authorization = headers.authorization ?? headers.Authorization;
  if (!authorization?.startsWith("Bearer ")) {
    return {};
  }

  try {
    const token = authorization.slice("Bearer ".length);
    const payload = token.split(".")[1];
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Record<string, string>;
  } catch {
    return {};
  }
}

function resolveResource(pathname: string) {
  const patterns: Array<{ test: RegExp; resource: string; params?: (match: RegExpMatchArray) => Record<string, string> }> = [
    { test: /^\/auth\/request-otp$/, resource: "/auth/request-otp" },
    { test: /^\/admin\/auth\/login$/, resource: "/admin/auth/login" },
    { test: /^\/auth\/signup\/request$/, resource: "/auth/signup/request" },
    { test: /^\/auth\/signup\/verify$/, resource: "/auth/signup/verify" },
    { test: /^\/auth\/login$/, resource: "/auth/login" },
    { test: /^\/auth\/password-reset\/request$/, resource: "/auth/password-reset/request" },
    { test: /^\/auth\/password-reset\/verify$/, resource: "/auth/password-reset/verify" },
    { test: /^\/auth\/verify-otp$/, resource: "/auth/verify-otp" },
    { test: /^\/auth\/me$/, resource: "/auth/me" },
    { test: /^\/uploads\/presign$/, resource: "/uploads/presign" },
    { test: /^\/listings\/create$/, resource: "/listings/create" },
    { test: /^\/listings\/feed$/, resource: "/listings/feed" },
    {
      test: /^\/listings\/user\/([^/]+)$/,
      resource: "/listings/user/{userId}",
      params: (match) => ({ userId: match[1] })
    },
    {
      test: /^\/listings\/([^/]+)$/,
      resource: "/listings/{id}",
      params: (match) => ({ id: match[1] })
    },
    { test: /^\/subscription\/status$/, resource: "/subscription/status" },
    { test: /^\/app\/notification-settings$/, resource: "/app/notification-settings" },
    { test: /^\/app\/notifications$/, resource: "/app/notifications" },
    { test: /^\/app\/notifications\/read-all$/, resource: "/app/notifications/read-all" },
    { test: /^\/app\/notifications\/clear$/, resource: "/app/notifications/clear" },
    {
      test: /^\/app\/notifications\/([^/]+)$/,
      resource: "/app/notifications/{id}",
      params: (match) => ({ id: match[1] })
    },
    { test: /^\/app\/push-token\/register$/, resource: "/app/push-token/register" },
    { test: /^\/app\/push-token\/unregister$/, resource: "/app/push-token/unregister" },
    { test: /^\/app\/reminders$/, resource: "/app/reminders" },
    {
      test: /^\/app\/reminders\/([^/]+)$/,
      resource: "/app/reminders/{id}",
      params: (match) => ({ id: match[1] })
    },
    { test: /^\/subscription\/checkout-link$/, resource: "/subscription/checkout-link" },
    { test: /^\/subscription\/verify$/, resource: "/subscription/verify" },
    { test: /^\/reports\/create$/, resource: "/reports/create" },
    { test: /^\/reports\/mine$/, resource: "/reports/mine" },
    { test: /^\/conversations\/open$/, resource: "/conversations/open" },
    { test: /^\/conversations$/, resource: "/conversations" },
    { test: /^\/conversations\/read-all$/, resource: "/conversations/read-all" },
    {
      test: /^\/conversations\/([^/]+)$/,
      resource: "/conversations/{id}",
      params: (match) => ({ id: match[1] })
    },
    {
      test: /^\/conversations\/([^/]+)\/messages$/,
      resource: "/conversations/{id}/messages",
      params: (match) => ({ id: match[1] })
    },
    {
      test: /^\/conversations\/([^/]+)\/messages\/delete$/,
      resource: "/conversations/{id}/messages/delete",
      params: (match) => ({ id: match[1] })
    },
    { test: /^\/admin\/reports$/, resource: "/admin/reports" },
    {
      test: /^\/admin\/reports\/([^/]+)$/,
      resource: "/admin/reports/{id}",
      params: (match) => ({ id: match[1] })
    },
    { test: /^\/admin\/users$/, resource: "/admin/users" },
    {
      test: /^\/admin\/users\/([^/]+)$/,
      resource: "/admin/users/{id}",
      params: (match) => ({ id: match[1] })
    },
    { test: /^\/admin\/listings$/, resource: "/admin/listings" },
    {
      test: /^\/admin\/listings\/([^/]+)$/,
      resource: "/admin/listings/{id}",
      params: (match) => ({ id: match[1] })
    },
    { test: /^\/admin\/analytics$/, resource: "/admin/analytics" }
    ,
    { test: /^\/admin\/conversations$/, resource: "/admin/conversations" },
    {
      test: /^\/admin\/conversations\/([^/]+)$/,
      resource: "/admin/conversations/{id}",
      params: (match) => ({ id: match[1] })
    },
    { test: /^\/admin\/subscriptions$/, resource: "/admin/subscriptions" },
    {
      test: /^\/admin\/subscriptions\/([^/]+)$/,
      resource: "/admin/subscriptions/{id}",
      params: (match) => ({ id: match[1] })
    },
    { test: /^\/admin\/notifications\/settings$/, resource: "/admin/notifications/settings" }
  ];

  for (const pattern of patterns) {
    const match = pathname.match(pattern.test);
    if (match) {
      return {
        resource: pattern.resource,
        pathParameters: pattern.params?.(match) ?? null
      };
    }
  }

  return {
    resource: pathname,
    pathParameters: null
  };
}

function toEvent(
  req: IncomingMessage,
  body: string
): APIGatewayProxyEvent {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const headers = normalizeHeaders(req.headers);
  const { resource, pathParameters } = resolveResource(url.pathname);
  const queryStringParameters = Object.fromEntries(url.searchParams.entries());

  return {
    body: body || null,
    headers,
    multiValueHeaders: {},
    httpMethod: req.method ?? "GET",
    isBase64Encoded: false,
    path: url.pathname,
    pathParameters,
    queryStringParameters: Object.keys(queryStringParameters).length ? queryStringParameters : null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    resource,
    requestContext: {
      authorizer: {
        claims: decodeClaims(headers)
      }
    } as unknown as APIGatewayProxyEvent["requestContext"]
  } as APIGatewayProxyEvent;
}

createServer(async (req, res) => {
  if (!req.url) {
    res.writeHead(400, { "content-type": "application/json" });
    res.end(JSON.stringify({ message: "Missing request URL." }));
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);
  if (url.pathname === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, mode: "local-dev" }));
    return;
  }

  try {
    const body = await readBody(req);
    const response = await handler(toEvent(req, body));
    res.writeHead(response.statusCode, (response.headers ?? {}) as Record<string, string | number>);
    res.end(response.body);
  } catch (error) {
    console.error("Local API error", error);
    res.writeHead(500, { "content-type": "application/json" });
    res.end(
      JSON.stringify({
        message: error instanceof Error ? error.message : "Unknown local server error.",
        details: process.env.NODE_ENV === "development" ? String(error) : undefined
      })
    );
  }
}).listen(port, () => {
  console.log(`RoomXchange local API listening on http://localhost:${port}`);
});
