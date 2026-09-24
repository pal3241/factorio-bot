import { FactorioError } from "./errors.js";
import type { FactorioBotClient } from "./client.js";
import type {
  ApiResult, BotDetail, BotEquipmentResult, BotInventoryView, BuildGhostResult, EntitySummary, InventoryTransferResult, ItemDropResult, PlayerLocation, PlayerRef, Position, ResourcePatch
} from "./types.js";

export interface SpawnBotOptions {
  readonly id: string;
  readonly network?: string;
  readonly surface?: string;
  readonly force?: string;
  readonly position?: Position;
}

export interface FindNearestResourceOptions {
  readonly maxDistance?: number;
  readonly cellSize?: number;
}

export interface GotoOptions {
  readonly tolerance?: number;
  readonly stepTicks?: number;
  readonly maxSteps?: number;
  readonly tickTimeoutMs?: number;
  readonly minMovement?: number;
}

export interface MineOptions {
  readonly ticks?: number;
  readonly wait?: boolean;
  readonly tickTimeoutMs?: number;
}

export interface MineNearestOptions extends FindNearestResourceOptions, GotoOptions, MineOptions {
  readonly approachTolerance?: number;
}

export interface FindEntityOptions {
  readonly maxDistance?: number;
  readonly matcher?: (entity: EntitySummary) => boolean;
}

export interface ActionWaitOptions {
  readonly ticks?: number;
  readonly wait?: boolean;
  readonly tickTimeoutMs?: number;
}

export interface FollowPlayerOptions extends GotoOptions {
  readonly distance?: number;
  readonly intervalMs?: number;
}

export interface VirtualBot {
  readonly id: string;
  readonly network: string;
  readonly state: () => Promise<ApiResult<BotDetail>>;
  readonly position: () => Promise<Position>;
  readonly findNearestResource: (name: string, options?: FindNearestResourceOptions) => Promise<ResourcePatch>;
  readonly nearestEntity: (options?: FindEntityOptions) => Promise<EntitySummary | undefined>;
  readonly goto: (target: Position, options?: GotoOptions) => Promise<Position>;
  readonly gotoPlayer: (player: PlayerRef, options?: GotoOptions) => Promise<PlayerLocation>;
  readonly followPlayer: (player: PlayerRef, signal: AbortSignal, options?: FollowPlayerOptions) => Promise<void>;
  readonly mine: (target: Position, options?: MineOptions) => Promise<ApiResult<BotDetail>>;
  readonly mineNearest: (name: string, options?: MineNearestOptions) => Promise<{ readonly patch: ResourcePatch; readonly target: EntitySummary; readonly state: ApiResult<BotDetail> }>;
  readonly craft: (recipe: string, count?: number) => Promise<number>;
  readonly inventory: () => Promise<BotInventoryView>;
  readonly countItem: (name: string, quality?: string) => Promise<number>;
  readonly transferTo: (unitNumber: number, name: string, count: number, options?: { readonly quality?: string; readonly botInventoryIndex?: number; readonly targetInventoryIndex?: number }) => Promise<InventoryTransferResult>;
  readonly transferFrom: (unitNumber: number, name: string, count: number, options?: { readonly quality?: string; readonly botInventoryIndex?: number; readonly targetInventoryIndex?: number }) => Promise<InventoryTransferResult>;
  readonly equip: (name: string, inventoryIndex: number, count?: number, quality?: string) => Promise<BotEquipmentResult>;
  readonly unequip: (name: string, inventoryIndex: number, count?: number, quality?: string) => Promise<BotEquipmentResult>;
  readonly drop: (name: string, count: number, options?: { readonly quality?: string; readonly inventoryIndex?: number }) => Promise<ItemDropResult>;
  readonly pickup: (options?: ActionWaitOptions) => Promise<void>;
  readonly attack: (target: EntitySummary | number, options?: ActionWaitOptions) => Promise<void>;
  readonly repair: (target: EntitySummary | number, options?: ActionWaitOptions) => Promise<void>;
  readonly place: (name: string, position: Position, direction?: number) => Promise<EntitySummary>;
  readonly rotate: (target: EntitySummary | number, reverse?: boolean) => Promise<EntitySummary>;
  readonly enterVehicle: (target: EntitySummary | number) => Promise<EntitySummary>;
  readonly leaveVehicle: () => Promise<EntitySummary>;
  readonly drive: (acceleration: number, direction: number, options?: ActionWaitOptions) => Promise<void>;
  readonly selectGun: (index: number) => Promise<number | undefined>;
  readonly setRecipe: (target: EntitySummary | number, recipe: string) => Promise<void>;
  readonly chat: (message: string) => Promise<void>;
  readonly buildGhost: (name: string, position: Position, direction?: number) => Promise<BuildGhostResult>;
  readonly stop: () => Promise<void>;
}

export async function spawnVirtualBot(client: FactorioBotClient, options: SpawnBotOptions): Promise<VirtualBot> {
  const id = nonEmpty(options.id, "id");
  const network = options.network ?? "main";
  const surface = options.surface ?? "nauvis";
  const force = options.force ?? "player";
  const position = options.position ?? { x: 0, y: 0 };
  finitePosition(position, "position");

  await client.bots.create({ id, network, surface, force, position });
  return createVirtualBotHandle(client, id, network);
}

export function attachVirtualBot(client: FactorioBotClient, id: string, network = "main"): VirtualBot {
  return createVirtualBotHandle(client, nonEmpty(id, "id"), nonEmpty(network, "network"));
}

function createVirtualBotHandle(client: FactorioBotClient, id: string, network: string): VirtualBot {
  const state = (): Promise<ApiResult<BotDetail>> => client.bots.get(id);

  const position = async (): Promise<Position> => {
    const result = await state();
    return result.data.entity.position;
  };

  const findNearestResource = async (name: string, options: FindNearestResourceOptions = {}): Promise<ResourcePatch> => {
    const resourceName = nonEmpty(name, "resource name");
    const current = await state();
    const origin = current.data.entity.position;
    const surface = current.data.entity.surface;
    const force = current.data.entity.force;

    const maxDistance = positive(options.maxDistance ?? 192, "maxDistance");
    const cellSize = positiveInteger(options.cellSize ?? 96, "cellSize");
    if (cellSize > 128) throw new FactorioError("INVALID_ARGUMENT", "cellSize must be <= 128 because the world bridge limits area side length to 128");

    const half = cellSize / 2;
    const rings = Math.ceil(maxDistance / cellSize);
    let best: ResourcePatch | undefined;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let ring = 0; ring <= rings; ring += 1) {
      for (let cy = -ring; cy <= ring; cy += 1) {
        for (let cx = -ring; cx <= ring; cx += 1) {
          if (ring !== 0 && Math.max(Math.abs(cx), Math.abs(cy)) !== ring) continue;

          const center = { x: origin.x + cx * cellSize, y: origin.y + cy * cellSize };
          const result = await client.world.resources({
            surface,
            force,
            area: {
              left_top: { x: center.x - half, y: center.y - half },
              right_bottom: { x: center.x + half, y: center.y + half }
            },
            offset: 0,
            limit: 256
          });

          for (const patch of result.data.items) {
            if (patch.name !== resourceName) continue;
            const d = distance(origin, patch.position);
            if (d <= maxDistance && d < bestDistance) {
              best = patch;
              bestDistance = d;
            }
          }
        }
      }

      // Every cell in the next ring starts roughly this far away. If the current
      // best is already closer, more outward scans cannot improve it materially.
      if (best && ring * cellSize - cellSize * Math.SQRT2 > bestDistance) break;
    }

    if (!best) {
      throw new FactorioError("NOT_FOUND", `resource ${resourceName} was not found within ${maxDistance} tiles of bot ${id}`);
    }
    return best;
  };

  const nearestEntity = async (options: FindEntityOptions = {}): Promise<EntitySummary | undefined> => {
    const current = await state();
    const origin = current.data.entity.position;
    const radius = positive(options.maxDistance ?? 32, "maxDistance");
    if (radius > 64) throw new FactorioError("INVALID_ARGUMENT", "nearestEntity maxDistance must be <= 64");
    const result = await client.world.entities({
      surface: current.data.entity.surface,
      force: current.data.entity.force,
      area: {
        left_top: { x: origin.x - radius, y: origin.y - radius },
        right_bottom: { x: origin.x + radius, y: origin.y + radius }
      },
      offset: 0,
      limit: 256
    });
    return result.data.items
      .filter(entity => entity.unit_number !== current.data.entity.unit_number)
      .filter(entity => options.matcher ? options.matcher(entity) : true)
      .filter(entity => distance(origin, entity.position) <= radius)
      .sort((a, b) => distance(origin, a.position) - distance(origin, b.position))[0];
  };

  const goto = async (target: Position, options: GotoOptions = {}): Promise<Position> => {
    finitePosition(target, "target");
    const tolerance = nonNegative(options.tolerance ?? 0.8, "tolerance");
    const stepTicks = boundedInteger(options.stepTicks ?? 8, "stepTicks", 1, 120);
    const maxSteps = positiveInteger(options.maxSteps ?? 384, "maxSteps");
    const tickTimeoutMs = positiveInteger(options.tickTimeoutMs ?? 5000, "tickTimeoutMs");
    const minMovement = nonNegative(options.minMovement ?? 0.05, "minMovement");

    let current = await state();
    let last = current.data.entity.position;

    for (let step = 0; step < maxSteps; step += 1) {
      if (distance(last, target) <= tolerance) {
        await client.bots.stop(id);
        return last;
      }

      const preferred = directionToward(last, target);
      const candidates = directionCandidates(preferred);
      let moved = false;

      for (const direction of candidates) {
        const before = last;
        const action = await client.bots.walk(id, direction, stepTicks);
        current = await waitForTick(client, id, action.data.until_tick, tickTimeoutMs);
        last = current.data.entity.position;

        const travelled = distance(before, last);
        if (travelled >= minMovement) {
          moved = true;
          break;
        }
      }

      if (!moved) {
        await client.bots.stop(id);
        throw new FactorioError("UNREACHABLE_TARGET", `bot ${id} is stuck near (${last.x.toFixed(2)}, ${last.y.toFixed(2)}) while moving to (${target.x}, ${target.y})`);
      }
    }

    await client.bots.stop(id);
    throw new FactorioError("UNREACHABLE_TARGET", `bot ${id} exceeded maxSteps while moving to target`);
  };

  const gotoPlayer = async (player: PlayerRef, options: GotoOptions = {}): Promise<PlayerLocation> => {
    const [location, current] = await Promise.all([client.world.getLocation(player), state()]);
    if (location.data.surface !== current.data.entity.surface) {
      throw new FactorioError(
        "UNREACHABLE_TARGET",
        `player ${location.data.name} is on surface ${location.data.surface}, but bot ${id} is on ${current.data.entity.surface}`
      );
    }
    await goto(location.data.position, options);
    return location.data;
  };

  const followPlayer = async (player: PlayerRef, signal: AbortSignal, options: FollowPlayerOptions = {}): Promise<void> => {
    const followDistance = positive(options.distance ?? 3, "distance");
    const intervalMs = positiveInteger(options.intervalMs ?? 750, "intervalMs");
    while (!signal.aborted) {
      const [location, current] = await Promise.all([client.world.getLocation(player), state()]);
      if (location.data.surface !== current.data.entity.surface) {
        throw new FactorioError("UNREACHABLE_TARGET", `player ${location.data.name} is on surface ${location.data.surface}, but bot ${id} is on ${current.data.entity.surface}`);
      }
      if (distance(location.data.position, current.data.entity.position) > followDistance) {
        await goto(location.data.position, {
          tolerance: followDistance,
          ...(options.stepTicks === undefined ? {} : { stepTicks: options.stepTicks }),
          ...(options.maxSteps === undefined ? {} : { maxSteps: options.maxSteps }),
          ...(options.tickTimeoutMs === undefined ? {} : { tickTimeoutMs: options.tickTimeoutMs }),
          ...(options.minMovement === undefined ? {} : { minMovement: options.minMovement })
        });
      }
      if (!signal.aborted) await sleep(intervalMs);
    }
  };

  const mine = async (target: Position, options: MineOptions = {}): Promise<ApiResult<BotDetail>> => {
    finitePosition(target, "target");
    const ticks = boundedInteger(options.ticks ?? 180, "ticks", 1, 600);
    const wait = options.wait ?? true;
    const timeout = positiveInteger(options.tickTimeoutMs ?? 12000, "tickTimeoutMs");
    const action = await client.bots.mine(id, target, ticks);
    if (!wait) return state();
    return waitForTick(client, id, action.data.until_tick, timeout);
  };

  const mineNearest = async (name: string, options: MineNearestOptions = {}) => {
    const patch = await findNearestResource(name, options);
    await goto(patch.position, {
      tolerance: options.approachTolerance ?? 2.5,
      ...(options.stepTicks === undefined ? {} : { stepTicks: options.stepTicks }),
      ...(options.maxSteps === undefined ? {} : { maxSteps: options.maxSteps }),
      ...(options.tickTimeoutMs === undefined ? {} : { tickTimeoutMs: options.tickTimeoutMs }),
      ...(options.minMovement === undefined ? {} : { minMovement: options.minMovement })
    });

    const current = await state();
    const here = current.data.entity.position;
    const radius = 5;
    const entities = await client.world.entities({
      surface: current.data.entity.surface,
      force: current.data.entity.force,
      area: {
        left_top: { x: here.x - radius, y: here.y - radius },
        right_bottom: { x: here.x + radius, y: here.y + radius }
      },
      offset: 0,
      limit: 256
    });

    const target = entities.data.items
      .filter(entity => entity.type === "resource" && entity.name === name)
      .sort((a, b) => distance(here, a.position) - distance(here, b.position))[0];

    if (!target) {
      throw new FactorioError("NOT_FOUND", `resource patch ${name} was found, but no exact resource entity was visible near bot ${id}`);
    }

    // Mining is range checked by Factorio. If the selected ore is still just out
    // of reach, steering closer first avoids asking the mod to bypass game rules.
    if (distance(here, target.position) > 2) {
      await goto(target.position, {
        tolerance: 1.5,
        ...(options.stepTicks === undefined ? {} : { stepTicks: options.stepTicks }),
        ...(options.maxSteps === undefined ? {} : { maxSteps: options.maxSteps }),
        ...(options.tickTimeoutMs === undefined ? {} : { tickTimeoutMs: options.tickTimeoutMs }),
        ...(options.minMovement === undefined ? {} : { minMovement: options.minMovement })
      });
    }

    const minedState = await mine(target.position, {
      ...(options.ticks === undefined ? {} : { ticks: options.ticks }),
      ...(options.wait === undefined ? {} : { wait: options.wait }),
      ...(options.tickTimeoutMs === undefined ? {} : { tickTimeoutMs: options.tickTimeoutMs })
    });
    return { patch, target, state: minedState };
  };

  const craft = async (recipe: string, count = 1): Promise<number> => {
    const result = await client.bots.craft(id, nonEmpty(recipe, "recipe"), positiveInteger(count, "count"));
    return result.data.started;
  };

  const inventory = async (): Promise<BotInventoryView> => (await client.bots.inventory(id)).data;

  const countItem = async (name: string, quality?: string): Promise<number> => {
    const view = await inventory();
    let count = 0;
    for (const inv of view.inventories) {
      for (const stack of inv.contents) {
        if (stack.name === name && (quality === undefined || stack.quality === quality)) count += stack.count;
      }
    }
    return count;
  };

  const transferTo = async (
    unitNumber: number,
    name: string,
    count: number,
    options: { readonly quality?: string; readonly botInventoryIndex?: number; readonly targetInventoryIndex?: number } = {}
  ): Promise<InventoryTransferResult> => {
    const result = await client.bots.transfer({
      id,
      unit_number: positiveInteger(unitNumber, "unitNumber"),
      direction: "to-entity",
      name: nonEmpty(name, "name"),
      count: positiveInteger(count, "count"),
      ...(options.quality === undefined ? {} : { quality: options.quality }),
      ...(options.botInventoryIndex === undefined ? {} : { bot_inventory_index: options.botInventoryIndex }),
      ...(options.targetInventoryIndex === undefined ? {} : { target_inventory_index: options.targetInventoryIndex })
    });
    return result.data;
  };

  const transferFrom = async (
    unitNumber: number,
    name: string,
    count: number,
    options: { readonly quality?: string; readonly botInventoryIndex?: number; readonly targetInventoryIndex?: number } = {}
  ): Promise<InventoryTransferResult> => {
    const result = await client.bots.transfer({
      id,
      unit_number: positiveInteger(unitNumber, "unitNumber"),
      direction: "from-entity",
      name: nonEmpty(name, "name"),
      count: positiveInteger(count, "count"),
      ...(options.quality === undefined ? {} : { quality: options.quality }),
      ...(options.botInventoryIndex === undefined ? {} : { bot_inventory_index: options.botInventoryIndex }),
      ...(options.targetInventoryIndex === undefined ? {} : { target_inventory_index: options.targetInventoryIndex })
    });
    return result.data;
  };

  const equip = async (name: string, inventoryIndex: number, count = 1, quality?: string): Promise<BotEquipmentResult> =>
    (await client.bots.equip(id, nonEmpty(name, "name"), positiveInteger(inventoryIndex, "inventoryIndex"), positiveInteger(count, "count"), quality)).data;

  const unequip = async (name: string, inventoryIndex: number, count = 1, quality?: string): Promise<BotEquipmentResult> =>
    (await client.bots.unequip(id, nonEmpty(name, "name"), positiveInteger(inventoryIndex, "inventoryIndex"), positiveInteger(count, "count"), quality)).data;

  const drop = async (
    name: string,
    count: number,
    options: { readonly quality?: string; readonly inventoryIndex?: number } = {}
  ): Promise<ItemDropResult> => {
    const result = await client.bots.drop(id, nonEmpty(name, "name"), positiveInteger(count, "count"), {
      ...(options.quality === undefined ? {} : { quality: options.quality }),
      ...(options.inventoryIndex === undefined ? {} : { inventory_index: options.inventoryIndex })
    });
    return result.data;
  };

  const waitAction = async (action: Promise<ApiResult<{ readonly until_tick: number }>>, options: ActionWaitOptions): Promise<void> => {
    const result = await action;
    if (options.wait ?? true) {
      await waitForTick(client, id, result.data.until_tick, positiveInteger(options.tickTimeoutMs ?? 12000, "tickTimeoutMs"));
    }
  };

  const pickup = async (options: ActionWaitOptions = {}): Promise<void> => {
    await waitAction(client.bots.pickup(id, boundedInteger(options.ticks ?? 60, "ticks", 1, 600)), options);
  };

  const attack = async (target: EntitySummary | number, options: ActionWaitOptions = {}): Promise<void> => {
    await waitAction(client.bots.attack(id, unitOf(target), boundedInteger(options.ticks ?? 120, "ticks", 1, 600)), options);
  };

  const repair = async (target: EntitySummary | number, options: ActionWaitOptions = {}): Promise<void> => {
    await waitAction(client.bots.repair(id, unitOf(target), boundedInteger(options.ticks ?? 120, "ticks", 1, 600)), options);
  };

  const place = async (name: string, target: Position, direction = 0): Promise<EntitySummary> => {
    finitePosition(target, "position");
    return (await client.bots.place(id, nonEmpty(name, "name"), target, boundedInteger(direction, "direction", 0, 15))).data;
  };

  const rotate = async (target: EntitySummary | number, reverse = false): Promise<EntitySummary> =>
    (await client.bots.rotate(id, unitOf(target), reverse)).data;

  const enterVehicle = async (target: EntitySummary | number): Promise<EntitySummary> =>
    (await client.bots.enterVehicle(id, unitOf(target))).data;

  const leaveVehicle = async (): Promise<EntitySummary> => (await client.bots.leaveVehicle(id)).data;

  const drive = async (acceleration: number, direction: number, options: ActionWaitOptions = {}): Promise<void> => {
    await waitAction(
      client.bots.drive(
        id,
        boundedInteger(acceleration, "acceleration", 0, 3),
        boundedInteger(direction, "direction", 0, 2),
        boundedInteger(options.ticks ?? 60, "ticks", 1, 600)
      ),
      options
    );
  };

  const selectGun = async (index: number): Promise<number | undefined> =>
    (await client.bots.selectGun(id, positiveInteger(index, "index"))).data.selected_gun_index;

  const setRecipe = async (target: EntitySummary | number, recipe: string): Promise<void> => {
    await client.bots.setRecipe(id, unitOf(target), nonEmpty(recipe, "recipe"));
  };

  const chat = async (message: string): Promise<void> => {
    const current = await state();
    await client.chat.send(nonEmpty(message, "message"), { sender: id, force: current.data.entity.force });
  };

  const buildGhost = async (name: string, target: Position, direction = 0): Promise<BuildGhostResult> => {
    finitePosition(target, "position");
    const result = await client.bots.buildGhost({ id, name: nonEmpty(name, "name"), position: target, direction: boundedInteger(direction, "direction", 0, 15) });
    return result.data;
  };

  const stop = async (): Promise<void> => {
    await client.bots.stop(id);
  };

  return {
    id, network, state, position, findNearestResource, nearestEntity, goto, gotoPlayer, followPlayer,
    mine, mineNearest, craft, inventory, countItem, transferTo, transferFrom, equip, unequip, drop, pickup, attack, repair,
    place, rotate, enterVehicle, leaveVehicle, drive, selectGun, setRecipe, chat, buildGhost, stop
  };
}

async function waitForTick(client: FactorioBotClient, id: string, targetTick: number, timeoutMs: number): Promise<ApiResult<BotDetail>> {
  const started = Date.now();
  let current = await client.bots.get(id);

  while (current.tick <= targetTick) {
    if (Date.now() - started >= timeoutMs) {
      await client.bots.stop(id);
      throw new FactorioError("RCON_TIMEOUT", `bot ${id} did not reach Factorio tick ${targetTick} within ${timeoutMs} ms; the game may be paused or running too slowly`);
    }
    await sleep(50);
    current = await client.bots.get(id);
  }

  return current;
}

function directionToward(from: Position, to: Position): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const angle = Math.atan2(dy, dx);
  const sector = ((Math.round(angle / (Math.PI / 4)) % 8) + 8) % 8;
  return (4 + sector * 2) % 16;
}

function directionCandidates(preferred: number): readonly number[] {
  const rotations = [0, 2, -2, 4, -4, 6, -6, 8];
  return rotations.map(offset => (preferred + offset + 16) % 16);
}

function distance(a: Position, b: Position): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function unitOf(target: EntitySummary | number): number {
  if (typeof target === "number") return positiveInteger(target, "unit_number");
  if (target.unit_number === undefined) throw new FactorioError("INVALID_ARGUMENT", "target entity has no unit_number");
  return positiveInteger(target.unit_number, "unit_number");
}

function finitePosition(value: Position, name: string): void {
  if (!Number.isFinite(value.x) || !Number.isFinite(value.y)) {
    throw new FactorioError("INVALID_ARGUMENT", `${name}.x and ${name}.y must be finite numbers`);
  }
}

function nonEmpty(value: string, name: string): string {
  if (value.length === 0) throw new FactorioError("INVALID_ARGUMENT", `${name} must not be empty`);
  return value;
}

function positive(value: number, name: string): number {
  if (!Number.isFinite(value) || value <= 0) throw new FactorioError("INVALID_ARGUMENT", `${name} must be > 0`);
  return value;
}

function nonNegative(value: number, name: string): number {
  if (!Number.isFinite(value) || value < 0) throw new FactorioError("INVALID_ARGUMENT", `${name} must be >= 0`);
  return value;
}

function positiveInteger(value: number, name: string): number {
  if (!Number.isInteger(value) || value < 1) throw new FactorioError("INVALID_ARGUMENT", `${name} must be a positive integer`);
  return value;
}

function boundedInteger(value: number, name: string, min: number, max: number): number {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new FactorioError("INVALID_ARGUMENT", `${name} must be an integer between ${min} and ${max}`);
  }
  return value;
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}
