export { createBot } from "./client.js";
export { FactorioError } from "./errors.js";
export type {
  ApiResult, AreaQuery, BoundingBox, Bot, BotAction, BotCreateResult, BotDetail, BridgeErrorCode,
  BuildGhostInput, BuildGhostResult, Capabilities, CapabilityLimits, Chunk, DeltaPage, ElectricMeasurement, ElectricNetwork, EntityDetail,
  EntityQuery, EntitySummary, EventRecord, FactorioClientOptions, FactorioErrorCode,
  ForceQuery, Inventory, ItemStack, JsonObject, JsonValue, LogisticNetwork, Page, PageQuery, Player,
  Position, ProductionPage, ProductionRecord, Recipe, ResearchPage, ResearchTechnology, ResourcePage,
  ResourcePatch, SharedEntry, SharedWriteOptions, Snapshot, Surface, SpaceAgeCapabilities, SpaceAgeContentCategory,
  SpaceAgeContentPage, SpaceAgeContentQuery, SpaceAgeContentSummary, SpaceAgeEntityDetail, SpaceAgeSnapshot,
  SpaceAsteroidChunk, SpaceConnection, SpaceLocation, SpacePlatform, SpacePlatformDetailQuery,
  SpacePlatformQuery, SpacePlanet, SpaceSurface, SpaceAgeSnapshotQuery, TerrainPage, TerrainTile, Threat,
  ThreatPage, Train, Unsubscribe, WatchOptions, WatchResult, WatchTopic
} from "./types.js";
export type { FactorioBotClient } from "./client.js";

export { attachVirtualBot, spawnVirtualBot } from "./high-level.js";
export type { FindNearestResourceOptions, GotoOptions, MineNearestOptions, MineOptions, SpawnBotOptions, VirtualBot } from "./high-level.js";
