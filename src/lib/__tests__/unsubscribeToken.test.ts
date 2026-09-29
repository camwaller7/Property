import { describe, it, expect } from "vitest";
import { signUnsubscribe, verifyUnsubscribe, unsubscribeUrl } from "../unsubscribeToken";

const SECRET = "test-secret-please-change";

describe("unsubscribe token", () => {
  it("verifies a token it just signed", () => {
    const t = signUnsubscribe("Alice@Example.com", SECRET);
    expect(verifyUnsubscribe("Alice@Example.com", t, SECRET)).toBe(true);
  });

  it("is case- and whitespace-insensitive on the email", () => {
    const t = signUnsubscribe("alice@example.com", SECRET);
    expect(verifyUnsubscribe("  ALICE@EXAMPLE.COM ", t, SECRET)).toBe(true);
  });

  it("rejects a tampered token", () => {
    const t = signUnsubscribe("alice@example.com", SECRET);
    expect(verifyUnsubscribe("alice@example.com", t.slice(0, -1) + "0", SECRET)).toBe(false);
  });

  it("rejects a token signed for a different email", () => {
    const t = signUnsubscribe("alice@example.com", SECRET);
    expect(verifyUnsubscribe("bob@example.com", t, SECRET)).toBe(false);
  });

  it("rejects a token signed with a different secret", () => {
    const t = signUnsubscribe("alice@example.com", "other-secret");
    expect(verifyUnsubscribe("alice@example.com", t, SECRET)).toBe(false);
  });

  it("rejects empty inputs", () => {
    expect(verifyUnsubscribe("", "", SECRET)).toBe(false);
    expect(verifyUnsubscribe("a@b.com", "", SECRET)).toBe(false);
    expect(verifyUnsubscribe("a@b.com", "abc", "")).toBe(false);
  });

  it("builds a URL with the email and token as query params", () => {
    const url = unsubscribeUrl("https://corvelleproperty.com", "alice@example.com", SECRET);
    const t = signUnsubscribe("alice@example.com", SECRET);
    expect(url).toBe(`https://corvelleproperty.com/unsubscribe?e=alice%40example.com&t=${t}`);
  });

  it("doesn't double the slash when base has a trailing one", () => {
    const url = unsubscribeUrl("https://corvelleproperty.com/", "a@b.com", SECRET);
    expect(url).toContain("https://corvelleproperty.com/unsubscribe?");
    expect(url).not.toContain(".com//unsubscribe");
  });
});
