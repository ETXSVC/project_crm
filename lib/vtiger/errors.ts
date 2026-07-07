const RECORD_NOT_FOUND_CODES = new Set([
  "RECORD_NOT_FOUND",
  "RECORD_DOES_NOT_EXIST",
  "ID_DOES_NOT_EXIST",
]);

export class VtigerApiError extends Error {
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "VtigerApiError";
    this.code = code;
  }

  isRecordNotFound(): boolean {
    if (this.code && RECORD_NOT_FOUND_CODES.has(this.code)) {
      return true;
    }
    return false;
  }
}

export function isVtigerRecordNotFound(error: unknown): boolean {
  return error instanceof VtigerApiError && error.isRecordNotFound();
}
