import { describe, it, expect } from "vitest";
import { passwordProblem } from "@/lib/password";

describe("passwordProblem", () => {
  it("accepts a strong password", () => {
    expect(passwordProblem("Abcdefgh12")).toBeNull();
  });
  it("rejects one shorter than 10 characters", () => {
    expect(passwordProblem("Abc123")).toBe("Password must be at least 10 characters.");
  });
  it("requires a lowercase letter", () => {
    expect(passwordProblem("ABCDEFGH12")).toBe("Include a lowercase letter.");
  });
  it("requires an uppercase letter", () => {
    expect(passwordProblem("abcdefgh12")).toBe("Include an uppercase letter.");
  });
  it("requires a number", () => {
    expect(passwordProblem("Abcdefghij")).toBe("Include a number.");
  });
  it("checks length before character-class rules", () => {
    // Too short AND missing classes — length message wins.
    expect(passwordProblem("Ab1")).toBe("Password must be at least 10 characters.");
  });
});
