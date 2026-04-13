import { describe, expect, it } from "vitest";
import { autoCorrectJiraKey } from "./jira";

describe("autoCorrectJiraKey", () => {
  it("returns null for empty string", () => {
    const result = autoCorrectJiraKey("");
    expect(result).toEqual({ corrected: null, wasChanged: false, original: "" });
  });

  it("returns null for whitespace-only string", () => {
    const result = autoCorrectJiraKey("   ");
    expect(result).toEqual({ corrected: null, wasChanged: false, original: "   " });
  });

  it("passes through already-valid key unchanged", () => {
    const result = autoCorrectJiraKey("AC-3");
    expect(result).toEqual({ corrected: "AC-3", wasChanged: false, original: "AC-3" });
  });

  it("passes through key with leading zeros unchanged", () => {
    const result = autoCorrectJiraKey("AC-003");
    expect(result).toEqual({ corrected: "AC-003", wasChanged: false, original: "AC-003" });
  });

  it("uppercases lowercase key", () => {
    const result = autoCorrectJiraKey("ac-3");
    expect(result).toEqual({ corrected: "AC-3", wasChanged: true, original: "ac-3" });
  });

  it("uppercases mixed-case key with leading zeros", () => {
    const result = autoCorrectJiraKey("ac-03");
    expect(result).toEqual({ corrected: "AC-03", wasChanged: true, original: "ac-03" });
  });

  it("inserts hyphen between prefix and number (no separator)", () => {
    const result = autoCorrectJiraKey("AC03");
    expect(result).toEqual({ corrected: "AC-03", wasChanged: true, original: "AC03" });
  });

  it("inserts hyphen for longer prefix", () => {
    const result = autoCorrectJiraKey("PROJ123");
    expect(result).toEqual({ corrected: "PROJ-123", wasChanged: true, original: "PROJ123" });
  });

  it("replaces underscore separator with hyphen", () => {
    const result = autoCorrectJiraKey("PROJ_123");
    expect(result).toEqual({ corrected: "PROJ-123", wasChanged: true, original: "PROJ_123" });
  });

  it("returns null for uncorrectable key", () => {
    const result = autoCorrectJiraKey("???");
    expect(result).toEqual({ corrected: null, wasChanged: false, original: "???" });
  });

  it("returns null for numeric-only input", () => {
    const result = autoCorrectJiraKey("123");
    expect(result).toEqual({ corrected: null, wasChanged: false, original: "123" });
  });

  it("trims surrounding whitespace before processing", () => {
    const result = autoCorrectJiraKey("  AC-3  ");
    expect(result).toEqual({ corrected: "AC-3", wasChanged: false, original: "  AC-3  " });
  });
});
