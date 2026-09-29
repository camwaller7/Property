import { describe, it, expect } from "vitest";
import { emailFooter, appendFooter } from "../emailFooter";
import { brand } from "../brand";

describe("emailFooter", () => {
  it("always identifies the sender", () => {
    const f = emailFooter();
    expect(f).toContain(brand.full);
    expect(f).toContain(brand.url);
    expect(f.startsWith("—")).toBe(true);
  });

  it("includes the business address when provided", () => {
    const f = emailFooter({ businessAddress: "1 Example St, Adelaide SA 5000" });
    expect(f).toContain("1 Example St, Adelaide SA 5000");
  });

  it("omits an empty/whitespace business address", () => {
    expect(emailFooter({ businessAddress: "   " })).not.toContain("  \n");
    expect(emailFooter({ businessAddress: "" })).toBe(emailFooter());
  });

  it("adds a signed unsubscribe link when given one", () => {
    const url = "https://corvelleproperty.com/unsubscribe?e=a%40b.com&t=abc";
    const f = emailFooter({ unsubscribeUrl: url });
    expect(f).toContain("Unsubscribe from reminder emails:");
    expect(f).toContain(url);
  });

  it("falls back to a reply-to opt-out when there is no link", () => {
    const f = emailFooter({ optOutContact: "admin@corvelleproperty.com" });
    expect(f).toContain("reply to admin@corvelleproperty.com");
  });

  it("prefers the link over the reply-to opt-out", () => {
    const f = emailFooter({
      unsubscribeUrl: "https://x/unsubscribe",
      optOutContact: "admin@corvelleproperty.com",
    });
    expect(f).toContain("https://x/unsubscribe");
    expect(f).not.toContain("reply to");
  });

  it("has no opt-out line for a plain transactional footer", () => {
    const f = emailFooter();
    expect(f).not.toContain("Unsubscribe");
    expect(f).not.toContain("reply to");
  });
});

describe("appendFooter", () => {
  it("separates body and footer with exactly one blank line", () => {
    const out = appendFooter("Hello there.");
    expect(out).toBe(`Hello there.\n\n${emailFooter()}`);
  });

  it("collapses trailing whitespace before the footer", () => {
    const out = appendFooter("Hello there.\n\n\n   ");
    expect(out).toBe(`Hello there.\n\n${emailFooter()}`);
  });

  it("returns just the footer for an empty body", () => {
    expect(appendFooter("")).toBe(emailFooter());
    expect(appendFooter(null)).toBe(emailFooter());
    expect(appendFooter(undefined)).toBe(emailFooter());
  });
});
