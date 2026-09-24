import { EventEmitter } from "node:events";
import { createBot, type FactorioBotClient } from "./client.js";
import type {
  ActionWaitOptions, FindEntityOptions, FollowPlayerOptions, GotoOptions, MineNearestOptions,
  MineOptions, SpawnBotOptions, VirtualBot
} from "./high-level.js";
import type {
  BotDetail, ChatMessage, EntityDetail, EntitySummary, FactorioClientOptions, Player, PlayerRef,
  Position, ResourcePatch
} from "./types.js";

export type FactoBotPlugin = (bot: FactoBot) => void | Promise<void>;

export type CreateFactoBotOptions = FactorioClientOptions & {
  readonly id: string;
  readonly network?: string;
  readonly surface?: string;
  readonly force?: string;
  readonly position?: Position;
  readonly attach?: boolean;
  readonly eventPollIntervalMs?: number;
};

export class FactoBot extends EventEmitter {
  readonly client: FactorioBotClient;
  readonly controller: VirtualBot;
  readonly username: string;
  readonly players = new Map<string, Player>();
  readonly entities = new Map<number, EntitySummary>();

  health: number | undefined;
  maxHealth: number | undefined;
  entity: EntitySummary | undefined;

  private readonly abortController = new AbortController();
  private readonly eventPollIntervalMs: number;
  private eventTask: Promise<void> | undefined;
  private closed = false;

  constructor(client: FactorioBotClient, controller: VirtualBot, eventPollIntervalMs = 250) {
    super();
    this.client = client;
    this.controller = controller;
    this.username = controller.id;
    this.eventPollIntervalMs = eventPollIntervalMs;
  }

  async initialize(): Promise<void> {
    const [capabilities] = await Promise.all([
      this.client.capabilities(),
      this.refreshState(),
      this.refreshPlayers()
    ]);
    this.eventTask = this.consumeEvents(capabilities.cursor);
    setTimeout(() => this.emit("spawn"), 0);
  }

  async loadPlugin(plugin: FactoBotPlugin): Promise<void> {
    await plugin(this);
    this.emit("pluginLoaded", plugin);
  }

  async refreshState(): Promise<BotDetail> {
    const state = await this.controller.state();
    this.entity = state.data.entity;
    this.health = state.data.entity.health;
    this.maxHealth = state.data.entity.max_health;
    return state.data;
  }

  async refreshPlayers(): Promise<ReadonlyMap<string, Player>> {
    const page = await this.client.world.players({ offset: 0, limit: 256 });
    this.players.clear();
    for (const player of page.data.items) this.players.set(player.name, player);
    return this.players;
  }

  async refreshEntities(radius = 32): Promise<ReadonlyMap<number, EntitySummary>> {
    if (!Number.isFinite(radius) || radius <= 0 || radius > 64) throw new RangeError("radius must be in (0, 64]");
    const state = await this.controller.state();
    const p = state.data.entity.position;
    const page = await this.client.world.entities({
      surface: state.data.entity.surface,
      force: state.data.entity.force,
      area: {
        left_top: { x: p.x - radius, y: p.y - radius },
        right_bottom: { x: p.x + radius, y: p.y + radius }
      },
      offset: 0,
      limit: 256
    });
    this.entities.clear();
    for (const entity of page.data.items) {
      if (entity.unit_number !== undefined) this.entities.set(entity.unit_number, entity);
    }
    return this.entities;
  }

  async nearestEntity(matcher?: (entity: EntitySummary) => boolean, maxDistance = 32): Promise<EntitySummary | undefined> {
    const options: FindEntityOptions = {
      maxDistance,
      ...(matcher === undefined ? {} : { matcher })
    };
    return this.controller.nearestEntity(options);
  }

  async entityAt(unitNumber: number): Promise<EntityDetail | undefined> {
    await this.refreshEntities(64);
    const known = this.entities.get(unitNumber);
    if (!known) return undefined;
    return (await this.client.world.entity({
      surface: known.surface,
      name: known.name,
      position: known.position,
      unit_number: known.unit_number ?? 0
    })).data;
  }

  async chat(message: string): Promise<void> {
    await this.controller.chat(message);
  }

  async goto(position: Position, options?: GotoOptions): Promise<Position> {
    return this.controller.goto(position, options);
  }

  async gotoPlayer(player: PlayerRef, options?: GotoOptions): Promise<void> {
    await this.controller.gotoPlayer(player, options);
  }

  async follow(player: PlayerRef, signal: AbortSignal, options?: FollowPlayerOptions): Promise<void> {
    await this.controller.followPlayer(player, signal, options);
  }

  async dig(entity: EntitySummary, options?: MineOptions): Promise<void> {
    await this.controller.mine(entity.position, options);
  }

  async collect(resourceName: string, options?: MineNearestOptions): Promise<ResourcePatch> {
    const result = await this.controller.mineNearest(resourceName, options);
    return result.patch;
  }

  async attack(entity: EntitySummary, options?: ActionWaitOptions): Promise<void> {
    await this.controller.attack(entity, options);
  }

  async repair(entity: EntitySummary, options?: ActionWaitOptions): Promise<void> {
    await this.controller.repair(entity, options);
  }

  async place(name: string, position: Position, direction = 0): Promise<EntitySummary> {
    return this.controller.place(name, position, direction);
  }

  async toss(name: string, count: number): Promise<void> {
    await this.controller.drop(name, count);
  }

  async craft(recipe: string, count = 1): Promise<number> {
    return this.controller.craft(recipe, count);
  }

  async countItem(name: string, quality?: string): Promise<number> {
    return this.controller.countItem(name, quality);
  }

  async waitForTicks(ticks: number): Promise<void> {
    if (!Number.isInteger(ticks) || ticks < 1) throw new RangeError("ticks must be a positive integer");
    const start = await this.controller.state();
    const target = start.tick + ticks;
    while (!this.abortController.signal.aborted) {
      const now = await this.controller.state();
      if (now.tick >= target) return;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  async quit(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    this.abortController.abort();
    try {
      await this.eventTask;
    } catch {
      // Event loop errors are emitted separately.
    }
    await this.client.close();
    this.emit("end");
    this.removeAllListeners();
  }

  async end(): Promise<void> {
    await this.quit();
  }

  private async consumeEvents(cursor: number): Promise<void> {
    try {
      for await (const event of this.client.events.follow(cursor, this.eventPollIntervalMs, this.abortController.signal)) {
        this.emit("event", event);

        if (event.kind === "chat.message") {
          const chat = chatFromEvent(event);
          this.emit("chat", chat.player_name ?? "", chat.message, chat);
          continue;
        }

        if (event.kind === "entity.invalidated") {
          this.emit("entityChanged", event.data);
          continue;
        }

        if (event.kind === "player.changed") {
          await this.refreshPlayers();
          this.emit("playerChanged", event.data);
          continue;
        }

        if (event.kind === "research.changed") {
          this.emit("researchChanged", event.data);
          continue;
        }

        if (event.kind === "bot.died") {
          const id = event.data["id"];
          if (id === this.username) this.emit("death");
          continue;
        }

        if (event.kind === "bot.action" || event.kind === "bot.stopped" || event.kind === "bot.target_lost") {
          const id = event.data["id"];
          if (id === this.username) {
            await this.refreshState();
            this.emit("move", this.entity);
          }
        }
      }
    } catch (error) {
      if (!this.abortController.signal.aborted) this.emit("error", error);
    }
  }
}

export async function createFactoBot(options: CreateFactoBotOptions): Promise<FactoBot> {
  const {
    id,
    network = "main",
    surface = "nauvis",
    force = "player",
    position = { x: 0, y: 0 },
    attach = false,
    eventPollIntervalMs = 250,
    ...connection
  } = options;

  const client = await createBot(connection);
  try {
    const controller = attach
      ? client.attachBot(id, network)
      : await client.spawnBot({ id, network, surface, force, position } satisfies SpawnBotOptions);
    const bot = new FactoBot(client, controller, eventPollIntervalMs);
    await bot.initialize();
    return bot;
  } catch (error) {
    await client.close();
    throw error;
  }
}

function chatFromEvent(event: {
  readonly sequence: number;
  readonly tick: number;
  readonly data: { readonly [key: string]: unknown };
}): ChatMessage {
  const source = event.data["source"];
  const message = event.data["message"];
  if ((source !== "player" && source !== "server") || typeof message !== "string") {
    return { sequence: event.sequence, tick: event.tick, source: "server", message: String(message ?? "") };
  }
  const playerIndex = event.data["player_index"];
  const playerName = event.data["player_name"];
  const force = event.data["force"];
  const surface = event.data["surface"];
  const connected = event.data["connected"];
  const position = event.data["position"];
  const parsedPosition = isPosition(position) ? position : undefined;

  return {
    sequence: event.sequence,
    tick: event.tick,
    source,
    message,
    ...(typeof playerIndex === "number" ? { player_index: playerIndex } : {}),
    ...(typeof playerName === "string" ? { player_name: playerName } : {}),
    ...(typeof connected === "boolean" ? { connected } : {}),
    ...(typeof force === "string" ? { force } : {}),
    ...(typeof surface === "string" ? { surface } : {}),
    ...(parsedPosition === undefined ? {} : { position: parsedPosition })
  };
}

function isPosition(value: unknown): value is Position {
  if (typeof value !== "object" || value === null) return false;
  const row = value as { readonly x?: unknown; readonly y?: unknown };
  return typeof row.x === "number" && Number.isFinite(row.x) && typeof row.y === "number" && Number.isFinite(row.y);
}
