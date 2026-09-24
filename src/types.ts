export type JsonValue = string | number | boolean | null | JsonValue[] | JsonObject;
export type JsonObject = { [key: string]: JsonValue };

export interface Position {
  readonly x: number;
  readonly y: number;
}

export interface BoundingBox {
  readonly left_top: Position;
  readonly right_bottom: Position;
}

export interface PageQuery {
  readonly offset: number;
  readonly limit: number;
}

export interface AreaQuery extends PageQuery {
  readonly surface: string;
  readonly force: string;
  readonly area: BoundingBox;
}

export interface ForceQuery extends PageQuery {
  readonly force: string;
}

export interface Page<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly next_offset?: number;
}

export interface ApiResult<T> {
  readonly apiVersion: 1 | 2;
  readonly id: string;
  readonly tick: number;
  readonly cursor: number;
  readonly data: T;
}

export interface ItemStack {
  readonly name: string;
  readonly quality: string;
  readonly count: number;
}

export interface Inventory {
  readonly index: number;
  readonly slots: number;
  readonly contents: readonly ItemStack[];
}

export interface EntitySummary {
  readonly unit_number?: number;
  readonly name: string;
  readonly ghost_name?: string;
  readonly type: string;
  readonly position: Position;
  readonly surface: string;
  readonly force: string;
  readonly direction: number;
  readonly quality: string;
  readonly health?: number;
  readonly max_health?: number;
  readonly status?: number;
  readonly bounding_box: BoundingBox;
}

export interface EntityQuery {
  readonly surface: string;
  readonly name: string;
  readonly position: Position;
  readonly unit_number: number;
}

export interface EntityDetail extends EntitySummary {
  readonly inventories: readonly Inventory[];
  readonly energy_j: number;
  readonly buffer_capacity_j?: number;
  readonly electric_network_id?: number;
  readonly fluids: Readonly<Record<string, number>>;
  readonly collision_mask: JsonObject;
  readonly amount?: number;
  readonly ghost?: { readonly ghost_name: string; readonly construction_registered: boolean; readonly required_items: readonly ItemStack[] };
  readonly machine?: {
    readonly recipe?: string;
    readonly progress: number;
    readonly speed: number;
    readonly products_finished: number;
    readonly crafting: boolean;
  };
  readonly mining_target?: EntitySummary;
  readonly inserter?: {
    readonly pickup_position: Position;
    readonly drop_position: Position;
    readonly held?: ItemStack;
  };
  readonly belt?: {
    readonly speed_tiles_per_tick: number;
    readonly lines: readonly { readonly index: number; readonly contents: readonly ItemStack[] }[];
  };
  readonly burner?: { readonly remaining_burning_fuel_j: number; readonly currently_burning?: string };
  readonly space_age?: SpaceAgeEntityDetail;
}

export interface BuildGhostInput {
  readonly id: string;
  readonly name: string;
  readonly position: Position;
  readonly direction: number;
}

export interface BuildGhostResult {
  readonly id: string;
  readonly ghost_unit_number: number;
  readonly name: string;
  readonly surface: string;
  readonly force: string;
  readonly position: Position;
  readonly direction: number;
  readonly construction_registered: boolean;
  readonly required_items: readonly ItemStack[];
}

export interface Chunk {
  readonly x: number;
  readonly y: number;
  readonly generated: boolean;
  readonly charted: boolean;
  readonly visible: boolean;
  readonly pollution: number;
}

export interface Surface {
  readonly index: number;
  readonly name: string;
  readonly daytime: number;
  readonly darkness: number;
  readonly peaceful_mode: boolean;
  readonly solar_power_multiplier: number;
  readonly pollutant_type?: string;
  readonly kind?: "planet" | "space-platform" | "other";
  readonly planet?: string;
  readonly platform_index?: number;
  readonly total_pollution?: number;
}

export interface SpaceAgeCapabilities {
  readonly available: boolean;
  readonly expansion?: "space-age";
  readonly api_version: 2;
  readonly feature_set: readonly string[];
  readonly limitation?: string;
}

export interface SpaceLocation {
  readonly name: string;
  readonly type: string;
  readonly position: Position;
  readonly distance: number;
  readonly gravity_pull: number;
  readonly asteroid_spawn_influence: number;
  readonly surface_properties?: Readonly<Record<string, number>>;
}

export interface SpacePlanet {
  readonly name: string;
  readonly surface?: string;
  readonly surface_generated: boolean;
  readonly location: SpaceLocation;
  readonly pollutant_type?: string;
  readonly entities_require_heating?: boolean;
  readonly surface_properties: Readonly<Record<string, number>>;
  readonly platform_count?: number;
  readonly space_platforms_unlocked?: boolean;
  readonly space_location_unlocked?: boolean;
  readonly platforms?: readonly number[];
}

export interface SpaceConnection {
  readonly name: string;
  readonly from: string;
  readonly to: string;
  readonly length: number;
}

export interface SpaceAsteroidChunk {
  readonly name: string;
  readonly position: Position;
  readonly health?: number;
  readonly max_health?: number;
}

export interface SpaceAgeEntityDetail {
  readonly name: string;
  readonly kind: "space-platform" | "planet" | "other";
  readonly planet?: string;
  readonly platform_index?: number;
  readonly pollutant_type?: string;
  readonly asteroid_collector?: { readonly filter?: string; readonly output: readonly ItemStack[] };
  readonly cargo_pod?: {
    readonly state: string;
    readonly origin?: { readonly name: string; readonly surface: string; readonly position: Position };
    readonly destination?: {
      readonly type: number;
      readonly surface?: string | number;
      readonly position?: Position;
      readonly transform_launch_products?: boolean;
      readonly land_at_exact_position?: boolean;
      readonly station?: { readonly name: string; readonly surface: string; readonly position: Position; readonly unit_number?: number };
      readonly space_platform_index?: number;
    };
  };
  readonly rocket_silo?: { readonly status: number; readonly rocket_parts: number; readonly rocket_unit_number?: number };
  readonly cargo_bays?: readonly { readonly name: string; readonly position: Position; readonly unit_number?: number }[];
}

export interface SpacePlatform {
  readonly index: number;
  readonly name: string;
  readonly force: string;
  readonly surface?: string;
  readonly space_location?: SpaceLocation;
  readonly last_visited_space_location?: SpaceLocation;
  readonly space_connection?: SpaceConnection;
  readonly distance?: number;
  readonly state: number;
  readonly paused: boolean;
  readonly speed: number;
  readonly weight: JsonValue;
  readonly can_leave_current_location: boolean;
  readonly scheduled_for_deletion: number;
  readonly hub?: { readonly unit_number?: number; readonly position: Position; readonly health?: number; readonly inventory: readonly ItemStack[] };
  readonly schedule?: JsonObject;
  readonly damaged_tiles: readonly { readonly position: Position; readonly damage: number }[];
  readonly asteroid_chunks: readonly SpaceAsteroidChunk[];
}

export interface SpaceSurface {
  readonly name: string;
  readonly index: number;
  readonly kind: "space-platform" | "planet" | "other";
  readonly planet?: string;
  readonly platform_index?: number;
  readonly pollutant_type?: string;
  readonly total_pollution: number;
}

export interface SpaceAgeSnapshot {
  readonly api_version: 2;
  readonly available: boolean;
  readonly expansion?: "space-age";
  readonly planets: Page<SpacePlanet>;
  readonly space_locations: Page<SpaceLocation>;
  readonly space_connections: Page<SpaceConnection>;
  readonly platforms: Page<SpacePlatform>;
  readonly surfaces: Page<SpaceSurface>;
}

export interface SpacePlatformQuery extends PageQuery {
  readonly force: string;
  readonly surface?: string;
}

export interface SpacePlatformDetailQuery {
  readonly force: string;
  readonly index: number;
  readonly surface?: string;
}

export interface SpaceAgeSnapshotQuery {
  readonly force: string;
}

export type SpaceAgeContentCategory =
  | "items" | "fluids" | "entities" | "recipes" | "technologies" | "qualities"
  | "tiles" | "space-locations" | "space-connections";

export interface SpaceAgeContentQuery extends PageQuery {
  readonly category: SpaceAgeContentCategory;
}

export interface SpaceAgeContentPage {
  readonly category: SpaceAgeContentCategory;
  readonly page: Page<JsonObject>;
}

export interface SpaceAgeContentSummary {
  readonly expansion_active: boolean;
  readonly quality_active: boolean;
  readonly elevated_rails_active: boolean;
  readonly counts: Readonly<Record<string, number>>;
}


export interface TerrainTile {
  readonly position: Position;
  readonly name: string;
  readonly generated: boolean;
  readonly collision_mask: JsonObject;
  readonly character_placeable: boolean;
}

export interface TerrainPage extends Page<TerrainTile> {
  readonly passability_semantics: string;
}

export interface ResourcePatch {
  readonly query_local_id: string;
  readonly name: string;
  readonly position: Position;
  readonly bounds: BoundingBox;
  readonly tile_count: number;
  readonly observed_amount: number;
  readonly estimated_amount: number;
  readonly touches_query_boundary: boolean;
}

export interface ResourcePage extends Page<ResourcePatch> {
  readonly scope: "query-area-only";
  readonly connectivity: "8-neighbour-tiles";
}

export interface ElectricMeasurement {
  readonly scope: "whole-network";
  readonly window_seconds: number;
  readonly production_w: number;
  readonly consumption_w: number;
  readonly includes_accumulator_flows: boolean;
}

export interface ElectricNetwork {
  readonly network_id: number;
  readonly members_observed: number;
  readonly member_scope: "query-area-only";
  readonly observed_storage_j: number;
  readonly observed_storage_capacity_j: number;
  readonly observed_nominal_generation_w: number;
  readonly satisfaction: { readonly available: false; readonly reason: string };
  readonly measured?: ElectricMeasurement;
  readonly generators: readonly {
    readonly unit_number: number;
    readonly name: string;
    readonly status: number;
    readonly nominal_w: number;
    readonly energy_buffer_j: number;
    readonly fluids: Readonly<Record<string, number>>;
  }[];
  readonly accumulators: readonly { readonly unit_number: number; readonly energy_j: number; readonly capacity_j: number }[];
}

export interface LogisticNetwork {
  readonly network_id: number;
  readonly scope: string;
  readonly logistic_robots: number;
  readonly construction_robots: number;
  readonly available_logistic_robots: number;
  readonly available_construction_robots: number;
  readonly contents: readonly ItemStack[];
  readonly cells: readonly {
    readonly owner: { readonly unit_number: number; readonly name: string; readonly position: Position };
    readonly logistic_radius: number;
    readonly construction_radius: number;
    readonly charging: number;
    readonly awaiting_charge: number;
  }[];
}

export interface Recipe {
  readonly name: string;
  readonly enabled: boolean;
  readonly hidden: boolean;
  readonly category: string;
  readonly energy_seconds: number;
  readonly ingredients: readonly JsonObject[];
  readonly products: readonly JsonObject[];
  readonly surface_conditions?: readonly JsonObject[];
}

export interface ResearchTechnology {
  readonly name: string;
  readonly researched: boolean;
  readonly enabled: boolean;
  readonly available: boolean;
  readonly prerequisites: readonly { readonly name: string; readonly researched: boolean }[];
  readonly level: number;
  readonly progress?: number;
  readonly unit_count?: number;
  readonly unit_energy_ticks?: number;
  readonly ingredients: readonly JsonObject[];
  readonly trigger?: JsonObject;
}

export interface ResearchPage extends Page<ResearchTechnology> {
  readonly current?: string;
  readonly progress: number;
  readonly queue: readonly string[];
}

export interface ProductionRecord {
  readonly kind: "item" | "fluid";
  readonly name: string;
  readonly produced_total: number;
  readonly consumed_total: number;
  readonly produced_per_minute: number;
  readonly consumed_per_minute: number;
}

export interface ProductionPage extends Page<ProductionRecord> {
  readonly scope: "force-surface";
  readonly quality_semantics: string;
}

export interface Train {
  readonly id: number;
  readonly state: number;
  readonly speed_tiles_per_tick: number;
  readonly manual_mode: boolean;
  readonly has_path: boolean;
  readonly carriages: readonly { readonly unit_number: number; readonly name: string; readonly position: Position }[];
  readonly station?: { readonly unit_number: number; readonly name: string; readonly position: Position };
  readonly schedule?: JsonObject;
  readonly contents: readonly ItemStack[];
  readonly fluids: Readonly<Record<string, number>>;
}

export interface Threat extends EntitySummary {
  readonly distance_from_area_centre: number;
  readonly pollution_at_position: number;
  readonly attack_parameters?: JsonObject;
  readonly resistances?: Readonly<Record<string, JsonObject>>;
  readonly absorptions_to_join_attack?: Readonly<Record<string, number>>;
  readonly is_military_target: boolean;
}

export interface ThreatPage extends Page<Threat> {
  readonly hostile_forces: readonly { readonly name: string; readonly evolution: number }[];
  readonly pollution_at_centre: number;
  readonly peaceful_mode: boolean;
  readonly scope: string;
}

export interface Player {
  readonly index: number;
  readonly name: string;
  readonly connected: boolean;
  readonly force: string;
  readonly surface: string;
  readonly position: Position;
  readonly controller_type: number;
  readonly character?: EntitySummary;
}

export type PlayerRef = string | number;

export interface PlayerLocation {
  readonly player_index: number;
  readonly name: string;
  readonly connected: boolean;
  readonly force: string;
  readonly surface: string;
  readonly position: Position;
}

export interface ChatMessage {
  readonly sequence: number;
  readonly tick: number;
  readonly message: string;
  readonly source: "player" | "server";
  readonly player_index?: number;
  readonly player_name?: string;
  readonly connected?: boolean;
  readonly force?: string;
  readonly surface?: string;
  readonly position?: Position;
}

export interface ChatSendOptions {
  readonly sender?: string;
  readonly force?: string;
}

export interface BotAction {
  readonly kind: "walk" | "mine" | "pickup" | "attack" | "repair" | "drive";
  readonly direction?: number;
  readonly position?: Position;
  readonly unit_number?: number;
  readonly acceleration?: number;
  readonly until_tick: number;
}

export interface BotInventoryView {
  readonly id: string;
  readonly inventories: readonly Inventory[];
  readonly crafting_queue: readonly JsonObject[];
  readonly crafting_progress: number;
  readonly selected_gun_index?: number;
  readonly vehicle_unit_number?: number;
}

export interface InventoryTransferInput {
  readonly id: string;
  readonly unit_number: number;
  readonly direction: "to-entity" | "from-entity";
  readonly name: string;
  readonly count: number;
  readonly quality?: string;
  readonly bot_inventory_index?: number;
  readonly target_inventory_index?: number;
}

export interface InventoryTransferResult {
  readonly id: string;
  readonly unit_number: number;
  readonly direction: "to-entity" | "from-entity";
  readonly name: string;
  readonly quality?: string;
  readonly requested: number;
  readonly moved: number;
}

export interface ItemDropResult {
  readonly id: string;
  readonly name: string;
  readonly quality?: string;
  readonly count: number;
  readonly spilled: number;
}

export interface Bot {
  readonly id: string;
  readonly network: string;
  readonly alive: boolean;
  readonly created_tick: number;
  readonly entity?: EntitySummary;
  readonly action?: BotAction;
}

export interface BotDetail {
  readonly id: string;
  readonly network: string;
  readonly entity: EntityDetail;
  readonly crafting_queue?: readonly JsonObject[];
  readonly crafting_progress: number;
  readonly action?: BotAction;
}

export interface BotCreateResult {
  readonly id: string;
  readonly unit_number: number;
}

export interface SharedEntry {
  readonly network: string;
  readonly key: string;
  readonly value: string;
  readonly revision: number;
  readonly tick: number;
}

export interface EventRecord {
  readonly sequence: number;
  readonly tick: number;
  readonly kind: string;
  readonly data: JsonObject;
}

export interface DeltaPage {
  readonly items: readonly EventRecord[];
  readonly next_cursor: number;
  readonly head_cursor: number;
  readonly has_more: boolean;
}

export type WatchTopic = "entities" | "entity" | "bot" | "chunks" | "resources" | "electric" | "logistics" | "threats" | "research" | "bots" | "production" | "trains" | "space-age.platforms" | "space-age.planets";

export interface WatchResult<T> {
  readonly id: string;
  readonly initial: T;
  readonly interval: number;
}

export interface CapabilityLimits {
  readonly area_side: number;
  readonly entities_scanned: number;
  readonly page: number;
  readonly event_retention: number;
  readonly subscriptions: number;
  readonly bots: number;
  readonly request_bytes: number;
  readonly response_bytes: number;
}

export interface Capabilities {
  readonly mod_version: string;
  readonly api_version: 2;
  readonly minimum_factorio: string;
  readonly query_methods: readonly string[];
  readonly action_methods: readonly string[];
  readonly additional_methods: readonly string[];
  readonly space_age_methods: readonly string[];
  readonly space_age: SpaceAgeCapabilities;
  readonly actions_enabled: boolean;
  readonly enums: Readonly<Record<string, Readonly<Record<string, number>>>>;
  readonly limits: CapabilityLimits;
  readonly observation: string;
  readonly virtual_bot: string;
  readonly event_semantics: string;
}

export interface Snapshot {
  readonly scope: "bounded-area";
  readonly chunks: Page<Chunk>;
  readonly entities: Page<EntitySummary>;
  readonly resources: ResourcePage;
  readonly electric: Page<ElectricNetwork>;
  readonly logistics: Page<LogisticNetwork>;
  readonly threats: ThreatPage;
  readonly research: ResearchPage;
  readonly bots: Page<Bot>;
  readonly players: Page<Player>;
  readonly production: ProductionPage;
  readonly trains: Page<Train>;
}

export type FactorioClientOptions = {
  readonly password: string;
  readonly connect_timeout_ms: number;
  readonly request_timeout_ms: number;
} & (
  | { readonly socket_path: string; readonly host?: never; readonly port?: never }
  | { readonly socket_path?: never; readonly host: string; readonly port: number }
);

export interface WatchOptions<Q> {
  readonly id: string;
  readonly interval: number;
  readonly query: Q & PageQuery;
}

export interface SharedWriteOptions {
  readonly network: string;
  readonly key: string;
  readonly value: string;
  readonly expected_revision: number;
}

export type BridgeErrorCode =
  | "INVALID_REQUEST" | "INVALID_JSON" | "INVALID_ARGUMENT" | "VERSION_MISMATCH" | "UNKNOWN_METHOD"
  | "FORBIDDEN" | "NOT_FOUND" | "RATE_LIMIT" | "AREA_TOO_DENSE" | "RESPONSE_TOO_LARGE"
  | "CURSOR_EXPIRED" | "WATCH_TOO_LARGE" | "NETWORK_TOO_LARGE" | "ACTIONS_DISABLED" | "CONFLICT"
  | "LIMIT" | "BOT_DEAD" | "BOT_NOT_EMPTY" | "COLLISION" | "UNGENERATED_CHUNK"
  | "UNREACHABLE_TARGET" | "NOT_CRAFTABLE" | "CRAFT_FAILED" | "CREATE_FAILED" | "DESTROY_FAILED"
  | "UNSUPPORTED_RESOURCE_LAYOUT" | "UNSUPPORTED_BUILDING" | "STORAGE_VERSION" | "NOT_INITIALIZED" | "ENGINE_ERROR";

export type FactorioErrorCode = BridgeErrorCode | "RCON_AUTH_FAILED" | "RCON_CLOSED" | "RCON_PROTOCOL_ERROR" | "RCON_TIMEOUT" | "INVALID_RESPONSE";

export type Unsubscribe = () => void;
