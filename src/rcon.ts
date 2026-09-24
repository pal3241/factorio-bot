import { createConnection, type Socket } from "node:net";
import { createApiError, FactorioError } from "./errors.js";
import type { FactorioClientOptions, JsonObject, JsonValue } from "./types.js";
import { asJsonValue, parseResponse } from "./codec.js";

const RESPONSE_TYPE = 0;
const COMMAND_TYPE = 2;
const AUTH_RESPONSE_TYPE = 2;
const AUTH_COMMAND_TYPE = 3;
const MAX_FRAME_BYTES = 1_048_586;
const MAX_BUFFER_BYTES = 4_194_304;
const API_METHOD = "/fbot ";

interface RconPacket {
  readonly id: number;
  readonly type: number;
  readonly body: string;
}

interface PacketWaiter {
  readonly resolve: (packet: RconPacket) => void;
  readonly reject: (error: Error) => void;
}

export class RconConnection {
  private readonly socket: Socket;
  private readonly options: FactorioClientOptions;
  private input: Buffer<ArrayBufferLike> = Buffer.alloc(0);
  private readonly packets: RconPacket[] = [];
  private readonly waiters: PacketWaiter[] = [];
  private pending: Promise<void> = Promise.resolve();
  private failure: Error | undefined;
  private sequence = 1;
  private closed = false;
  private closing = false;

  private constructor(socket: Socket, options: FactorioClientOptions) {
    this.socket = socket;
    this.options = options;
    socket.on("data", (chunk: Buffer) => this.receive(chunk));
    socket.on("error", (error: Error) => this.fail(new FactorioError("RCON_CLOSED", `RCON connection error: ${error.message}`)));
    socket.on("close", () => this.fail(new FactorioError("RCON_CLOSED", "RCON server closed the connection")));
  }

  static async connect(options: FactorioClientOptions): Promise<RconConnection> {
    if ("socket_path" in options) {
      if (options.socket_path.length === 0) throw new FactorioError("INVALID_ARGUMENT", "RCON socket_path must be nonempty");
    } else {
      if (options.host.length === 0) throw new FactorioError("INVALID_ARGUMENT", "RCON host must be a nonempty hostname or address");
      if (!Number.isInteger(options.port) || options.port < 1 || options.port > 65_535) {
        throw new FactorioError("INVALID_ARGUMENT", "RCON port must be an integer between 1 and 65535");
      }
    }
    if (options.password.length === 0) throw new FactorioError("INVALID_ARGUMENT", "RCON password must not be empty");
    if (!Number.isInteger(options.connect_timeout_ms) || options.connect_timeout_ms < 1) {
      throw new FactorioError("INVALID_ARGUMENT", "connect_timeout_ms must be a positive integer");
    }
    if (!Number.isInteger(options.request_timeout_ms) || options.request_timeout_ms < 1) {
      throw new FactorioError("INVALID_ARGUMENT", "request_timeout_ms must be a positive integer");
    }
    const socket = "socket_path" in options
      ? createConnection({ path: options.socket_path })
      : createConnection({ host: options.host, port: options.port });
    socket.setNoDelay(true);
    const connection = new RconConnection(socket, options);
    try {
      await connection.awaitConnect();
      await connection.authenticate();
      return connection;
    } catch (error) {
      connection.closeNow();
      throw error;
    }
  }

  async request<T>(method: string, params: object, parse: (value: JsonValue) => T, apiVersion: 1 | 2 = 1): Promise<{
    readonly apiVersion: 1 | 2;
    readonly id: string;
    readonly tick: number;
    readonly cursor: number;
    readonly data: T;
  }> {
    if (this.closed || this.closing) throw new FactorioError("RCON_CLOSED", "RCON connection is closed or closing");
    if (method.length === 0) throw new FactorioError("INVALID_ARGUMENT", "API method must not be empty");
    const current = this.pending.then(() => this.execute(method, params, parse, apiVersion));
    this.pending = current.then(() => undefined, () => undefined);
    return current;
  }

  async close(): Promise<void> {
    if (this.closed || this.closing) return;
    this.closing = true;
    await this.pending;
    this.closeNow();
  }

  private async execute<T>(method: string, params: object, parse: (value: JsonValue) => T, apiVersion: 1 | 2): Promise<{
    readonly apiVersion: 1 | 2;
    readonly id: string;
    readonly tick: number;
    readonly cursor: number;
    readonly data: T;
  }> {
    if (this.failure) throw this.failure;
    const requestId = `${process.pid}-${this.sequence}`;
    const apiPacketId = this.sequence * 2;
    const endPacketId = apiPacketId + 1;
    this.sequence += 1;
    let request: string;
    try {
      request = JSON.stringify({ api_version: apiVersion, id: requestId, method, params });
    } catch (error) {
      throw new FactorioError("INVALID_ARGUMENT", `request parameters could not be encoded as JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (Buffer.byteLength(request, "utf8") > 8192) throw new FactorioError("INVALID_ARGUMENT", "JSON request exceeds the mod limit of 8192 bytes");
    const apiCommand = `${API_METHOD}${request}`;
    const sentinelCommand = `${API_METHOD}${JSON.stringify({ api_version: apiVersion, id: `${requestId}-end`, method: "capabilities", params: {} })}`;
    const apiChunks: string[] = [];
    let ended = false;
    let responseComplete = false;
    const timer = setTimeout(() => {
      const timeout = new FactorioError("RCON_TIMEOUT", `RCON request ${requestId} timed out after ${this.options.request_timeout_ms} ms`);
      this.fail(timeout);
    }, this.options.request_timeout_ms);
    try {
      this.writePacket(apiPacketId, COMMAND_TYPE, apiCommand);
      this.writePacket(endPacketId, COMMAND_TYPE, sentinelCommand);
      while (!ended) {
        const packet = await this.nextPacket();
        if (packet.id === apiPacketId) {
          if (packet.type !== RESPONSE_TYPE) throw new FactorioError("RCON_PROTOCOL_ERROR", `unexpected API response packet type ${packet.type}`);
          apiChunks.push(packet.body);
        } else if (packet.id === endPacketId) {
          if (packet.type !== RESPONSE_TYPE) throw new FactorioError("RCON_PROTOCOL_ERROR", `unexpected end marker packet type ${packet.type}`);
          let marker: unknown;
          try {
            marker = JSON.parse(packet.body) as unknown;
          } catch (error) {
            throw new FactorioError("RCON_PROTOCOL_ERROR", `RCON end marker was invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
          }
          const markerValue = asJsonValue(marker, "RCON end marker", 0);
          if (markerValue === null || Array.isArray(markerValue) || typeof markerValue !== "object" || markerValue["id"] !== `${requestId}-end`) {
            throw new FactorioError("RCON_PROTOCOL_ERROR", "RCON response end marker did not match the request");
          }
          ended = true;
          responseComplete = true;
        } else {
          throw new FactorioError("RCON_PROTOCOL_ERROR", `unexpected RCON response packet id ${packet.id}`);
        }
      }
      const responseText = apiChunks.join("");
      if (Buffer.byteLength(responseText, "utf8") > 1_048_576) {
        throw new FactorioError("INVALID_RESPONSE", "RCON API response exceeds the mod limit of 1 MiB");
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(responseText) as unknown;
      } catch (error) {
        throw new FactorioError("INVALID_RESPONSE", `Factorio returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
      }
      const value = asJsonValue(parsed, "response", 0);
      const envelope = parseResponse(value, requestId, apiVersion);
      if (envelope.error) throw createApiError(envelope.error.code, envelope.error.message);
      if (envelope.data === undefined) throw new FactorioError("INVALID_RESPONSE", "successful Factorio response is missing data");
      let data: T;
      try {
        data = parse(envelope.data);
      } catch (error) {
        if (error instanceof FactorioError) throw error;
        throw new FactorioError("INVALID_RESPONSE", `invalid ${method} response: ${error instanceof Error ? error.message : String(error)}`);
      }
      return { apiVersion: envelope.apiVersion, id: envelope.id, tick: envelope.tick, cursor: envelope.cursor, data };
    } catch (error) {
      if (!responseComplete && error instanceof Error) this.fail(error);
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  private async awaitConnect(): Promise<void> {
    if (this.failure) throw this.failure;
    await new Promise<void>((resolve, reject) => {
      const endpoint = "socket_path" in this.options ? this.options.socket_path : `${this.options.host}:${this.options.port}`;
      const timer = setTimeout(() => reject(new FactorioError("RCON_TIMEOUT", `connection to ${endpoint} timed out after ${this.options.connect_timeout_ms} ms`)), this.options.connect_timeout_ms);
      this.socket.once("connect", () => {
        clearTimeout(timer);
        resolve();
      });
      this.socket.once("error", (error: Error) => {
        clearTimeout(timer);
        const endpoint = "socket_path" in this.options ? this.options.socket_path : `${this.options.host}:${this.options.port}`;
        reject(new FactorioError("RCON_CLOSED", `could not connect to ${endpoint}: ${error.message}`));
      });
    });
  }

  private async authenticate(): Promise<void> {
    const authId = 1;
    this.writePacket(authId, AUTH_COMMAND_TYPE, this.options.password);
    let timer: NodeJS.Timeout | undefined;
    try {
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new FactorioError("RCON_TIMEOUT", `RCON authentication timed out after ${this.options.connect_timeout_ms} ms`)), this.options.connect_timeout_ms);
      });
      const packet = await Promise.race([this.nextPacket(), timeout]);
      if (packet.id === -1 || packet.id !== authId || packet.type !== AUTH_RESPONSE_TYPE) {
        throw new FactorioError("RCON_AUTH_FAILED", "Factorio rejected the RCON password or returned an invalid authentication frame");
      }
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private writePacket(id: number, type: number, body: string): void {
    if (this.failure) throw this.failure;
    const encoded = Buffer.from(body, "utf8");
    const length = 8 + encoded.length + 2;
    if (length > MAX_FRAME_BYTES) throw new FactorioError("INVALID_ARGUMENT", `RCON command frame exceeds ${MAX_FRAME_BYTES} bytes`);
    const frame = Buffer.allocUnsafe(length + 4);
    frame.writeInt32LE(length, 0);
    frame.writeInt32LE(id, 4);
    frame.writeInt32LE(type, 8);
    encoded.copy(frame, 12);
    frame.writeUInt16LE(0, length + 2);
    this.socket.write(frame);
  }

  private receive(chunk: Buffer): void {
    if (this.failure) return;
    if (this.input.length + chunk.length > MAX_BUFFER_BYTES) {
      this.fail(new FactorioError("RCON_PROTOCOL_ERROR", `unprocessed RCON data exceeded ${MAX_BUFFER_BYTES} bytes`));
      return;
    }
    this.input = this.input.length === 0 ? chunk : Buffer.concat([this.input, chunk]);
    while (this.input.length >= 4) {
      const size = this.input.readInt32LE(0);
      if (size < 10 || size > MAX_FRAME_BYTES) {
        this.fail(new FactorioError("RCON_PROTOCOL_ERROR", `invalid RCON frame size ${size}`));
        return;
      }
      if (this.input.length < size + 4) return;
      const frame = this.input.subarray(4, size + 4);
      this.input = this.input.subarray(size + 4);
      if (frame.readUInt16LE(size - 2) !== 0) {
        this.fail(new FactorioError("RCON_PROTOCOL_ERROR", "RCON frame has an invalid terminator"));
        return;
      }
      const packet: RconPacket = { id: frame.readInt32LE(0), type: frame.readInt32LE(4), body: frame.subarray(8, size - 2).toString("utf8") };
      const waiter = this.waiters.shift();
      if (waiter) waiter.resolve(packet);
      else this.packets.push(packet);
    }
  }

  private nextPacket(): Promise<RconPacket> {
    if (this.failure) return Promise.reject(this.failure);
    const packet = this.packets.shift();
    if (packet) return Promise.resolve(packet);
    return new Promise((resolve, reject) => this.waiters.push({ resolve, reject }));
  }

  private fail(error: Error): void {
    if (this.failure) return;
    this.failure = error;
    for (const waiter of this.waiters.splice(0)) waiter.reject(error);
    this.socket.destroy();
  }

  private closeNow(): void {
    if (this.closed) return;
    this.closed = true;
    this.socket.end();
    this.socket.destroy();
  }
}
