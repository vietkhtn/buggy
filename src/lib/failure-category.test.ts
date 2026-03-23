import { describe, it, expect } from "vitest";
import { categorizeFailure } from "./failure-category";
import { FailureCategory } from "@prisma/client";

describe("categorizeFailure", () => {
  it("categorizes assertion failures", () => {
    const message = "expected 'foo' to equal 'bar'";
    expect(categorizeFailure(message)).toBe("ASSERTION" as FailureCategory);
  });

  it("categorizes timeout failures", () => {
    const message = "Test timed out after 5000ms";
    expect(categorizeFailure(message)).toBe("TIMEOUT" as FailureCategory);
  });

  it("categorizes network failures", () => {
    const message = "fetch failed: ECONNREFUSED 127.0.0.1:3000";
    expect(categorizeFailure(message)).toBe("NETWORK" as FailureCategory);
  });

  it("categorizes API failures", () => {
    const message = "Request failed with status code 404";
    expect(categorizeFailure(message)).toBe("API" as FailureCategory);
  });

  it("categorizes database failures", () => {
    const message = "PrismaClientKnownRequestError: Unique constraint failed on the fields: (email)";
    expect(categorizeFailure(message)).toBe("DATABASE" as FailureCategory);
  });

  it("categorizes UI failures", () => {
    const message = "Error: locator.click: Target closed";
    const stack = "at Page.click (node_modules/playwright/lib/page.js:123:45)";
    expect(categorizeFailure(message, stack)).toBe("UI" as FailureCategory);
  });

  it("categorizes using regex patterns", () => {
    const message = "expect(received).toSatisfy(predicate)";
    expect(categorizeFailure(message)).toBe("ASSERTION" as FailureCategory);
  });

  it("returns UNKNOWN for unrecognized failures", () => {
    const message = "Something went wrong";
    expect(categorizeFailure(message)).toBe("UNKNOWN" as FailureCategory);
  });
});
