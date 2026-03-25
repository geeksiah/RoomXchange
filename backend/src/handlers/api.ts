import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { z } from "zod";
import { adminLogin } from "../admin-auth.js";
import {
  deleteAdminConversation,
  deleteAdminListing,
  getAdminAnalytics,
  getAdminConversations,
  getAdminListings,
  getAdminSubscriptions,
  getAdminUsers,
  updateAdminListing,
  updateAdminNotificationSettings,
  updateAdminSubscription,
  updateAdminUser
} from "../admin.js";
import { AppError } from "../errors.js";
import { created, getCurrentUserId, getQuery, handleError, noContent, ok, parseBody } from "../http.js";
import {
  getUserProfile,
  loginWithPassword,
  requestOtp,
  requestPasswordReset,
  requestSignup,
  updateUserProfile,
  verifyOtp,
  verifyPasswordReset,
  verifySignup
} from "../auth.js";
import {
  deleteConversation,
  deleteConversationMessages,
  getConversationMessages,
  getConversations,
  markAllConversationsRead,
  openConversation,
  sendConversationMessage
} from "../conversations.js";
import { archiveListing, createListing, getFeed, getListingById, getUserListings, updateListing } from "../listings.js";
import {
  isLocalAdminMode,
  localAdminLogin,
  localCreateReport,
  localGetAdminAnalytics,
  localGetAdminConversations,
  localGetAdminListings,
  localGetAdminSubscriptions,
  localGetAdminUsers,
  localGetNotificationSettings,
  localGetReports,
  localGetUserProfile,
  localUpdateAdminListing,
  localUpdateAdminNotificationSettings,
  localUpdateAdminSubscription,
  localUpdateAdminUser,
  localUpdateReport,
  localDeleteAdminConversation,
  localDeleteAdminListing
} from "../local-admin.js";
import {
  clearUserNotifications,
  deleteUserNotification,
  deleteUserReminder,
  getNotificationSettings,
  getUserNotifications,
  getUserReminders,
  markAllNotificationsRead,
  updateUserNotification,
  upsertUserReminder
} from "../notifications.js";
import { registerPushToken, unregisterPushToken } from "../push.js";
import { assertAdmin, createReport, getMyReports, getReports, updateReport } from "../reports.js";
import { createCheckoutLink, getSubscriptionStatus, verifySubscription } from "../subscriptions.js";
import { createPresignedUpload } from "../uploads.js";

const passthroughSchema = z.unknown();
type ResolvedRoute = {
  resource: string;
  params: Record<string, string>;
};

const routePatterns = [
  "/admin/notifications/settings",
  "/admin/subscriptions/{id}",
  "/admin/subscriptions",
  "/admin/conversations/{id}",
  "/admin/conversations",
  "/admin/listings/{id}",
  "/admin/listings",
  "/admin/users/{id}",
  "/admin/users",
  "/admin/reports/{id}",
  "/admin/reports",
  "/admin/analytics",
  "/admin/auth/login",
  "/auth/password-reset/request",
  "/auth/password-reset/verify",
  "/auth/signup/request",
  "/auth/signup/verify",
  "/auth/login",
  "/conversations/{id}/messages/delete",
  "/conversations/{id}/messages",
  "/conversations/read-all",
  "/conversations/open",
  "/conversations/{id}",
  "/conversations",
  "/reports/create",
  "/reports/mine",
  "/subscription/checkout-link",
  "/subscription/verify",
  "/subscription/status",
  "/uploads/presign",
  "/listings/user/{userId}",
  "/listings/create",
  "/listings/feed",
  "/listings/{id}",
  "/app/notifications/read-all",
  "/app/notifications/clear",
  "/app/notifications/{id}",
  "/app/notifications",
  "/app/push-token/register",
  "/app/push-token/unregister",
  "/app/reminders/{id}",
  "/app/reminders",
  "/app/notification-settings",
  "/auth/request-otp",
  "/auth/verify-otp",
  "/auth/me"
];

function resolveRoute(event: APIGatewayProxyEvent): ResolvedRoute {
  const explicitParams = Object.fromEntries(
    Object.entries(event.pathParameters ?? {}).filter((entry): entry is [string, string] => typeof entry[1] === "string")
  );
  const explicitResource = event.resource ?? event.path;
  if (explicitResource && explicitResource !== "/{proxy+}") {
    return {
      resource: explicitResource,
      params: explicitParams
    };
  }

  const requestPath = event.path.startsWith("/") ? event.path : `/${event.path}`;
  for (const pattern of routePatterns) {
    const paramNames = [...pattern.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]);
    const regex = new RegExp(`^${pattern.replace(/\{[^}]+\}/g, "([^/]+)")}$`);
    const matched = requestPath.match(regex);
    if (!matched) {
      continue;
    }

    const params = Object.fromEntries(paramNames.map((name, index) => [name, matched[index + 1] ?? ""]));
    return {
      resource: pattern,
      params
    };
  }

  return {
    resource: requestPath,
    params: explicitParams
  };
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    if (event.httpMethod === "OPTIONS") {
      return noContent();
    }

    const localAdminMode = isLocalAdminMode();
    const currentUserId = getCurrentUserId(event);
    const route = resolveRoute(event);
    const resource = route.resource;
    const pathParams = route.params;

    if (resource === "/auth/request-otp" && event.httpMethod === "POST") {
      return created(await requestOtp(parseBody(event, passthroughSchema)));
    }

    if (resource === "/auth/signup/request" && event.httpMethod === "POST") {
      return created(await requestSignup(parseBody(event, passthroughSchema)));
    }

    if (resource === "/auth/signup/verify" && event.httpMethod === "POST") {
      return ok(await verifySignup(parseBody(event, passthroughSchema)));
    }

    if (resource === "/auth/login" && event.httpMethod === "POST") {
      return ok(await loginWithPassword(parseBody(event, passthroughSchema)));
    }

    if (resource === "/auth/password-reset/request" && event.httpMethod === "POST") {
      return created(await requestPasswordReset(parseBody(event, passthroughSchema)));
    }

    if (resource === "/auth/password-reset/verify" && event.httpMethod === "POST") {
      return ok(await verifyPasswordReset(parseBody(event, passthroughSchema)));
    }

    if (resource === "/admin/auth/login" && event.httpMethod === "POST") {
      return ok(await (localAdminMode ? localAdminLogin(parseBody(event, passthroughSchema)) : adminLogin(parseBody(event, passthroughSchema))));
    }

    if (resource === "/auth/verify-otp" && event.httpMethod === "POST") {
      return ok(await verifyOtp(parseBody(event, passthroughSchema)));
    }

    if (resource === "/auth/me" && event.httpMethod === "GET") {
      if (!currentUserId) {
        throw new AppError(401, "Authentication is required.");
      }

      return ok(await (localAdminMode ? localGetUserProfile(currentUserId) : getUserProfile(currentUserId)));
    }

    if (resource === "/auth/me" && event.httpMethod === "PATCH") {
      if (!currentUserId) {
        throw new AppError(401, "Authentication is required.");
      }

      return ok(await updateUserProfile(currentUserId, parseBody(event, passthroughSchema)));
    }

    if (resource === "/uploads/presign" && event.httpMethod === "POST") {
      if (!currentUserId) {
        throw new AppError(401, "Authentication is required.");
      }

      return created(await createPresignedUpload(currentUserId, parseBody(event, passthroughSchema)));
    }

    if (resource === "/listings/create" && event.httpMethod === "POST") {
      if (!currentUserId) {
        throw new AppError(401, "Authentication is required.");
      }

      return created(await createListing(currentUserId, parseBody(event, passthroughSchema)));
    }

    if (resource === "/listings/feed" && event.httpMethod === "GET") {
      return ok(await getFeed(getQuery(event)));
    }

    if (resource === "/listings/{id}" && event.httpMethod === "GET") {
      return ok(await getListingById(pathParams.id ?? "", currentUserId));
    }

    if (resource === "/listings/{id}" && event.httpMethod === "PATCH") {
      if (!currentUserId) {
        throw new AppError(401, "Authentication is required.");
      }

      return ok(await updateListing(currentUserId, pathParams.id ?? "", parseBody(event, passthroughSchema)));
    }

    if (resource === "/listings/{id}" && event.httpMethod === "DELETE") {
      if (!currentUserId) {
        throw new AppError(401, "Authentication is required.");
      }

      await archiveListing(currentUserId, pathParams.id ?? "");
      return noContent();
    }

    if (resource === "/listings/user/{userId}" && event.httpMethod === "GET") {
      return ok(await getUserListings(pathParams.userId ?? ""));
    }

    if (resource === "/subscription/status" && event.httpMethod === "GET") {
      if (!currentUserId) {
        throw new AppError(401, "Authentication is required.");
      }

      return ok(await getSubscriptionStatus(currentUserId));
    }

    if (resource === "/app/notification-settings" && event.httpMethod === "GET") {
      return ok(await getNotificationSettings());
    }

    if (resource === "/app/notifications" && event.httpMethod === "GET") {
      if (!currentUserId) {
        throw new AppError(401, "Authentication is required.");
      }

      return ok(await getUserNotifications(currentUserId));
    }

    if (resource === "/app/notifications/{id}" && event.httpMethod === "PATCH") {
      if (!currentUserId) {
        throw new AppError(401, "Authentication is required.");
      }

      return ok(await updateUserNotification(currentUserId, pathParams.id ?? "", parseBody(event, passthroughSchema)));
    }

    if (resource === "/app/notifications/{id}" && event.httpMethod === "DELETE") {
      if (!currentUserId) {
        throw new AppError(401, "Authentication is required.");
      }

      return ok(await deleteUserNotification(currentUserId, pathParams.id ?? ""));
    }

    if (resource === "/app/notifications/read-all" && event.httpMethod === "POST") {
      if (!currentUserId) {
        throw new AppError(401, "Authentication is required.");
      }

      return ok(await markAllNotificationsRead(currentUserId));
    }

    if (resource === "/app/notifications/clear" && event.httpMethod === "POST") {
      if (!currentUserId) {
        throw new AppError(401, "Authentication is required.");
      }

      return ok(await clearUserNotifications(currentUserId));
    }

    if (resource === "/app/push-token/register" && event.httpMethod === "POST") {
      if (!currentUserId) {
        throw new AppError(401, "Authentication is required.");
      }

      return ok(await registerPushToken(currentUserId, parseBody(event, passthroughSchema)));
    }

    if (resource === "/app/push-token/unregister" && event.httpMethod === "POST") {
      if (!currentUserId) {
        throw new AppError(401, "Authentication is required.");
      }

      return ok(await unregisterPushToken(currentUserId, parseBody(event, passthroughSchema)));
    }

    if (resource === "/app/reminders" && event.httpMethod === "GET") {
      if (!currentUserId) {
        throw new AppError(401, "Authentication is required.");
      }

      return ok(await getUserReminders(currentUserId));
    }

    if (resource === "/app/reminders" && event.httpMethod === "POST") {
      if (!currentUserId) {
        throw new AppError(401, "Authentication is required.");
      }

      return created(await upsertUserReminder(currentUserId, parseBody(event, passthroughSchema)));
    }

    if (resource === "/app/reminders/{id}" && event.httpMethod === "PATCH") {
      if (!currentUserId) {
        throw new AppError(401, "Authentication is required.");
      }

      return ok(await upsertUserReminder(currentUserId, parseBody(event, passthroughSchema), pathParams.id ?? ""));
    }

    if (resource === "/app/reminders/{id}" && event.httpMethod === "DELETE") {
      if (!currentUserId) {
        throw new AppError(401, "Authentication is required.");
      }

      return ok(await deleteUserReminder(currentUserId, pathParams.id ?? ""));
    }

    if (resource === "/subscription/checkout-link" && event.httpMethod === "POST") {
      if (!currentUserId) {
        throw new AppError(401, "Authentication is required.");
      }

      return created(await createCheckoutLink(currentUserId, parseBody(event, passthroughSchema)));
    }

    if (resource === "/subscription/verify" && event.httpMethod === "POST") {
      const signature = event.headers["x-paystack-signature"] ?? event.headers["X-Paystack-Signature"];
      const parsed = event.body ? JSON.parse(event.body) : {};
      return ok(await verifySubscription({ ...parsed, source: signature ? "webhook" : parsed.source ?? "manual" }, event.body ?? "", signature));
    }

    if (resource === "/reports/create" && event.httpMethod === "POST") {
      if (!currentUserId) {
        throw new AppError(401, "Authentication is required.");
      }

      return created(await (localAdminMode ? localCreateReport(currentUserId, parseBody(event, passthroughSchema) as any) : createReport(currentUserId, parseBody(event, passthroughSchema))));
    }

    if (resource === "/reports/mine" && event.httpMethod === "GET") {
      if (!currentUserId) {
        throw new AppError(401, "Authentication is required.");
      }

      return ok(await getMyReports(currentUserId));
    }

    if (resource === "/conversations/open" && event.httpMethod === "POST") {
      if (!currentUserId) {
        throw new AppError(401, "Authentication is required.");
      }

      return created(await openConversation(currentUserId, parseBody(event, passthroughSchema)));
    }

    if (resource === "/conversations" && event.httpMethod === "GET") {
      if (!currentUserId) {
        throw new AppError(401, "Authentication is required.");
      }

      return ok(await getConversations(currentUserId));
    }

    if (resource === "/conversations/read-all" && event.httpMethod === "POST") {
      if (!currentUserId) {
        throw new AppError(401, "Authentication is required.");
      }

      return ok(await markAllConversationsRead(currentUserId));
    }

    if (resource === "/conversations/{id}" && event.httpMethod === "DELETE") {
      if (!currentUserId) {
        throw new AppError(401, "Authentication is required.");
      }

      return ok(await deleteConversation(currentUserId, pathParams.id ?? ""));
    }

    if (resource === "/conversations/{id}/messages" && event.httpMethod === "GET") {
      if (!currentUserId) {
        throw new AppError(401, "Authentication is required.");
      }

      return ok(await getConversationMessages(currentUserId, pathParams.id ?? "", getQuery(event)));
    }

    if (resource === "/conversations/{id}/messages" && event.httpMethod === "POST") {
      if (!currentUserId) {
        throw new AppError(401, "Authentication is required.");
      }

      return created(await sendConversationMessage(currentUserId, pathParams.id ?? "", parseBody(event, passthroughSchema)));
    }

    if (resource === "/conversations/{id}/messages/delete" && event.httpMethod === "POST") {
      if (!currentUserId) {
        throw new AppError(401, "Authentication is required.");
      }

      return ok(await deleteConversationMessages(currentUserId, pathParams.id ?? "", parseBody(event, passthroughSchema)));
    }

    if (resource === "/admin/reports" && event.httpMethod === "GET") {
      if (!currentUserId) {
        throw new AppError(401, "Authentication is required.");
      }

      if (localAdminMode) {
        return ok(await localGetReports(currentUserId));
      }
      await assertAdmin(currentUserId);
      return ok(await getReports(event.queryStringParameters?.status ?? "open"));
    }

    if (resource === "/admin/reports/{id}" && event.httpMethod === "PATCH") {
      if (!currentUserId) {
        throw new AppError(401, "Authentication is required.");
      }

      if (localAdminMode) {
        return ok(await localUpdateReport(currentUserId, pathParams.id ?? "", parseBody(event, passthroughSchema)));
      }
      await assertAdmin(currentUserId);
      return ok(await updateReport(pathParams.id ?? "", currentUserId, parseBody(event, passthroughSchema)));
    }

    if (resource === "/admin/users" && event.httpMethod === "GET") {
      if (!currentUserId) {
        throw new AppError(401, "Authentication is required.");
      }

      return ok(await (localAdminMode ? localGetAdminUsers(currentUserId) : (async () => {
        await assertAdmin(currentUserId);
        return getAdminUsers();
      })()));
    }

    if (resource === "/admin/users/{id}" && event.httpMethod === "PATCH") {
      if (!currentUserId) {
        throw new AppError(401, "Authentication is required.");
      }

      if (localAdminMode) {
        return ok(await localUpdateAdminUser(currentUserId, pathParams.id ?? "", parseBody(event, passthroughSchema)));
      }
      await assertAdmin(currentUserId);
      return ok(await updateAdminUser(currentUserId, pathParams.id ?? "", parseBody(event, passthroughSchema)));
    }

    if (resource === "/admin/listings" && event.httpMethod === "GET") {
      if (!currentUserId) {
        throw new AppError(401, "Authentication is required.");
      }

      if (localAdminMode) {
        return ok(await localGetAdminListings(currentUserId));
      }
      await assertAdmin(currentUserId);
      return ok(await getAdminListings());
    }

    if (resource === "/admin/listings/{id}" && event.httpMethod === "PATCH") {
      if (!currentUserId) {
        throw new AppError(401, "Authentication is required.");
      }

      if (localAdminMode) {
        return ok(await localUpdateAdminListing(currentUserId, pathParams.id ?? "", parseBody(event, passthroughSchema)));
      }
      await assertAdmin(currentUserId);
      return ok(await updateAdminListing(currentUserId, pathParams.id ?? "", parseBody(event, passthroughSchema)));
    }

    if (resource === "/admin/listings/{id}" && event.httpMethod === "DELETE") {
      if (!currentUserId) {
        throw new AppError(401, "Authentication is required.");
      }

      if (localAdminMode) {
        return ok(await localDeleteAdminListing(currentUserId, pathParams.id ?? ""));
      }
      await assertAdmin(currentUserId);
      await deleteAdminListing(currentUserId, pathParams.id ?? "");
      return noContent();
    }

    if (resource === "/admin/analytics" && event.httpMethod === "GET") {
      if (!currentUserId) {
        throw new AppError(401, "Authentication is required.");
      }

      return ok(await (localAdminMode ? localGetAdminAnalytics(currentUserId) : (async () => {
        await assertAdmin(currentUserId);
        return getAdminAnalytics();
      })()));
    }

    if (resource === "/admin/conversations" && event.httpMethod === "GET") {
      if (!currentUserId) {
        throw new AppError(401, "Authentication is required.");
      }

      if (localAdminMode) {
        return ok(await localGetAdminConversations(currentUserId));
      }
      await assertAdmin(currentUserId);
      return ok(await getAdminConversations());
    }

    if (resource === "/admin/conversations/{id}" && event.httpMethod === "DELETE") {
      if (!currentUserId) {
        throw new AppError(401, "Authentication is required.");
      }

      if (localAdminMode) {
        return ok(await localDeleteAdminConversation(currentUserId, pathParams.id ?? ""));
      }
      await assertAdmin(currentUserId);
      return ok(await deleteAdminConversation(currentUserId, pathParams.id ?? ""));
    }

    if (resource === "/admin/subscriptions" && event.httpMethod === "GET") {
      if (!currentUserId) {
        throw new AppError(401, "Authentication is required.");
      }

      if (localAdminMode) {
        return ok(await localGetAdminSubscriptions(currentUserId));
      }
      await assertAdmin(currentUserId);
      return ok(await getAdminSubscriptions());
    }

    if (resource === "/admin/subscriptions/{id}" && event.httpMethod === "PATCH") {
      if (!currentUserId) {
        throw new AppError(401, "Authentication is required.");
      }

      if (localAdminMode) {
        return ok(await localUpdateAdminSubscription(currentUserId, pathParams.id ?? "", parseBody(event, passthroughSchema)));
      }
      await assertAdmin(currentUserId);
      return ok(await updateAdminSubscription(currentUserId, pathParams.id ?? "", parseBody(event, passthroughSchema)));
    }

    if (resource === "/admin/notifications/settings" && event.httpMethod === "GET") {
      if (!currentUserId) {
        throw new AppError(401, "Authentication is required.");
      }

      return ok(await (localAdminMode ? localGetNotificationSettings(currentUserId) : (async () => {
        await assertAdmin(currentUserId);
        return getNotificationSettings();
      })()));
    }

    if (resource === "/admin/notifications/settings" && event.httpMethod === "PATCH") {
      if (!currentUserId) {
        throw new AppError(401, "Authentication is required.");
      }

      if (localAdminMode) {
        return ok(await localUpdateAdminNotificationSettings(currentUserId, parseBody(event, passthroughSchema)));
      }
      await assertAdmin(currentUserId);
      return ok(await updateAdminNotificationSettings(currentUserId, parseBody(event, passthroughSchema)));
    }

    throw new AppError(404, "Route not found.");
  } catch (error) {
    return handleError(error);
  }
}
