import { createBot } from "factorio-bot";

const password = process.env["FACTORIO_RCON_PASSWORD"];
if (!password) throw new Error("Set FACTORIO_RCON_PASSWORD");

const client = await createBot({
  host: process.env["FACTORIO_RCON_HOST"] ?? "127.0.0.1",
  port: Number(process.env["FACTORIO_RCON_PORT"] ?? "27015"),
  password,
  connect_timeout_ms: 5000,
  request_timeout_ms: 15000
});

const sena = client.attachBot("sena", "main");
const capabilities = await client.capabilities();
const controller = new AbortController();

try {
  for await (const chat of client.chat.follow(capabilities.cursor, 250, controller.signal)) {
    if (chat.source !== "player" || chat.player_index === undefined) continue;

    const command = chat.message.trim().toLowerCase();

    if (command === "sena sini") {
      const location = await client.world.getLocation(chat.player_index);
      console.log("player location", location.data);

      try {
        await sena.gotoPlayer(chat.player_index, { tolerance: 1.5 });
        await client.chat.send("Iya, aku ke sini.", { sender: "Sena", force: chat.force });
      } catch (error) {
        await client.chat.send(
          error instanceof Error ? `Aku tidak bisa ke sana: ${error.message}` : "Aku tidak bisa ke sana.",
          { sender: "Sena", force: chat.force }
        );
      }
    }
  }
} finally {
  controller.abort();
  await client.close();
}
