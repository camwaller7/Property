import { describe, it, expect } from "vitest";
import { clientIp, rateLimitKey, EMAIL_RATE } from "../rateLimit";

describe("clientIp", () => {
  it("takes the first IP from an X-Forwarded-For chain", () => {
    expect(clientIp("203.0.113.7, 70.41.3.18, 150.172.238.178")).toBe("203.0.113.7");
  });
  it("handles a single IP", () => {
    expect(clientIp("203.0.113.7")).toBe("203.0.113.7");
  });
  it("falls back to 'unknown' when absent or empty", () => {
    expect(clientIp(null)).toBe("unknown");
    expect(clientIp(undefined)).toBe("unknown");
    expect(clientIp("")).toBe("unknown");
    expect(clientIp("  ,  ")).toBe("unknown");
  });
});

describe("rateLimitKey", () => {
  it("joins tag/kind/id and normalises case + whitespace", () => {
    expect(rateLimitKey("email", "manager", "  ABC-123 ")).toBe("email:manager:abc-123");
  });
  it("is stable for the same principal", () => {
    expect(rateLimitKey("email", "portal", "Tok")).toBe(rateLimitKey("email", "portal", "tok"));
  });
  it("separates different kinds/ids", () => {
    expect(rateLimitKey("email", "ip", "1.2.3.4")).not.toBe(rateLimitKey("email", "manager", "1.2.3.4"));
  });
});

describe("EMAIL_RATE", () => {
  it("is a sane positive window", () => {
    expect(EMAIL_RATE.max).toBeGreaterThan(0);
    expect(EMAIL_RATE.windowSeconds).toBeGreaterThan(0);
  });
});
