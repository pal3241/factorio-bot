import { createBot } from "../src/index.js";

const password = process.env["FACTORIO_RCON_PASSWORD"];
if (!password) throw new Error("Set FACTORIO_RCON_PASSWORD before starting the client");

const bot = await createBot({
  host: process.env["FACTORIO_RCON_HOST"] ?? "127.0.0.1",
  port: Number(process.env["FACTORIO_RCON_PORT"] ?? "27015"),
  password,
  connect_timeout_ms: 5000,
  request_timeout_ms: 15000
});

try {
  const capabilities = await bot.spaceAge.capabilities();
  if (!capabilities.data.available) throw new Error(capabilities.data.limitation ?? "Space Age is not active");

  const result = await bot.spaceAge.snapshot({ force: "player" });
  for (const planet of result.data.planets.items) console.log(planet.name, planet.surface_properties);
  for (const platform of result.data.platforms.items) {
    console.log(platform.name, platform.space_location?.name, platform.space_connection, platform.asteroid_chunks.length);
  }
} finally {
  await bot.close();
}
