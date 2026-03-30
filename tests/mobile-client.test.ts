import { afterEach, describe, expect, it, vi } from "vitest";
import axios from "axios";
import { createMobileApiClient } from "../packages/shared/src/mobile-client";

describe("mobile api client auth handling", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("runs the unauthorized callback and surfaces a friendly 401 message", async () => {
    const onUnauthorized = vi.fn();

    vi.spyOn(axios, "request").mockRejectedValue({
      isAxiosError: true,
      message: "Request failed with status code 401",
      response: {
        status: 401,
        data: {
          message: "Authentication is required."
        }
      }
    });

    const client = createMobileApiClient({
      baseUrl: "https://api.roomxchange.test",
      onUnauthorized
    });

    await expect(client.getReminders()).rejects.toThrow("Your session expired. Please sign in again.");
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });
});
