import { buildSubscribeUrl, isAllowedVrUrl, maskPhone } from "@roomxchange/shared";

describe("shared utilities", () => {
  it("accepts supported VR hosts", () => {
    expect(isAllowedVrUrl("https://capture.lumalabs.ai/scene/demo")).toBe(true);
    expect(isAllowedVrUrl("https://poly.cam/capture/demo")).toBe(true);
  });

  it("rejects unsupported VR hosts", () => {
    expect(isAllowedVrUrl("https://example.com/scene")).toBe(false);
  });

  it("masks phone numbers consistently", () => {
    expect(maskPhone("+15551234567")).toBe("+155 **** 67");
  });

  it("builds the subscribe URL", () => {
    expect(buildSubscribeUrl("abc123")).toContain("/subscribe?reference=abc123");
  });
});
