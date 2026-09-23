import type { JsonObject, JsonValue } from "./types.js";
import { FactorioError } from "./errors.js";

export function parseObject(value: JsonValue, path: string): JsonObject {
  if (value === null || Array.isArray(value) || typeof value !== "object") {
    throw new FactorioError("INVALID_RESPONSE", `${path} must be a JSON object`);
  }
  return value as JsonObject;
}

export function readString(object: JsonObject, key: string, path: string): string {
  const value = object[key];
  if (typeof value !== "string") throw new FactorioError("INVALID_RESPONSE", `${path}.${key} must be a string`);
  return value;
}

export function readNumber(object: JsonObject, key: string, path: string): number {
  const value = object[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new FactorioError("INVALID_RESPONSE", `${path}.${key} must be a finite number`);
  }
  return value;
}

export function readBoolean(object: JsonObject, key: string, path: string): boolean {
  const value = object[key];
  if (typeof value !== "boolean") throw new FactorioError("INVALID_RESPONSE", `${path}.${key} must be a boolean`);
  return value;
}

export function readOptionalString(object: JsonObject, key: string, path: string): string | undefined {
  const value = object[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new FactorioError("INVALID_RESPONSE", `${path}.${key} must be a string when present`);
  return value;
}

export function readOptionalNumber(object: JsonObject, key: string, path: string): number | undefined {
  const value = object[key];
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new FactorioError("INVALID_RESPONSE", `${path}.${key} must be a finite number when present`);
  }
  return value;
}

export function readObject(object: JsonObject, key: string, path: string): JsonObject {
  const value = object[key];
  if (value === undefined) throw new FactorioError("INVALID_RESPONSE", `${path}.${key} is required`);
  return parseObject(value, `${path}.${key}`);
}

export function readArray<T>(object: JsonObject, key: string, path: string, parse: (value: JsonValue, itemPath: string) => T): readonly T[] {
  const value = object[key];
  if (value === undefined) throw new FactorioError("INVALID_RESPONSE", `${path}.${key} is required`);
  if (Array.isArray(value)) return value.map((item, index) => parse(item, `${path}.${key}[${index}]`));
  if (value !== null && typeof value === "object" && Object.keys(value).length === 0) return [];
  throw new FactorioError("INVALID_RESPONSE", `${path}.${key} must be an array (Factorio may encode empty arrays as {})`);
}

export function readRecord<T>(object: JsonObject, key: string, path: string, parse: (value: JsonValue, itemPath: string) => T): Readonly<Record<string, T>> {
  const source = readObject(object, key, path);
  const entries = Object.entries(source).map(([name, value]) => [name, parse(value, `${path}.${key}.${name}`)] as const);
  return Object.fromEntries(entries);
}

export function readPage<T>(value: JsonValue, path: string, parseItem: (item: JsonValue, itemPath: string) => T): {
  readonly items: readonly T[];
  readonly total: number;
  readonly next_offset?: number;
} {
  const page = parseObject(value, path);
  const nextOffset = readOptionalNumber(page, "next_offset", path);
  return {
    items: readArray(page, "items", path, parseItem),
    total: readNumber(page, "total", path),
    ...(nextOffset === undefined ? {} : { next_offset: nextOffset })
  };
}

export function readRawArray(object: JsonObject, key: string, path: string): readonly JsonObject[] {
  return readArray(object, key, path, (value, itemPath) => parseObject(value, itemPath));
}

export function parsePosition(value: JsonValue, path: string): { readonly x: number; readonly y: number } {
  const position = parseObject(value, path);
  return { x: readNumber(position, "x", path), y: readNumber(position, "y", path) };
}

export function parseBoundingBox(value: JsonValue, path: string): {
  readonly left_top: { readonly x: number; readonly y: number };
  readonly right_bottom: { readonly x: number; readonly y: number };
} {
  const bounds = parseObject(value, path);
  const leftTop = bounds["left_top"];
  const rightBottom = bounds["right_bottom"];
  if (leftTop === undefined || rightBottom === undefined) throw new FactorioError("INVALID_RESPONSE", `${path} requires both corners`);
  return { left_top: parsePosition(leftTop, `${path}.left_top`), right_bottom: parsePosition(rightBottom, `${path}.right_bottom`) };
}

export function asJsonValue(value: unknown, path: string, depth: number): JsonValue {
  if (depth > 64) throw new FactorioError("INVALID_RESPONSE", `${path} exceeds the JSON nesting limit`);
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map((item, index) => asJsonValue(item, `${path}[${index}]`, depth + 1));
  if (typeof value === "object") {
    const object = value as Record<string, unknown>;
    const entries = Object.entries(object).map(([key, item]) => [key, asJsonValue(item, `${path}.${key}`, depth + 1)] as const);
    return Object.fromEntries(entries);
  }
  throw new FactorioError("INVALID_RESPONSE", `${path} contains a value that is not JSON-safe`);
}

export function parseResponse(value: JsonValue, expectedId: string, expectedApiVersion: 1 | 2): {
  readonly apiVersion: 1 | 2;
  readonly id: string;
  readonly tick: number;
  readonly cursor: number;
  readonly data?: JsonValue;
  readonly error?: { readonly code: string; readonly message: string };
} {
  const response = parseObject(value, "response");
  const apiVersion = readNumber(response, "api_version", "response");
  if (apiVersion !== 1 && apiVersion !== 2) throw new FactorioError("INVALID_RESPONSE", `unsupported response API version ${apiVersion}`);
  if (apiVersion !== expectedApiVersion) throw new FactorioError("INVALID_RESPONSE", `response API version ${apiVersion} did not match request API version ${expectedApiVersion}`);
  const id = readString(response, "id", "response");
  if (id !== expectedId) throw new FactorioError("INVALID_RESPONSE", `response id ${id} did not match request id ${expectedId}`);
  if (readBoolean(response, "ok", "response")) {
    const data = response["data"];
    if (data === undefined) throw new FactorioError("INVALID_RESPONSE", "successful response is missing data");
    return { apiVersion, id, tick: readNumber(response, "tick", "response"), cursor: readNumber(response, "cursor", "response"), data };
  }
  const error = readObject(response, "error", "response");
  return {
    apiVersion,
    id,
    tick: readNumber(response, "tick", "response"),
    cursor: readNumber(response, "cursor", "response"),
    error: { code: readString(error, "code", "response.error"), message: readString(error, "message", "response.error") }
  };
}
