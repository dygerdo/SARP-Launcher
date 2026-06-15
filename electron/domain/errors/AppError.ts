export enum ErrorCode {
  INTERNAL_ERROR = "INTERNAL_ERROR",
  FILE_NOT_FOUND = "FILE_NOT_FOUND",
  DOWNLOAD_FAILED = "DOWNLOAD_FAILED",
  EXTRACTION_FAILED = "EXTRACTION_FAILED",
  VERIFICATION_FAILED = "VERIFICATION_FAILED",
  INVALID_GAME_PATH = "INVALID_GAME_PATH",
  PERMISSION_DENIED = "PERMISSION_DENIED",
  MANIFEST_FETCH_FAILED = "MANIFEST_FETCH_FAILED",
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: any;

  constructor(code: ErrorCode, message: string, details?: any) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  public toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}
