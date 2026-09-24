import { createFactoBot, type FactoBotPlugin } from "factorio-bot";

const password = process.env["FACTORIO_RCON_PASSWORD"];
if (!password) throw new Error("Set FACTORIO_RCON_PASSWORD");

const autoDefense: FactoBotPlugin = async bot => {
  bot.on("entityChanged", () => {
    void (async () => {
      const enemy = await bot.nearestEntity(
        entity => entity.force === "enemy" && (entity.type === "unit" || entity.type === "turret"),
        24
      );
      if (enemy) await bot.attack(enemy, { ticks: 90 });
    })().catch(error => bot.emit("error", error));
  });
};

const bot = await createFactoBot({
  host: process.env["FACTORIO_RCON_HOST"] ?? "127.0.0.1",
  port: Number(process.env["FACTORIO_RCON_PORT"] ?? "27015"),
  password,
  connect_timeout_ms: 5000,
  request_timeout_ms: 15000,
  id: "sena",
  network: "main",
  surface: "nauvis",
  force: "player",
  position: { x: 0, y: 0 },
  attach: true
});

await bot.loadPlugin(autoDefense);

bot.on("spawn", () => {
  console.log("Sena ready");
});

bot.on("chat", (username, message) => {
  if (typeof username !== "string" || typeof message !== "string") return;

  if (message.trim().toLowerCase() === "sena sini" && username.length > 0) {
    void bot.gotoPlayer(username, { tolerance: 1.5 })
      .then(() => bot.chat("Aku sudah sampai."))
      .catch(error => bot.emit("error", error));
  }
});

const chest = await bot.nearestEntity(entity => entity.type === "container", 32);
if (chest) {
  const container = await bot.openChest(chest);
  console.log("container inventories:", await container.inventories());
}

console.log("health:", bot.health, "/", bot.maxHealth);
console.log("iron:", await bot.countItem("iron-plate"));

process.on("SIGINT", () => {
  void bot.quit();
});
