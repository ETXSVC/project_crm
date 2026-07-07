/** Vtiger webservice record IDs: module numeric prefix + "x" + record digits (e.g. 11x5). */
const VTIGER_RECORD_ID_PATTERN = /^\d+x\d+$/;

export function isValidVtigerRecordId(id: string): boolean {
  return VTIGER_RECORD_ID_PATTERN.test(id.trim());
}

export type VtigerRecordIdValidation =
  | { valid: true; id: string }
  | { valid: false; error: string };

export function validateVtigerRecordId(id: string): VtigerRecordIdValidation {
  const trimmed = id.trim();
  if (!trimmed) {
    return { valid: false, error: "Record ID is required" };
  }
  if (!VTIGER_RECORD_ID_PATTERN.test(trimmed)) {
    return { valid: false, error: "Invalid Vtiger record ID format" };
  }
  return { valid: true, id: trimmed };
}

/** Returns the validated ID or throws if the format is invalid. */
export function assertValidVtigerRecordId(id: string): string {
  const result = validateVtigerRecordId(id);
  if (!result.valid) {
    throw new Error(result.error);
  }
  return result.id;
}
