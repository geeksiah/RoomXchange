import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { AppError } from "../errors.js";
import { created, getCurrentUserId, getQuery, handleError, noContent, ok, parseBody } from "../http.js";
import { getUserProfile, requestOtp, updateUserProfile, verifyOtp } from "../auth.js";
import { archiveListing, createListing, getFeed, getListingById, getUserListings, updateListing } from "../listings.js";
import { assertAdmin, createReport, getReports, updateReport } from "../reports.js";
import { createCheckoutLink, getSubscriptionStatus, verifySubscription } from "../subscriptions.js";
import { createPresignedUpload } from "../uploads.js";

const passthroughSchema = {
  parse<T>(value: T) {
    return value;
  }
};

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    if (event.httpMethod === "OPTIONS") {
      return noContent();
    }

    const currentUserId = getCurrentUserId(event);
    const resource = event.resource ?? event.path;

    if (resource === "/auth/request-otp" && event.httpMethod === "POST") {
      return created(await requestOtp(parseBody(event, passthroughSchema)));
    }

    if (resource === "/auth/verify-otp" && event.httpMethod === "POST") {
      return ok(await verifyOtp(parseBody(event, passthroughSchema)));
    }

    if (resource === "/auth/me" && event.httpMethod === "GET") {
      if (!currentUserId) {
        throw new AppError(401, "Authentication is required.");
      }

      return ok(await getUserProfile(currentUserId));
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
      return ok(await getListingById(event.pathParameters?.id ?? "", currentUserId));
    }

    if (resource === "/listings/{id}" && event.httpMethod === "PATCH") {
      if (!currentUserId) {
        throw new AppError(401, "Authentication is required.");
      }

      return ok(await updateListing(currentUserId, event.pathParameters?.id ?? "", parseBody(event, passthroughSchema)));
    }

    if (resource === "/listings/{id}" && event.httpMethod === "DELETE") {
      if (!currentUserId) {
        throw new AppError(401, "Authentication is required.");
      }

      await archiveListing(currentUserId, event.pathParameters?.id ?? "");
      return noContent();
    }

    if (resource === "/listings/user/{userId}" && event.httpMethod === "GET") {
      return ok(await getUserListings(event.pathParameters?.userId ?? ""));
    }

    if (resource === "/subscription/status" && event.httpMethod === "GET") {
      if (!currentUserId) {
        throw new AppError(401, "Authentication is required.");
      }

      return ok(await getSubscriptionStatus(currentUserId));
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

      return created(await createReport(currentUserId, parseBody(event, passthroughSchema)));
    }

    if (resource === "/admin/reports" && event.httpMethod === "GET") {
      if (!currentUserId) {
        throw new AppError(401, "Authentication is required.");
      }

      await assertAdmin(currentUserId);
      return ok(await getReports(event.queryStringParameters?.status ?? "open"));
    }

    if (resource === "/admin/reports/{id}" && event.httpMethod === "PATCH") {
      if (!currentUserId) {
        throw new AppError(401, "Authentication is required.");
      }

      await assertAdmin(currentUserId);
      return ok(await updateReport(event.pathParameters?.id ?? "", currentUserId, parseBody(event, passthroughSchema)));
    }

    throw new AppError(404, "Route not found.");
  } catch (error) {
    return handleError(error);
  }
}
