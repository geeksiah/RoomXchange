import { decodeCursor, encodeCursor } from "../backend/src/cursor";

describe("cursor helpers", () => {
  it("round-trips pagination cursors", () => {
    const source = {
      PK: "LISTING",
      SK: "CREATED_AT#2026-03-23T00:00:00.000Z#USER#u1#LISTING#l1"
    };

    expect(decodeCursor(encodeCursor(source))).toEqual(source);
  });
});
