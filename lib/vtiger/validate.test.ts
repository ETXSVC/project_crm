import { describe, expect, it } from "vitest";
import {
  assertValidVtigerRecordId,
  isValidVtigerRecordId,
  validateVtigerRecordId,
} from "@/lib/vtiger/validate";

describe("vtiger record ID validation", () => {
  it("accepts valid Vtiger record IDs", () => {
    expect(isValidVtigerRecordId("11x5")).toBe(true);
    expect(isValidVtigerRecordId("  4x12345  ")).toBe(true);
    expect(validateVtigerRecordId("19x999")).toEqual({ valid: true, id: "19x999" });
    expect(assertValidVtigerRecordId("11x5")).toBe("11x5");
  });

  it("rejects invalid and malicious IDs", () => {
    expect(isValidVtigerRecordId("")).toBe(false);
    expect(isValidVtigerRecordId("11x")).toBe(false);
    expect(isValidVtigerRecordId("x123")).toBe(false);
    expect(isValidVtigerRecordId("11-5")).toBe(false);
    expect(isValidVtigerRecordId("11x5'; DROP TABLE Contacts;--")).toBe(false);
    expect(isValidVtigerRecordId("' OR '1'='1")).toBe(false);

    expect(validateVtigerRecordId("bad-id")).toEqual({
      valid: false,
      error: "Invalid Vtiger record ID format",
    });
    expect(() => assertValidVtigerRecordId("'; DELETE FROM Accounts;--")).toThrow(
      "Invalid Vtiger record ID format"
    );
  });
});
