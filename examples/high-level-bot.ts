import { createBot } from "factorio-bot";

const password = process.env.FACTORIO_RCON_PASSWORD;
if (!password) throw new Error("Set FACTORIO_RCON_PASSWORD");

const client = await createBot({
  host: process.env.FACTORIO_RCON_HOST ?? "127.0.0.1",
  port: Number(process.env.FACTORIO_RCON_PORT ?? "27015"),
  password,
  connect_timeout_ms: 5000,
  request_timeout_ms: 15000
});

try {
  const miner = await client.spawnBot({
    id: "miner-1",
    network: "main",
    surface: process.env.FACTORIO_SURFACE ?? "nauvis",
    force: process.env.FACTORIO_FORCE ?? "player",
    position: { x: 0, y: 0 }
  });

  console.log("spawned at", await miner.position());

  const iron = await miner.findNearestResource("iron-ore", {
    maxDistance: 192
  });
  console.log("nearest iron", iron.position, iron.estimated_amount);

  await miner.goto(iron.position, {
    tolerance: 2.5
  });

  const result = await miner.mineNearest("iron-ore", {
    maxDistance: 32,
    ticks: 180
  });

  console.log("mined", result.target.name, "at", result.target.position);
  console.log("bot position", result.state.data.entity.position);
} finally {
  await client.close();
}
