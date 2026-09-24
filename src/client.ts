import { FactorioError } from "./errors.js";
import {
  parseBot, parseBotAction, parseBotCreate, parseBotDetail, parseBuildGhost, parseCapabilities, parseCraftable,
  parseChunk, parseDelta, parseEntity, parseEntityDetail, parseElectric, parseIdentity, parseItem, parseLogistics,
  parsePlayer, parseProduction, parseRecipe, parseResearchPage, parseResourcePage, parseSharedEntry,
  parseSnapshot, parseStarted, parseSurface, parseTerrain, parseThreatPage, parseTrain, parseWatch,
  parseSpaceAgeCapabilities, parseSpaceAgeSnapshot, parseSpacePlanet, parseSpaceLocation, parseSpaceConnection, parseSpacePlatform
} from "./models.js";
import { parseObject, parsePosition, readArray, readBoolean, readNumber, readObject, readOptionalNumber, readOptionalString, readPage, readString } from "./codec.js";
import { RconConnection } from "./rcon.js";
import { attachVirtualBot, spawnVirtualBot } from "./high-level.js";
import type { SpawnBotOptions, VirtualBot } from "./high-level.js";
import type {
  ApiResult, AreaQuery, Bot, BotCreateResult, BotDetail, BotAction, BuildGhostInput, BuildGhostResult, Capabilities, ChatMessage, ChatSendOptions, Chunk, DeltaPage, EventRecord,
  EntityDetail, EntityQuery, EntitySummary, ElectricNetwork, FactorioClientOptions, ForceQuery,
  JsonValue, LogisticNetwork, Page, PageQuery, Player, PlayerLocation, PlayerRef, Position, ProductionPage, Recipe, ResearchPage,
  ResourcePage, SharedEntry, SharedWriteOptions, Snapshot, SpaceAgeCapabilities, SpaceAgeSnapshot,
  SpaceAgeContentPage, SpaceAgeContentQuery, SpaceAgeContentSummary,
  SpacePlatformDetailQuery, SpacePlatformQuery, SpaceAgeSnapshotQuery, Surface, TerrainPage, ThreatPage, Train,
  WatchOptions, WatchResult, WatchTopic
} from "./types.js";

export interface FactorioBotClient {
  readonly capabilities: () => Promise<ApiResult<Capabilities>>;
  readonly spawnBot: (options: SpawnBotOptions) => Promise<VirtualBot>;
  readonly attachBot: (id: string, network?: string) => VirtualBot;
  readonly world: {
    readonly snapshot: (query: AreaQuery) => Promise<ApiResult<Snapshot>>;
    readonly surfaces: (query: PageQuery) => Promise<ApiResult<Page<Surface>>>;
    readonly chunks: (query: AreaQuery) => Promise<ApiResult<Page<Chunk>>>;
    readonly terrain: (query: AreaQuery) => Promise<ApiResult<TerrainPage>>;
    readonly entities: (query: AreaQuery) => Promise<ApiResult<Page<EntitySummary>>>;
    readonly entity: (query: EntityQuery) => Promise<ApiResult<EntityDetail>>;
    readonly resources: (query: AreaQuery) => Promise<ApiResult<ResourcePage>>;
    readonly electric: (query: AreaQuery) => Promise<ApiResult<Page<ElectricNetwork>>>;
    readonly logistics: (query: AreaQuery) => Promise<ApiResult<Page<LogisticNetwork>>>;
    readonly trains: (query: AreaQuery) => Promise<ApiResult<Page<Train>>>;
    readonly production: (query: AreaQuery) => Promise<ApiResult<ProductionPage>>;
    readonly research: (query: ForceQuery) => Promise<ApiResult<ResearchPage>>;
    readonly recipes: (query: ForceQuery) => Promise<ApiResult<Page<Recipe>>>;
    readonly threats: (query: AreaQuery) => Promise<ApiResult<ThreatPage>>;
    readonly players: (query: PageQuery) => Promise<ApiResult<Page<Player>>>;
    readonly player: (player: PlayerRef) => Promise<ApiResult<Player>>;
    readonly getLocation: (player: PlayerRef) => Promise<ApiResult<PlayerLocation>>;
  };
  readonly spaceAge: {
    readonly capabilities: () => Promise<ApiResult<SpaceAgeCapabilities>>;
    readonly snapshot: (query: SpaceAgeSnapshotQuery) => Promise<ApiResult<SpaceAgeSnapshot>>;
    readonly planets: (query: PageQuery) => Promise<ApiResult<Page<SpaceAgeSnapshot["planets"]["items"][number]>>>;
    readonly locations: (query: PageQuery) => Promise<ApiResult<Page<SpaceAgeSnapshot["space_locations"]["items"][number]>>>;
    readonly connections: (query: PageQuery) => Promise<ApiResult<Page<SpaceAgeSnapshot["space_connections"]["items"][number]>>>;
    readonly platforms: (query: SpacePlatformQuery) => Promise<ApiResult<Page<SpaceAgeSnapshot["platforms"]["items"][number]>>>;
    readonly platform: (query: SpacePlatformDetailQuery) => Promise<ApiResult<SpaceAgeSnapshot["platforms"]["items"][number]>>;
    readonly contentSummary: () => Promise<ApiResult<SpaceAgeContentSummary>>;
    readonly content: (query: SpaceAgeContentQuery) => Promise<ApiResult<SpaceAgeContentPage>>;
  };
  readonly bots: {
    readonly list: (query: PageQuery) => Promise<ApiResult<Page<Bot>>>;
    readonly get: (id: string) => Promise<ApiResult<BotDetail>>;
    readonly create: (input: { readonly id: string; readonly network: string; readonly surface: string; readonly force: string; readonly position: Position }) => Promise<ApiResult<BotCreateResult>>;
    readonly destroy: (id: string) => Promise<ApiResult<{ readonly id: string }>>;
    readonly walk: (id: string, direction: number, ticks: number) => Promise<ApiResult<BotAction>>;
    readonly stop: (id: string) => Promise<ApiResult<{ readonly id: string }>>;
    readonly mine: (id: string, position: Position, ticks: number) => Promise<ApiResult<BotAction>>;
    readonly craftable: (id: string, recipe: string) => Promise<ApiResult<{ readonly recipe: string; readonly enabled: boolean; readonly count: number }>>;
    readonly craft: (id: string, recipe: string, count: number) => Promise<ApiResult<{ readonly started: number }>>;
    readonly buildGhost: (input: BuildGhostInput) => Promise<ApiResult<BuildGhostResult>>;
  };
  readonly chat: {
    readonly send: (message: string, options?: ChatSendOptions) => Promise<ApiResult<{ readonly sender: string; readonly message: string; readonly force?: string }>>;
    readonly follow: (after: number, poll_interval_ms: number, signal: AbortSignal) => AsyncGenerator<ChatMessage, void, void>;
  };
  readonly shared: {
    readonly list: (network: string, query: PageQuery) => Promise<ApiResult<Page<SharedEntry>>>;
    readonly write: (input: SharedWriteOptions) => Promise<ApiResult<SharedEntry>>;
  };
  readonly events: {
    readonly delta: (after: number, limit: number) => Promise<ApiResult<DeltaPage>>;
    readonly watch: <T>(topic: WatchTopic, options: WatchOptions<object>, parseInitial: (value: JsonValue) => T) => Promise<ApiResult<WatchResult<T>>>;
    readonly unwatch: (id: string) => Promise<ApiResult<{ readonly id: string }>>;
    readonly follow: (after: number, poll_interval_ms: number, signal: AbortSignal) => AsyncGenerator<EventRecord, void, void>;
  };
  readonly close: () => Promise<void>;
}

export async function createBot(options: FactorioClientOptions): Promise<FactorioBotClient> {
  const connection = await RconConnection.connect(options);
  const request = async <T>(method: string, params: object, parse: (value: JsonValue) => T, apiVersion: 1 | 2 = 1): Promise<ApiResult<T>> => {
    const result = await connection.request(method, params, parse, apiVersion);
    return { apiVersion: result.apiVersion, id: result.id, tick: result.tick, cursor: result.cursor, data: result.data };
  };
  const page = <T>(value: JsonValue, parse: (item: JsonValue, path: string) => T): Page<T> => readPage(value, "data", parse);
  const dataObject = (value: JsonValue): ReturnType<typeof parseObject> => parseObject(value, "data");
  const readId = (value: JsonValue): { readonly id: string } => ({ id: readString(dataObject(value), "id", "data") });
  const client: FactorioBotClient = {
    capabilities: () => request("capabilities", {}, value => parseCapabilities(value, "data")),
    spawnBot: options => spawnVirtualBot(client, options),
    attachBot: (id, network) => attachVirtualBot(client, id, network),
    world: {
      snapshot: query => request("snapshot", query, value => parseSnapshot(value, "data")),
      surfaces: query => request("surfaces", query, value => page(value, parseSurface)),
      chunks: query => request("chunks", query, value => page(value, parseChunk)),
      terrain: query => request("terrain", query, value => parseTerrain(value, "data")),
      entities: query => request("entities", query, value => page(value, parseEntity)),
      entity: query => request("entity", query, value => parseEntityDetail(value, "data")),
      resources: query => request("resources", query, value => parseResourcePage(value, "data")),
      electric: query => request("electric", query, value => page(value, parseElectric)),
      logistics: query => request("logistics", query, value => page(value, parseLogistics)),
      trains: query => request("trains", query, value => page(value, parseTrain)),
      production: query => request("production", query, value => parseProduction(value, "data")),
      research: query => request("research", query, value => parseResearchPage(value, "data")),
      recipes: query => request("recipes", query, value => page(value, parseRecipe)),
      threats: query => request("threats", query, value => parseThreatPage(value, "data")),
      players: query => request("players", query, value => page(value, parsePlayer)),
      player: player => request("player", playerRefParams(player), value => parsePlayer(value, "data")),
      getLocation: player => request("getlocation", playerRefParams(player), value => parsePlayerLocation(value, "data"))
    },
    spaceAge: {
      capabilities: () => request("space-age.capabilities", {}, value => parseSpaceAgeCapabilities(value, "data"), 2),
      snapshot: query => request("space-age.snapshot", query, value => parseSpaceAgeSnapshot(value, "data"), 2),
      planets: query => request("space-age.planets", query, value => page(value, parseSpacePlanet), 2),
      locations: query => request("space-age.locations", query, value => page(value, parseSpaceLocation), 2),
      connections: query => request("space-age.connections", query, value => page(value, parseSpaceConnection), 2),
      platforms: query => request("space-age.platforms", query, value => page(value, parseSpacePlatform), 2),
      platform: query => request("space-age.platform", query, value => parseSpacePlatform(value, "data"), 2),
      contentSummary: () => request("space-age.content-summary", {}, value => {
        const row = parseObject(value, "data");
        return {
          expansion_active: readBoolean(row, "expansion_active", "data"),
          quality_active: readBoolean(row, "quality_active", "data"),
          elevated_rails_active: readBoolean(row, "elevated_rails_active", "data"),
          counts: Object.fromEntries(Object.entries(readObject(row, "counts", "data")).map(([key, raw]) => {
            if (typeof raw !== "number" || !Number.isFinite(raw)) throw new FactorioError("INVALID_RESPONSE", `data.counts.${key} must be a finite number`);
            return [key, raw];
          }))
        };
      }, 2),
      content: query => request("space-age.content", query, value => {
        const row = parseObject(value, "data");
        const category = readString(row, "category", "data");
        const pageValue = row["page"];
        if (pageValue === undefined) throw new FactorioError("INVALID_RESPONSE", "data.page is required");
        return { category: category as SpaceAgeContentQuery["category"], page: readPage(pageValue, "data.page", (item, path) => parseObject(item, path)) };
      }, 2)
    },
    bots: {
      list: query => request("bots", query, value => page(value, parseBot)),
      get: id => request("bot", { id }, value => parseBotDetail(value, "data")),
      create: input => request("bot.create", input, value => parseBotCreate(value, "data")),
      destroy: id => request("bot.destroy", { id }, readId),
      walk: (id, direction, ticks) => request("bot.walk", { id, direction, ticks }, value => parseBotAction(value, "data")),
      stop: id => request("bot.stop", { id }, readId),
      mine: (id, position, ticks) => request("bot.mine", { id, position, ticks }, value => parseBotAction(value, "data")),
      craftable: (id, recipe) => request("craftable", { id, recipe }, value => parseCraftable(value, "data")),
      craft: (id, recipe, count) => request("bot.craft", { id, recipe, count }, value => parseStarted(value, "data")),
      buildGhost: input => request("bot.build-ghost", input, value => parseBuildGhost(value, "data"))
    },
    chat: {
      send: (message, options = {}) => request("chat.send", { message, ...options }, value => {
        const row = parseObject(value, "data");
        const force = readOptionalString(row, "force", "data");
        return { sender: readString(row, "sender", "data"), message: readString(row, "message", "data"), ...(force === undefined ? {} : { force }) };
      }),
      follow: (after, poll_interval_ms, signal) => followChat(request, after, poll_interval_ms, signal)
    },
    shared: {
      list: (network, query) => request("shared", { ...query, network }, value => page(value, parseSharedEntry)),
      write: input => request("shared.write", input, value => parseSharedEntry(value, "data"))
    },
    events: {
      delta: (after, limit) => request("delta", { after, limit }, value => parseDelta(value, "data")),
      watch: (topic, options, parseInitial) => request("watch", { id: options.id, topic, interval: options.interval, query: options.query }, value => parseWatch(value, "data", (initial, _path) => parseInitial(initial))),
      unwatch: id => request("unwatch", { id }, readId),
      follow: (after, poll_interval_ms, signal) => followEvents(request, after, poll_interval_ms, signal)
    },
    close: () => connection.close()
  };
  try {
    await client.capabilities();
    return client;
  } catch (error) {
    await client.close();
    throw error;
  }
}

async function* followEvents(
  request: <T>(method: string, params: object, parse: (value: JsonValue) => T) => Promise<ApiResult<T>>,
  after: number,
  pollIntervalMs: number,
  signal: AbortSignal
): AsyncGenerator<EventRecord, void, void> {
  if (!Number.isInteger(after) || after < 0) throw new FactorioError("INVALID_ARGUMENT", "after must be a nonnegative integer");
  if (!Number.isInteger(pollIntervalMs) || pollIntervalMs < 1) throw new FactorioError("INVALID_ARGUMENT", "poll_interval_ms must be a positive integer");
  if (signal.aborted) return;
  let cursor = after;
  while (!signal.aborted) {
    const result = await request("delta", { after: cursor, limit: 256 }, value => parseDelta(value, "data"));
    if (signal.aborted) return;
    for (const event of result.data.items) {
      if (event.sequence !== cursor + 1) throw new FactorioError("INVALID_RESPONSE", `event sequence jumped from ${cursor} to ${event.sequence}`);
      cursor = event.sequence;
      yield event;
    }
    if (result.data.has_more) continue;
    await delay(pollIntervalMs, signal);
  }
}

function delay(milliseconds: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, milliseconds);
    const onAbort = (): void => {
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
      resolve();
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

function abortError(signal: AbortSignal): Error {
  return signal.reason instanceof Error ? signal.reason : new Error("Factorio event polling was aborted");
}


function playerRefParams(player: PlayerRef): { readonly name: string } | { readonly player_index: number } {
  if (typeof player === "string") {
    if (player.length === 0) throw new FactorioError("INVALID_ARGUMENT", "player name must not be empty");
    return { name: player };
  }
  if (!Number.isInteger(player) || player < 1) throw new FactorioError("INVALID_ARGUMENT", "player index must be a positive integer");
  return { player_index: player };
}

function parsePlayerLocation(value: JsonValue, path: string): PlayerLocation {
  const row = parseObject(value, path);
  const position = row["position"];
  if (position === undefined) throw new FactorioError("INVALID_RESPONSE", `${path}.position is required`);
  return {
    player_index: readNumber(row, "player_index", path),
    name: readString(row, "name", path),
    connected: readBoolean(row, "connected", path),
    force: readString(row, "force", path),
    surface: readString(row, "surface", path),
    position: parsePosition(position, `${path}.position`)
  };
}

async function* followChat(
  request: <T>(method: string, params: object, parse: (value: JsonValue) => T) => Promise<ApiResult<T>>,
  after: number,
  pollIntervalMs: number,
  signal: AbortSignal
): AsyncGenerator<ChatMessage, void, void> {
  for await (const event of followEvents(request, after, pollIntervalMs, signal)) {
    if (event.kind !== "chat.message") continue;
    const row = event.data;
    const source = readString(row, "source", "chat.message");
    if (source !== "player" && source !== "server") {
      throw new FactorioError("INVALID_RESPONSE", "chat.message.source must be player or server");
    }
    const positionValue = row["position"];
    const playerIndex = readOptionalNumber(row, "player_index", "chat.message");
    const playerName = readOptionalString(row, "player_name", "chat.message");
    const force = readOptionalString(row, "force", "chat.message");
    const surface = readOptionalString(row, "surface", "chat.message");
    const connected = row["connected"] === undefined ? undefined : readBoolean(row, "connected", "chat.message");
    yield {
      sequence: event.sequence,
      tick: event.tick,
      message: readString(row, "message", "chat.message"),
      source,
      ...(playerIndex === undefined ? {} : { player_index: playerIndex }),
      ...(playerName === undefined ? {} : { player_name: playerName }),
      ...(connected === undefined ? {} : { connected }),
      ...(force === undefined ? {} : { force }),
      ...(surface === undefined ? {} : { surface }),
      ...(positionValue === undefined ? {} : { position: parsePosition(positionValue, "chat.message.position") })
    };
  }
}
