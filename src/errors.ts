import type { FactorioErrorCode } from "./types.js";

export class FactorioError extends Error {
  readonly code: FactorioErrorCode;

  constructor(code: FactorioErrorCode, message: string) {
    super(message);
    this.name = "FactorioError";
    this.code = code;
  }
}

export function createApiError(code: string, message: string): FactorioError {
  const recognized: readonly FactorioErrorCode[] = [
    "INVALID_REQUEST", "INVALID_JSON", "INVALID_ARGUMENT", "VERSION_MISMATCH", "UNKNOWN_METHOD",
    "FORBIDDEN", "NOT_FOUND", "RATE_LIMIT", "AREA_TOO_DENSE", "RESPONSE_TOO_LARGE", "CURSOR_EXPIRED",
    "WATCH_TOO_LARGE", "NETWORK_TOO_LARGE", "ACTIONS_DISABLED", "CONFLICT", "LIMIT", "BOT_DEAD",
    "BOT_NOT_EMPTY", "COLLISION", "UNGENERATED_CHUNK", "UNREACHABLE_TARGET", "NOT_CRAFTABLE",
    "CRAFT_FAILED", "CREATE_FAILED", "DESTROY_FAILED", "UNSUPPORTED_RESOURCE_LAYOUT", "UNSUPPORTED_BUILDING", "STORAGE_VERSION",
    "NOT_INITIALIZED", "ENGINE_ERROR"
  ];
  return new FactorioError(recognized.includes(code as FactorioErrorCode) ? code as FactorioErrorCode : "ENGINE_ERROR", message);
}
