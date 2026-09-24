import { FactorioError } from "./errors.js";
import { parseBoundingBox, parseObject, parsePosition, readArray, readBoolean, readNumber, readObject, readOptionalNumber, readOptionalString, readPage, readRawArray, readRecord, readString } from "./codec.js";
import type { Bot, BotAction, BotDetail, BuildGhostResult, Capabilities, Chunk, DeltaPage, ElectricMeasurement, ElectricNetwork, EntityDetail, EntitySummary, EventRecord, Inventory, ItemStack, JsonObject, JsonValue, LogisticNetwork, Player, ProductionPage, ProductionRecord, Recipe, ResearchPage, ResearchTechnology, ResourcePage, ResourcePatch, SharedEntry, Snapshot, SpaceAgeCapabilities, SpaceAgeEntityDetail, SpaceAgeSnapshot, SpaceAsteroidChunk, SpaceConnection, SpaceLocation, SpacePlatform, SpacePlanet, SpaceSurface, Surface, TerrainPage, TerrainTile, Threat, ThreatPage, Train } from "./types.js";

export function parseItem(value: JsonValue, path: string): ItemStack {
  const item = parseObject(value, path);
  return { name: readString(item, "name", path), quality: readString(item, "quality", path), count: readNumber(item, "count", path) };
}

export function parseEntity(value: JsonValue, path: string): EntitySummary {
  const entity = parseObject(value, path);
  const position = entity["position"];
  const bounds = entity["bounding_box"];
  if (position === undefined || bounds === undefined) throw new FactorioError("INVALID_RESPONSE", `${path} is missing position or bounding_box`);
  const unit = readOptionalNumber(entity, "unit_number", path);
  const health = readOptionalNumber(entity, "health", path);
  const maxHealth = readOptionalNumber(entity, "max_health", path);
  const status = readOptionalNumber(entity, "status", path);
  const ghostName = readOptionalString(entity, "ghost_name", path);
  return { ...(unit === undefined ? {} : { unit_number: unit }), name: readString(entity, "name", path), type: readString(entity, "type", path),
    position: parsePosition(position, `${path}.position`), surface: readString(entity, "surface", path), force: readString(entity, "force", path),
    direction: readNumber(entity, "direction", path), quality: readString(entity, "quality", path), bounding_box: parseBoundingBox(bounds, `${path}.bounding_box`),
    ...(health === undefined ? {} : { health }), ...(maxHealth === undefined ? {} : { max_health: maxHealth }), ...(status === undefined ? {} : { status }),
    ...(ghostName === undefined ? {} : { ghost_name: ghostName }) };
}

export function parseEntityDetail(value: JsonValue, path: string): EntityDetail {
  const object = parseObject(value, path);
  const base = parseEntity(value, path);
  const capacity = readOptionalNumber(object, "buffer_capacity_j", path);
  const network = readOptionalNumber(object, "electric_network_id", path);
  const amount = readOptionalNumber(object, "amount", path);
  const ghost = optional(object, "ghost", (entry, entryPath) => {
    const row = parseObject(entry, entryPath);
    return { ghost_name: readString(row, "ghost_name", entryPath), construction_registered: readBoolean(row, "construction_registered", entryPath), required_items: readArray(row, "required_items", entryPath, parseItem) };
  }, path);
  const spaceAge = object["space_age"] === undefined ? undefined : parseSpaceAgeEntityDetail(object["space_age"], `${path}.space_age`);
  const machine = optional(object, "machine", (entry, entryPath) => {
    const valueMachine = parseObject(entry, entryPath);
    const recipe = readOptionalString(valueMachine, "recipe", entryPath);
    return { progress: readNumber(valueMachine, "progress", entryPath), speed: readNumber(valueMachine, "speed", entryPath),
      products_finished: readNumber(valueMachine, "products_finished", entryPath), crafting: readBoolean(valueMachine, "crafting", entryPath),
      ...(recipe === undefined ? {} : { recipe }) };
  }, path);
  const mining = optional(object, "mining_target", parseEntity, path);
  const inserter = optional(object, "inserter", (entry, entryPath) => {
    const data = parseObject(entry, entryPath);
    const held = optional(data, "held", parseItem, entryPath);
    const pickup = data["pickup_position"]; const drop = data["drop_position"];
    if (pickup === undefined || drop === undefined) throw new FactorioError("INVALID_RESPONSE", `${entryPath} is missing pickup/drop positions`);
    return { pickup_position: parsePosition(pickup, `${entryPath}.pickup_position`), drop_position: parsePosition(drop, `${entryPath}.drop_position`), ...(held === undefined ? {} : { held }) };
  }, path);
  const belt = optional(object, "belt", (entry, entryPath) => {
    const data = parseObject(entry, entryPath);
    return { speed_tiles_per_tick: readNumber(data, "speed_tiles_per_tick", entryPath), lines: readArray(data, "lines", entryPath, (line, linePath) => {
      const lineData = parseObject(line, linePath);
      return { index: readNumber(lineData, "index", linePath), contents: readArray(lineData, "contents", linePath, parseItem) };
    }) };
  }, path);
  const burner = optional(object, "burner", (entry, entryPath) => {
    const data = parseObject(entry, entryPath); const current = readOptionalString(data, "currently_burning", entryPath);
    return { remaining_burning_fuel_j: readNumber(data, "remaining_burning_fuel_j", entryPath), ...(current === undefined ? {} : { currently_burning: current }) };
  }, path);
  return { ...base, inventories: readArray(object, "inventories", path, parseInventory), energy_j: readNumber(object, "energy_j", path),
    ...(capacity === undefined ? {} : { buffer_capacity_j: capacity }), ...(network === undefined ? {} : { electric_network_id: network }),
    fluids: readRecord(object, "fluids", path, readFiniteNumber), collision_mask: readObject(object, "collision_mask", path),
    ...(amount === undefined ? {} : { amount }), ...(ghost === undefined ? {} : { ghost }), ...(machine === undefined ? {} : { machine }), ...(mining === undefined ? {} : { mining_target: mining }),
    ...(inserter === undefined ? {} : { inserter }), ...(belt === undefined ? {} : { belt }), ...(burner === undefined ? {} : { burner }),
    ...(spaceAge === undefined ? {} : { space_age: spaceAge }) };
}

function parseSpaceAgeEntityDetail(value: JsonValue, path: string): SpaceAgeEntityDetail {
  const row = parseObject(value, path);
  const kind = readString(row, "kind", path);
  if (kind !== "space-platform" && kind !== "planet" && kind !== "other") throw new FactorioError("INVALID_RESPONSE", `${path}.kind is unsupported`);
  const planet = readOptionalString(row, "planet", path);
  const platformIndex = readOptionalNumber(row, "platform_index", path);
  const pollutantType = readOptionalString(row, "pollutant_type", path);
  const asteroidCollector = optional(row, "asteroid_collector", (entry, entryPath) => {
    const collector = parseObject(entry, entryPath); const filter = readOptionalString(collector, "filter", entryPath);
    return { output: readArray(collector, "output", entryPath, parseItem), ...(filter === undefined ? {} : { filter }) };
  }, path);
  const cargoPod = optional(row, "cargo_pod", (entry, entryPath) => {
    const pod = parseObject(entry, entryPath);
    const origin = optional(pod, "origin", (originValue, originPath) => {
      const data = parseObject(originValue, originPath); const position = data["position"];
      if (position === undefined) throw new FactorioError("INVALID_RESPONSE", `${originPath}.position is required`);
      return { name: readString(data, "name", originPath), surface: readString(data, "surface", originPath), position: parsePosition(position, `${originPath}.position`) };
    }, entryPath);
    const destination = optional(pod, "destination", (destinationValue, destinationPath) => {
      const data = parseObject(destinationValue, destinationPath); const position = data["position"];
      const station = optional(data, "station", (stationValue, stationPath) => {
        const stationData = parseObject(stationValue, stationPath); const stationPosition = stationData["position"];
        if (stationPosition === undefined) throw new FactorioError("INVALID_RESPONSE", `${stationPath}.position is required`);
        const unit = readOptionalNumber(stationData, "unit_number", stationPath);
        return { name: readString(stationData, "name", stationPath), surface: readString(stationData, "surface", stationPath),
          position: parsePosition(stationPosition, `${stationPath}.position`), ...(unit === undefined ? {} : { unit_number: unit }) };
      }, destinationPath);
      const surfaceValue = data["surface"];
      if (surfaceValue !== undefined && typeof surfaceValue !== "string" && typeof surfaceValue !== "number") {
        throw new FactorioError("INVALID_RESPONSE", `${destinationPath}.surface must be a surface name or index`);
      }
      const platform = readOptionalNumber(data, "space_platform_index", destinationPath);
      return { type: readNumber(data, "type", destinationPath),
        ...(surfaceValue === undefined ? {} : { surface: surfaceValue }),
        ...(position === undefined ? {} : { position: parsePosition(position, `${destinationPath}.position`) }),
        ...(data["transform_launch_products"] === undefined ? {} : { transform_launch_products: readBoolean(data, "transform_launch_products", destinationPath) }),
        ...(data["land_at_exact_position"] === undefined ? {} : { land_at_exact_position: readBoolean(data, "land_at_exact_position", destinationPath) }),
        ...(station === undefined ? {} : { station }), ...(platform === undefined ? {} : { space_platform_index: platform }) };
    }, entryPath);
    const podOrigin = origin === undefined ? {} : { origin };
    const podDestination = destination === undefined ? {} : { destination };
    return { state: readString(pod, "state", entryPath), ...podOrigin, ...podDestination };
  }, path);
  const rocketSilo = optional(row, "rocket_silo", (entry, entryPath) => {
    const silo = parseObject(entry, entryPath); const rocket = readOptionalNumber(silo, "rocket_unit_number", entryPath);
    return { status: readNumber(silo, "status", entryPath), rocket_parts: readNumber(silo, "rocket_parts", entryPath),
      ...(rocket === undefined ? {} : { rocket_unit_number: rocket }) };
  }, path);
  const cargoBays = row["cargo_bays"] === undefined ? undefined : readArray(row, "cargo_bays", path, (entry, entryPath) => {
    const bay = parseObject(entry, entryPath); const position = bay["position"];
    if (position === undefined) throw new FactorioError("INVALID_RESPONSE", `${entryPath}.position is required`);
    const unit = readOptionalNumber(bay, "unit_number", entryPath);
    return { name: readString(bay, "name", entryPath), position: parsePosition(position, `${entryPath}.position`),
      ...(unit === undefined ? {} : { unit_number: unit }) };
  });
  return { name: readString(row, "name", path), kind,
    ...(planet === undefined ? {} : { planet }), ...(platformIndex === undefined ? {} : { platform_index: platformIndex }),
    ...(pollutantType === undefined ? {} : { pollutant_type: pollutantType }),
    ...(asteroidCollector === undefined ? {} : { asteroid_collector: asteroidCollector }),
    ...(cargoPod === undefined ? {} : { cargo_pod: cargoPod }), ...(rocketSilo === undefined ? {} : { rocket_silo: rocketSilo }),
    ...(cargoBays === undefined ? {} : { cargo_bays: cargoBays }) };
}

export function parseResource(value: JsonValue, path: string): ResourcePatch {
  const patch = parseObject(value, path); const position = patch["position"]; const bounds = patch["bounds"];
  if (position === undefined || bounds === undefined) throw new FactorioError("INVALID_RESPONSE", `${path} is missing patch geometry`);
  return { query_local_id: readString(patch, "query_local_id", path), name: readString(patch, "name", path), position: parsePosition(position, `${path}.position`),
    bounds: parseBoundingBox(bounds, `${path}.bounds`), tile_count: readNumber(patch, "tile_count", path), observed_amount: readNumber(patch, "observed_amount", path),
    estimated_amount: readNumber(patch, "estimated_amount", path), touches_query_boundary: readBoolean(patch, "touches_query_boundary", path) };
}

export function parseResourcePage(value: JsonValue, path: string): ResourcePage {
  const page = parseObject(value, path); const base = readPage(page, path, parseResource);
  if (readString(page, "scope", path) !== "query-area-only" || readString(page, "connectivity", path) !== "8-neighbour-tiles") {
    throw new FactorioError("INVALID_RESPONSE", `${path} has unsupported resource patch semantics`);
  }
  return { ...base, scope: "query-area-only", connectivity: "8-neighbour-tiles" };
}

export function parseElectric(value: JsonValue, path: string): ElectricNetwork {
  const row = parseObject(value, path); const satisfaction = readObject(row, "satisfaction", path);
  if (readBoolean(satisfaction, "available", `${path}.satisfaction`)) throw new FactorioError("INVALID_RESPONSE", "unsupported electric satisfaction semantics");
  const scope = readString(row, "member_scope", path);
  if (scope !== "query-area-only") throw new FactorioError("INVALID_RESPONSE", `${path}.member_scope is unsupported`);
  const measured = optional(row, "measured", parseMeasurement, path);
  return { network_id: readNumber(row, "network_id", path), members_observed: readNumber(row, "members_observed", path), member_scope: scope,
    observed_storage_j: readNumber(row, "observed_storage_j", path), observed_storage_capacity_j: readNumber(row, "observed_storage_capacity_j", path),
    observed_nominal_generation_w: readNumber(row, "observed_nominal_generation_w", path),
    satisfaction: { available: false, reason: readString(satisfaction, "reason", `${path}.satisfaction`) },
    generators: readArray(row, "generators", path, (valueGenerator, generatorPath) => {
      const generator = parseObject(valueGenerator, generatorPath);
      return { unit_number: readNumber(generator, "unit_number", generatorPath), name: readString(generator, "name", generatorPath), status: readNumber(generator, "status", generatorPath),
        nominal_w: readNumber(generator, "nominal_w", generatorPath), energy_buffer_j: readNumber(generator, "energy_buffer_j", generatorPath), fluids: readRecord(generator, "fluids", generatorPath, readFiniteNumber) };
    }),
    accumulators: readArray(row, "accumulators", path, (valueAccumulator, accumulatorPath) => {
      const accumulator = parseObject(valueAccumulator, accumulatorPath);
      return { unit_number: readNumber(accumulator, "unit_number", accumulatorPath), energy_j: readNumber(accumulator, "energy_j", accumulatorPath), capacity_j: readNumber(accumulator, "capacity_j", accumulatorPath) };
    }), ...(measured === undefined ? {} : { measured }) };
}

export function parseLogistics(value: JsonValue, path: string): LogisticNetwork {
  const row = parseObject(value, path);
  return { network_id: readNumber(row, "network_id", path), scope: readString(row, "scope", path), logistic_robots: readNumber(row, "logistic_robots", path),
    construction_robots: readNumber(row, "construction_robots", path), available_logistic_robots: readNumber(row, "available_logistic_robots", path),
    available_construction_robots: readNumber(row, "available_construction_robots", path), contents: readArray(row, "contents", path, parseItem),
    cells: readArray(row, "cells", path, (valueCell, cellPath) => {
      const cell = parseObject(valueCell, cellPath); const owner = readObject(cell, "owner", cellPath); const position = owner["position"];
      if (position === undefined) throw new FactorioError("INVALID_RESPONSE", `${cellPath}.owner.position is missing`);
      return { owner: { unit_number: readNumber(owner, "unit_number", cellPath), name: readString(owner, "name", cellPath), position: parsePosition(position, `${cellPath}.owner.position`) },
        logistic_radius: readNumber(cell, "logistic_radius", cellPath), construction_radius: readNumber(cell, "construction_radius", cellPath),
        charging: readNumber(cell, "charging", cellPath), awaiting_charge: readNumber(cell, "awaiting_charge", cellPath) };
    }) };
}

export function parseThreat(value: JsonValue, path: string): Threat {
  const row = parseObject(value, path);
  return { ...parseEntity(value, path), distance_from_area_centre: readNumber(row, "distance_from_area_centre", path),
    pollution_at_position: readNumber(row, "pollution_at_position", path), is_military_target: readBoolean(row, "is_military_target", path),
    ...(row["attack_parameters"] === undefined ? {} : { attack_parameters: parseObject(row["attack_parameters"], `${path}.attack_parameters`) }),
    ...(row["resistances"] === undefined ? {} : { resistances: readRecord(row, "resistances", path, (valueResistance, resistancePath) => parseObject(valueResistance, resistancePath)) }),
    ...(row["absorptions_to_join_attack"] === undefined ? {} : { absorptions_to_join_attack: readRecord(row, "absorptions_to_join_attack", path, readFiniteNumber) }) };
}

export function parseThreatPage(value: JsonValue, path: string): ThreatPage {
  const row = parseObject(value, path);
  return { ...readPage(row, path, parseThreat), hostile_forces: readArray(row, "hostile_forces", path, (valueForce, forcePath) => {
    const force = parseObject(valueForce, forcePath); return { name: readString(force, "name", forcePath), evolution: readNumber(force, "evolution", forcePath) };
  }), pollution_at_centre: readNumber(row, "pollution_at_centre", path), peaceful_mode: readBoolean(row, "peaceful_mode", path), scope: readString(row, "scope", path) };
}

export function parseResearchPage(value: JsonValue, path: string): ResearchPage {
  const row = parseObject(value, path); const current = readOptionalString(row, "current", path);
  return { ...readPage(row, path, parseTechnology), progress: readNumber(row, "progress", path),
    queue: readArray(row, "queue", path, (item, itemPath) => { if (typeof item !== "string") throw new FactorioError("INVALID_RESPONSE", `${itemPath} must be a string`); return item; }),
    ...(current === undefined ? {} : { current }) };
}

export function parseTechnology(value: JsonValue, path: string): ResearchTechnology {
  const row = parseObject(value, path); const progress = readOptionalNumber(row, "progress", path);
  const units = readOptionalNumber(row, "unit_count", path); const energy = readOptionalNumber(row, "unit_energy_ticks", path);
  return { name: readString(row, "name", path), researched: readBoolean(row, "researched", path), enabled: readBoolean(row, "enabled", path), available: readBoolean(row, "available", path),
    prerequisites: readArray(row, "prerequisites", path, (item, itemPath) => { const prerequisite = parseObject(item, itemPath); return { name: readString(prerequisite, "name", itemPath), researched: readBoolean(prerequisite, "researched", itemPath) }; }),
    level: readNumber(row, "level", path), ingredients: readRawArray(row, "ingredients", path),
    ...(progress === undefined ? {} : { progress }), ...(units === undefined ? {} : { unit_count: units }), ...(energy === undefined ? {} : { unit_energy_ticks: energy }),
    ...(row["trigger"] === undefined ? {} : { trigger: parseObject(row["trigger"], `${path}.trigger`) }) };
}

export function parseRecipe(value: JsonValue, path: string): Recipe {
  const row = parseObject(value, path);
  return { name: readString(row, "name", path), enabled: readBoolean(row, "enabled", path), hidden: readBoolean(row, "hidden", path), category: readString(row, "category", path),
    energy_seconds: readNumber(row, "energy_seconds", path), ingredients: readRawArray(row, "ingredients", path), products: readRawArray(row, "products", path),
    ...(row["surface_conditions"] === undefined ? {} : { surface_conditions: readRawArray(row, "surface_conditions", path) }) };
}

export function parseProduction(value: JsonValue, path: string): ProductionPage {
  const row = parseObject(value, path);
  return { ...readPage(row, path, (item, itemPath) => {
    const record = parseObject(item, itemPath); const kind = readString(record, "kind", itemPath);
    if (kind !== "item" && kind !== "fluid") throw new FactorioError("INVALID_RESPONSE", `${itemPath}.kind must be item or fluid`);
    return { kind, name: readString(record, "name", itemPath), produced_total: readNumber(record, "produced_total", itemPath), consumed_total: readNumber(record, "consumed_total", itemPath),
      produced_per_minute: readNumber(record, "produced_per_minute", itemPath), consumed_per_minute: readNumber(record, "consumed_per_minute", itemPath) } satisfies ProductionRecord;
  }), scope: "force-surface", quality_semantics: readString(row, "quality_semantics", path) };
}

export function parseTrain(value: JsonValue, path: string): Train {
  const row = parseObject(value, path); const station = optional(row, "station", parseIdentity, path); const schedule = row["schedule"];
  return { id: readNumber(row, "id", path), state: readNumber(row, "state", path), speed_tiles_per_tick: readNumber(row, "speed_tiles_per_tick", path),
    manual_mode: readBoolean(row, "manual_mode", path), has_path: readBoolean(row, "has_path", path), carriages: readArray(row, "carriages", path, parseIdentity),
    contents: readArray(row, "contents", path, parseItem), fluids: readRecord(row, "fluids", path, readFiniteNumber),
    ...(station === undefined ? {} : { station }), ...(schedule === undefined ? {} : { schedule: parseObject(schedule, `${path}.schedule`) }) };
}

export function parseBotAction(value: JsonValue, path: string): BotAction {
  const row = parseObject(value, path); const kind = readString(row, "kind", path);
  if (kind !== "walk" && kind !== "mine" && kind !== "pickup" && kind !== "attack" && kind !== "repair" && kind !== "drive") {
    throw new FactorioError("INVALID_RESPONSE", `${path}.kind is invalid`);
  }
  const direction = readOptionalNumber(row, "direction", path);
  const unit = readOptionalNumber(row, "unit_number", path);
  const acceleration = readOptionalNumber(row, "acceleration", path);
  const position = row["position"];
  return { kind, until_tick: readNumber(row, "until_tick", path),
    ...(direction === undefined ? {} : { direction }),
    ...(unit === undefined ? {} : { unit_number: unit }),
    ...(acceleration === undefined ? {} : { acceleration }),
    ...(position === undefined ? {} : { position: parsePosition(position, `${path}.position`) }) };
}

export function parseBot(value: JsonValue, path: string): Bot {
  const row = parseObject(value, path); const entity = optional(row, "entity", parseEntity, path); const action = optional(row, "action", parseBotAction, path);
  return { id: readString(row, "id", path), network: readString(row, "network", path), alive: readBoolean(row, "alive", path), created_tick: readNumber(row, "created_tick", path),
    ...(entity === undefined ? {} : { entity }), ...(action === undefined ? {} : { action }) };
}

export function parseBotDetail(value: JsonValue, path: string): BotDetail {
  const row = parseObject(value, path); const action = optional(row, "action", parseBotAction, path);
  return { id: readString(row, "id", path), network: readString(row, "network", path), entity: parseEntityDetail(readObject(row, "entity", path), `${path}.entity`),
    crafting_queue: readArray(row, "crafting_queue", path, (item, itemPath) => parseObject(item, itemPath)), crafting_progress: readNumber(row, "crafting_progress", path),
    ...(action === undefined ? {} : { action }) };
}

export function parsePlayer(value: JsonValue, path: string): Player {
  const row = parseObject(value, path); const position = row["position"];
  if (position === undefined) throw new FactorioError("INVALID_RESPONSE", `${path}.position is missing`);
  const character = optional(row, "character", parseEntity, path);
  return { index: readNumber(row, "index", path), name: readString(row, "name", path), connected: readBoolean(row, "connected", path), force: readString(row, "force", path),
    surface: readString(row, "surface", path), position: parsePosition(position, `${path}.position`), controller_type: readNumber(row, "controller_type", path), ...(character === undefined ? {} : { character }) };
}

export function parseTerrain(value: JsonValue, path: string): TerrainPage {
  const row = parseObject(value, path);
  return { ...readPage(row, path, (item, itemPath) => {
    const tile = parseObject(item, itemPath); const position = tile["position"];
    if (position === undefined) throw new FactorioError("INVALID_RESPONSE", `${itemPath}.position is missing`);
    return { position: parsePosition(position, `${itemPath}.position`), name: readString(tile, "name", itemPath), generated: readBoolean(tile, "generated", itemPath),
      collision_mask: readObject(tile, "collision_mask", itemPath), character_placeable: readBoolean(tile, "character_placeable", itemPath) } satisfies TerrainTile;
  }), passability_semantics: readString(row, "passability_semantics", path) };
}

export function parseChunk(value: JsonValue, path: string): Chunk {
  const row = parseObject(value, path);
  return { x: readNumber(row, "x", path), y: readNumber(row, "y", path), generated: readBoolean(row, "generated", path), charted: readBoolean(row, "charted", path), visible: readBoolean(row, "visible", path), pollution: readNumber(row, "pollution", path) };
}

export function parseSurface(value: JsonValue, path: string): Surface {
  const row = parseObject(value, path); const pollutant = readOptionalString(row, "pollutant_type", path);
  return { index: readNumber(row, "index", path), name: readString(row, "name", path), daytime: readNumber(row, "daytime", path), darkness: readNumber(row, "darkness", path),
    peaceful_mode: readBoolean(row, "peaceful_mode", path), solar_power_multiplier: readNumber(row, "solar_power_multiplier", path), ...(pollutant === undefined ? {} : { pollutant_type: pollutant }) };
}

export function parseSpaceAgeCapabilities(value: JsonValue, path: string): SpaceAgeCapabilities {
  const row = parseObject(value, path);
  const apiVersion = readNumber(row, "api_version", path);
  if (apiVersion !== 2) throw new FactorioError("INVALID_RESPONSE", `${path}.api_version must be 2`);
  const expansion = readOptionalString(row, "expansion", path);
  if (expansion !== undefined && expansion !== "space-age") throw new FactorioError("INVALID_RESPONSE", `${path}.expansion is unsupported`);
  const limitation = readOptionalString(row, "limitation", path);
  return { available: readBoolean(row, "available", path), api_version: 2,
    feature_set: readArray(row, "feature_set", path, (item, itemPath) => {
      if (typeof item !== "string") throw new FactorioError("INVALID_RESPONSE", `${itemPath} must be a string`);
      return item;
    }), ...(expansion === undefined ? {} : { expansion: expansion as "space-age" }),
    ...(limitation === undefined ? {} : { limitation }) };
}

export function parseSpaceLocation(value: JsonValue, path: string): SpaceLocation {
  const row = parseObject(value, path);
  const position = row["position"];
  if (position === undefined) throw new FactorioError("INVALID_RESPONSE", `${path}.position is required`);
  const propertiesValue = row["surface_properties"];
  const surfaceProperties = propertiesValue === undefined ? undefined : parseObject(propertiesValue, `${path}.surface_properties`);
  const surface_properties = surfaceProperties === undefined ? undefined : Object.fromEntries(Object.entries(surfaceProperties).map(([name, entry]) => {
    if (typeof entry !== "number" || !Number.isFinite(entry)) throw new FactorioError("INVALID_RESPONSE", `${path}.surface_properties.${name} must be finite`);
    return [name, entry] as const;
  }));
  return { name: readString(row, "name", path), type: readString(row, "type", path), position: parsePosition(position, `${path}.position`),
    distance: readNumber(row, "distance", path), gravity_pull: readNumber(row, "gravity_pull", path),
    asteroid_spawn_influence: readNumber(row, "asteroid_spawn_influence", path),
    ...(surface_properties === undefined ? {} : { surface_properties }) };
}

export function parseSpaceConnection(value: JsonValue, path: string): SpaceConnection {
  const row = parseObject(value, path);
  return { name: readString(row, "name", path), from: readString(row, "from", path), to: readString(row, "to", path),
    length: readNumber(row, "length", path) };
}

export function parseSpacePlanet(value: JsonValue, path: string): SpacePlanet {
  const row = parseObject(value, path); const surface = readOptionalString(row, "surface", path);
  const pollutantType = readOptionalString(row, "pollutant_type", path);
  const location = row["location"];
  if (location === undefined) throw new FactorioError("INVALID_RESPONSE", `${path}.location is required`);
  const properties = parseObject(row["surface_properties"] ?? {}, `${path}.surface_properties`);
  const surface_properties = Object.fromEntries(Object.entries(properties).map(([name, entry]) => {
    if (typeof entry !== "number" || !Number.isFinite(entry)) throw new FactorioError("INVALID_RESPONSE", `${path}.surface_properties.${name} must be finite`);
    return [name, entry] as const;
  }));
  const platformCount = readOptionalNumber(row, "platform_count", path);
  const platformsValue = row["platforms"];
  const platforms = platformsValue === undefined ? undefined : readArray(row, "platforms", path, (entry, itemPath) => {
    if (typeof entry !== "number" || !Number.isInteger(entry)) throw new FactorioError("INVALID_RESPONSE", `${itemPath} must be an integer`);
    return entry;
  });
  return { name: readString(row, "name", path), ...(surface === undefined ? {} : { surface }),
    surface_generated: readBoolean(row, "surface_generated", path), location: parseSpaceLocation(location, `${path}.location`),
    ...(pollutantType === undefined ? {} : { pollutant_type: pollutantType }), surface_properties,
    ...(platformCount === undefined ? {} : { platform_count: platformCount }),
    ...(platforms === undefined ? {} : { platforms }),
    ...(row["entities_require_heating"] === undefined ? {} : { entities_require_heating: readBoolean(row, "entities_require_heating", path) }),
    ...(row["space_platforms_unlocked"] === undefined ? {} : { space_platforms_unlocked: readBoolean(row, "space_platforms_unlocked", path) }),
    ...(row["space_location_unlocked"] === undefined ? {} : { space_location_unlocked: readBoolean(row, "space_location_unlocked", path) }) };
}

function parseAsteroid(value: JsonValue, path: string): SpaceAsteroidChunk {
  const row = parseObject(value, path); const position = row["position"];
  if (position === undefined) throw new FactorioError("INVALID_RESPONSE", `${path}.position is required`);
  const health = readOptionalNumber(row, "health", path); const maxHealth = readOptionalNumber(row, "max_health", path);
  return { name: readString(row, "name", path), position: parsePosition(position, `${path}.position`),
    ...(health === undefined ? {} : { health }), ...(maxHealth === undefined ? {} : { max_health: maxHealth }) };
}

export function parseSpacePlatform(value: JsonValue, path: string): SpacePlatform {
  const row = parseObject(value, path);
  const surface = readOptionalString(row, "surface", path);
  const connectionValue = row["space_connection"];
  const locationValue = row["space_location"];
  const lastVisitedValue = row["last_visited_space_location"];
  const hubValue = row["hub"];
  const scheduleValue = row["schedule"];
  const damage = readArray(row, "damaged_tiles", path, (item, itemPath) => {
    const tile = parseObject(item, itemPath); const position = tile["position"];
    if (position === undefined) throw new FactorioError("INVALID_RESPONSE", `${itemPath}.position is required`);
    return { position: parsePosition(position, `${itemPath}.position`), damage: readNumber(tile, "damage", itemPath) };
  });
  const connection = connectionValue === undefined ? undefined : parseSpaceConnection(connectionValue, `${path}.space_connection`);
  const hub = hubValue === undefined ? undefined : (() => {
    const value = parseObject(hubValue, `${path}.hub`); const position = value["position"];
    if (position === undefined) throw new FactorioError("INVALID_RESPONSE", `${path}.hub.position is required`);
    const unit = readOptionalNumber(value, "unit_number", `${path}.hub`);
    const health = readOptionalNumber(value, "health", `${path}.hub`);
    return { position: parsePosition(position, `${path}.hub.position`), inventory: readArray(value, "inventory", `${path}.hub`, parseItem),
      ...(unit === undefined ? {} : { unit_number: unit }), ...(health === undefined ? {} : { health }) };
  })();
  const distance = readOptionalNumber(row, "distance", path);
  return { index: readNumber(row, "index", path), name: readString(row, "name", path), force: readString(row, "force", path),
    ...(surface === undefined ? {} : { surface }),
    ...(locationValue === undefined ? {} : { space_location: parseSpaceLocation(locationValue, `${path}.space_location`) }),
    ...(lastVisitedValue === undefined ? {} : { last_visited_space_location: parseSpaceLocation(lastVisitedValue, `${path}.last_visited_space_location`) }),
    ...(connection === undefined ? {} : { space_connection: connection }), ...(distance === undefined ? {} : { distance }),
    state: readNumber(row, "state", path), paused: readBoolean(row, "paused", path), speed: readNumber(row, "speed", path),
    weight: row["weight"] ?? null,
    can_leave_current_location: readBoolean(row, "can_leave_current_location", path),
    scheduled_for_deletion: readNumber(row, "scheduled_for_deletion", path), ...(hub === undefined ? {} : { hub }),
    ...(scheduleValue === undefined ? {} : { schedule: parseObject(scheduleValue, `${path}.schedule`) }),
    damaged_tiles: damage, asteroid_chunks: readArray(row, "asteroid_chunks", path, parseAsteroid) };
}

function parseSpaceSurface(value: JsonValue, path: string): SpaceSurface {
  const row = parseObject(value, path); const planet = readOptionalString(row, "planet", path);
  const pollutantType = readOptionalString(row, "pollutant_type", path);
  const platformIndex = readOptionalNumber(row, "platform_index", path);
  const kind = readString(row, "kind", path);
  if (kind !== "space-platform" && kind !== "planet" && kind !== "other") throw new FactorioError("INVALID_RESPONSE", `${path}.kind is unsupported`);
  return { name: readString(row, "name", path), index: readNumber(row, "index", path), kind,
    total_pollution: readNumber(row, "total_pollution", path), ...(planet === undefined ? {} : { planet }),
    ...(pollutantType === undefined ? {} : { pollutant_type: pollutantType }),
    ...(platformIndex === undefined ? {} : { platform_index: platformIndex }) };
}

export function parseSpaceAgeSnapshot(value: JsonValue, path: string): SpaceAgeSnapshot {
  const row = parseObject(value, path);
  const apiVersion = readNumber(row, "api_version", path);
  if (apiVersion !== 2) throw new FactorioError("INVALID_RESPONSE", `${path}.api_version must be 2`);
  const expansion = readOptionalString(row, "expansion", path);
  if (expansion !== undefined && expansion !== "space-age") throw new FactorioError("INVALID_RESPONSE", `${path}.expansion is unsupported`);
  return { api_version: 2, available: readBoolean(row, "available", path),
    ...(expansion === undefined ? {} : { expansion }),
    planets: readPage(readObject(row, "planets", path), `${path}.planets`, parseSpacePlanet),
    space_locations: readPage(readObject(row, "space_locations", path), `${path}.space_locations`, parseSpaceLocation),
    space_connections: readPage(readObject(row, "space_connections", path), `${path}.space_connections`, parseSpaceConnection),
    platforms: readPage(readObject(row, "platforms", path), `${path}.platforms`, parseSpacePlatform),
    surfaces: readPage(readObject(row, "surfaces", path), `${path}.surfaces`, parseSpaceSurface) };
}

export function parseEvent(value: JsonValue, path: string): EventRecord {
  const row = parseObject(value, path); return { sequence: readNumber(row, "sequence", path), tick: readNumber(row, "tick", path), kind: readString(row, "kind", path), data: readObject(row, "data", path) };
}

export function parseDelta(value: JsonValue, path: string): DeltaPage {
  const row = parseObject(value, path); return { items: readArray(row, "items", path, parseEvent), next_cursor: readNumber(row, "next_cursor", path), head_cursor: readNumber(row, "head_cursor", path), has_more: readBoolean(row, "has_more", path) };
}

export function parseSharedEntry(value: JsonValue, path: string): SharedEntry {
  const row = parseObject(value, path); return { network: readString(row, "network", path), key: readString(row, "key", path), value: readString(row, "value", path), revision: readNumber(row, "revision", path), tick: readNumber(row, "tick", path) };
}

export function parseCapabilities(value: JsonValue, path: string): Capabilities {
  const row = parseObject(value, path);
  const apiVersion = readNumber(row, "api_version", path);
  if (apiVersion !== 2) throw new FactorioError("INVALID_RESPONSE", `${path}.api_version must be 2`);
  return { mod_version: readString(row, "mod_version", path), api_version: 2, minimum_factorio: readString(row, "minimum_factorio", path),
    query_methods: readStringList(row, "query_methods", path), action_methods: readStringList(row, "action_methods", path), additional_methods: readStringList(row, "additional_methods", path),
    space_age_methods: readStringList(row, "space_age_methods", path), space_age: parseSpaceAgeCapabilities(readObject(row, "space_age", path), `${path}.space_age`),
    actions_enabled: readBoolean(row, "actions_enabled", path), enums: readRecord(row, "enums", path, (entry, entryPath) => {
      const values = parseObject(entry, entryPath); return Object.fromEntries(Object.entries(values).map(([key, valueEnum]) => [key, readFiniteNumber(valueEnum, `${entryPath}.${key}`)]));
    }), limits: parseLimits(readObject(row, "limits", path), `${path}.limits`), observation: readString(row, "observation", path),
    virtual_bot: readString(row, "virtual_bot", path), event_semantics: readString(row, "event_semantics", path) };
}

export function parseSnapshot(value: JsonValue, path: string): Snapshot {
  const row = parseObject(value, path);
  const scope = readString(row, "scope", path);
  if (scope !== "bounded-area") throw new FactorioError("INVALID_RESPONSE", `${path}.scope is unsupported`);
  return { scope, chunks: readPage(readObject(row, "chunks", path), `${path}.chunks`, parseChunk),
    entities: readPage(readObject(row, "entities", path), `${path}.entities`, parseEntity), resources: parseResourcePage(readObject(row, "resources", path), `${path}.resources`),
    electric: readPage(readObject(row, "electric", path), `${path}.electric`, parseElectric), logistics: readPage(readObject(row, "logistics", path), `${path}.logistics`, parseLogistics),
    threats: parseThreatPage(readObject(row, "threats", path), `${path}.threats`), research: parseResearchPage(readObject(row, "research", path), `${path}.research`),
    bots: readPage(readObject(row, "bots", path), `${path}.bots`, parseBot), players: readPage(readObject(row, "players", path), `${path}.players`, parsePlayer),
    production: parseProduction(readObject(row, "production", path), `${path}.production`), trains: readPage(readObject(row, "trains", path), `${path}.trains`, parseTrain) };
}

export function parseIdentity(value: JsonValue, path: string): { readonly unit_number: number; readonly name: string; readonly position: { readonly x: number; readonly y: number } } {
  const row = parseObject(value, path); const position = row["position"];
  if (position === undefined) throw new FactorioError("INVALID_RESPONSE", `${path}.position is missing`);
  return { unit_number: readNumber(row, "unit_number", path), name: readString(row, "name", path), position: parsePosition(position, `${path}.position`) };
}

export function parseBotCreate(value: JsonValue, path: string): { readonly id: string; readonly unit_number: number } {
  const row = parseObject(value, path); return { id: readString(row, "id", path), unit_number: readNumber(row, "unit_number", path) };
}

export function parseBuildGhost(value: JsonValue, path: string): BuildGhostResult {
  const row = parseObject(value, path);
  const position = row["position"];
  if (position === undefined) throw new FactorioError("INVALID_RESPONSE", `${path}.position is missing`);
  return { id: readString(row, "id", path), ghost_unit_number: readNumber(row, "ghost_unit_number", path), name: readString(row, "name", path),
    surface: readString(row, "surface", path), force: readString(row, "force", path), position: parsePosition(position, `${path}.position`),
    direction: readNumber(row, "direction", path), construction_registered: readBoolean(row, "construction_registered", path), required_items: readArray(row, "required_items", path, parseItem) };
}

export function parseCraftable(value: JsonValue, path: string): { readonly recipe: string; readonly enabled: boolean; readonly count: number } {
  const row = parseObject(value, path); return { recipe: readString(row, "recipe", path), enabled: readBoolean(row, "enabled", path), count: readNumber(row, "count", path) };
}

export function parseStarted(value: JsonValue, path: string): { readonly started: number } {
  return { started: readNumber(parseObject(value, path), "started", path) };
}

export function parseWatch<T>(value: JsonValue, path: string, parseInitial: (initial: JsonValue, initialPath: string) => T): { readonly id: string; readonly initial: T; readonly interval: number } {
  const row = parseObject(value, path); const initial = row["initial"];
  if (initial === undefined) throw new FactorioError("INVALID_RESPONSE", `${path}.initial is missing`);
  return { id: readString(row, "id", path), initial: parseInitial(initial, `${path}.initial`), interval: readNumber(row, "interval", path) };
}

function parseInventory(value: JsonValue, path: string): Inventory {
  const row = parseObject(value, path); return { index: readNumber(row, "index", path), slots: readNumber(row, "slots", path), contents: readArray(row, "contents", path, parseItem) };
}

function parseMeasurement(value: JsonValue, path: string): ElectricMeasurement {
  const row = parseObject(value, path); return { scope: readString(row, "scope", path) as "whole-network", window_seconds: readNumber(row, "window_seconds", path),
    production_w: readNumber(row, "production_w", path), consumption_w: readNumber(row, "consumption_w", path), includes_accumulator_flows: readBoolean(row, "includes_accumulator_flows", path) };
}

function parseLimits(value: JsonObject, path: string): Capabilities["limits"] {
  return { area_side: readNumber(value, "area_side", path), entities_scanned: readNumber(value, "entities_scanned", path), page: readNumber(value, "page", path),
    event_retention: readNumber(value, "event_retention", path), subscriptions: readNumber(value, "subscriptions", path), bots: readNumber(value, "bots", path), request_bytes: readNumber(value, "request_bytes", path), response_bytes: readNumber(value, "response_bytes", path) };
}

function readStringList(object: JsonObject, key: string, path: string): readonly string[] {
  return readArray(object, key, path, (value, itemPath) => { if (typeof value !== "string") throw new FactorioError("INVALID_RESPONSE", `${itemPath} must be a string`); return value; });
}

function optional<T>(object: JsonObject, key: string, parse: (value: JsonValue, path: string) => T, path: string): T | undefined {
  const value = object[key]; return value === undefined ? undefined : parse(value, `${path}.${key}`);
}

function readFiniteNumber(value: JsonValue, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new FactorioError("INVALID_RESPONSE", `${path} must be a finite number`);
  return value;
}
