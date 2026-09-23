import { createBot, FactorioError } from "../src/index.js";
import type { FactorioClientOptions } from "../src/index.js";

const configuration = readConfiguration(process.env);
const client = await createBot(configuration);

try {
  const area = {
    surface: configuration.surface,
    force: configuration.force,
    area: { left_top: { x: -32, y: -32 }, right_bottom: { x: 32, y: 32 } },
    offset: 0,
    limit: 128
  };
  const snapshot = await client.world.snapshot(area);
  console.log(JSON.stringify({
    tick: snapshot.tick,
    resources: snapshot.data.resources.items.map(({ name, observed_amount, bounds }) => ({ name, observed_amount, bounds })),
    electric: snapshot.data.electric.items.map(({ network_id, measured, observed_storage_j, observed_storage_capacity_j }) => ({
      network_id, measured, observed_storage_j, observed_storage_capacity_j
    })),
    enemies: snapshot.data.threats.items.map(({ name, position, health, force }) => ({ name, position, health, force }))
  }, null, 2));
} finally {
  await client.close();
}

function readConfiguration(environment: NodeJS.ProcessEnv): FactorioClientOptions & { readonly surface: string; readonly force: string } {
  const host = environment["FACTORIO_RCON_HOST"];
  const portValue = environment["FACTORIO_RCON_PORT"];
  const password = environment["FACTORIO_RCON_PASSWORD"];
  const surface = environment["FACTORIO_SURFACE"];
  const force = environment["FACTORIO_FORCE"];
  if (!host || !portValue || !password || !surface || !force) {
    throw new FactorioError("INVALID_ARGUMENT", "Set FACTORIO_RCON_HOST, FACTORIO_RCON_PORT, FACTORIO_RCON_PASSWORD, FACTORIO_SURFACE, and FACTORIO_FORCE");
  }
  const port = Number(portValue);
  if (!Number.isInteger(port)) throw new FactorioError("INVALID_ARGUMENT", "FACTORIO_RCON_PORT must be an integer");
  return { host, port, password, surface, force, connect_timeout_ms: 5000, request_timeout_ms: 15000 };
}
