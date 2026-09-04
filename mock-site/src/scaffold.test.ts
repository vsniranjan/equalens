import { describe, expect, it } from "vitest";
import { SITE_NAME, getTelemetryLabel } from "./site";

describe("Meridian scaffold", () => {
  it("exposes stable product-page copy helpers", () => {
    expect(SITE_NAME).toBe("Meridian Motors");
    expect(getTelemetryLabel("3.2s", "0-100 km/h")).toBe("3.2s 0-100 km/h");
  });
});
