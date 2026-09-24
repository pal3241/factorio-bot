# factorio-bot v0.5.0

SDK TypeScript untuk mengakses **Factorio Bot World Bridge v0.5.0** melalui TCP RCON atau local RCON socket. Client SDK berjalan sebagai proses Node.js; karakter virtual dikelola mod di world Factorio. SDK tidak membuat client multiplayer tiruan.

Memerlukan Node.js 22+ dan mod `factorio-bot-mod` versi 0.5.0 pada save yang sedang dibuka. Fitur Space Age memerlukan DLC/mod Space Age aktif pada save. RCON harus aktif pada server Factorio. RCON memberi hak admin server; bind ke loopback atau jaringan privat yang sudah diamankan. Jangan commit password RCON ke source code.

## Dokumentasi

Mulai dari **[docs/README.md](docs/README.md)**.

Panduan utama:
- [Getting Started](docs/getting-started.md)
- [FactoBot API](docs/factobot-api.md)
- [Events & Plugins](docs/events-plugins.md)
- [Low-level API](docs/low-level-api.md)
- [Space Age](docs/space-age.md)
- [Architecture](docs/architecture.md)
- [Troubleshooting](docs/troubleshooting.md)
- [Mineflayer parity](docs/mineflayer-parity.md)

## Memasang

```powershell
npm ci
npm run build
```

Package menggunakan ESM dan mengekspor JavaScript, declaration types, serta RCON connector. Typecheck dan build memakai TypeScript strict. Timeout dan tujuan koneksi dinyatakan eksplisit; SDK tidak mencoba host/port atau password alternatif.



## FactoBot: façade ala Mineflayer

Untuk API yang lebih dekat ke Mineflayer, gunakan `createFactoBot()`:

```ts
import { createFactoBot } from "factorio-bot";

const bot = await createFactoBot({
  host: "127.0.0.1",
  port: 27015,
  password: process.env["FACTORIO_RCON_PASSWORD"]!,
  connect_timeout_ms: 5000,
  request_timeout_ms: 15000,
  id: "sena",
  network: "main",
  surface: "nauvis",
  force: "player",
  position: { x: 0, y: 0 },
  attach: true
});

bot.on("chat", (username, message) => {
  console.log(username, message);
});

await bot.loadPlugin(async bot => {
  bot.on("death", () => console.log("bot died"));
});

const enemy = await bot.nearestEntity(entity => entity.force === "enemy");
if (enemy) await bot.attack(enemy);

await bot.chat("Halo dari FactoBot");
```

API inti yang tersedia pada façade:

- **World/entity:** `bot.entity`, `bot.entities`, `bot.players`, `nearestEntity()`, `findEntity()`, `entityAt()`, `tileAt()`, `blockAt()`.
- **Movement:** `goto()`, `gotoPlayer()`, `follow()`, `waitForTicks()`.
- **Inventory/equipment:** `inventory()`, `countItem()`, `equip()`, `unequip()`, `toss()`, `pickup()`.
- **Container:** `openContainer()`, `openChest()`, `openFurnace()`, `deposit()`, `withdraw()`.
- **Craft/build/mine:** `craft()`, `dig()`, `collect()`, `place()`, `placeBlock()`, `rotate()`, `setRecipe()`.
- **Combat/repair:** `attack()`, `repair()`, weapon selection melalui `bot.controller.selectGun()`.
- **Vehicle:** `mount()`, `dismount()`, `moveVehicle()`, `drive()`.
- **Chat/events/plugins:** `chat()`, `on()`, `once()`, `loadPlugin()`, `quit()`, `end()`.
- **Factorio-native:** electric networks, logistics, production, research, trains, pollution/threats, resource patches, planets, space platforms, qualities, dan Space Age content catalog tetap tersedia di `bot.client`.

Beberapa nama Mineflayer sengaja dipertahankan sebagai alias (`dig`, `placeBlock`, `mount`, `dismount`, `moveVehicle`, `openChest`, `supportFeature`). Fitur Minecraft yang tidak mempunyai konsep setara seperti bed/sleep, enchantment table, villager trade, fishing, elytra, signs/books, resource packs, dan scoreboards tidak dipalsukan. Gunakan `supportFeature(name)` untuk mengecek fitur façade.

## Direct ke world GUI tanpa headless

Dengan local RCON socket, SDK terhubung ke instance Factorio desktop yang sedang kamu mainkan:

```ts
import { createBot } from "factorio-bot";

const bot = await createBot({
  socket_path: process.env.FACTORIO_LOCAL_RCON_SOCKET!,
  password: process.env.FACTORIO_RCON_PASSWORD!,
  connect_timeout_ms: 5000,
  request_timeout_ms: 15000
});
```

Tidak ada process Factorio headless kedua. TCP RCON tetap tersedia sebagai fallback untuk dedicated server/LAN.

## Membaca snapshot

```ts
import { createBot } from "factorio-bot";

const password = process.env.FACTORIO_RCON_PASSWORD;
if (!password) throw new Error("Set FACTORIO_RCON_PASSWORD before starting the client");

const bot = await createBot({
  host: "127.0.0.1",
  port: 27015,
  password,
  connect_timeout_ms: 5000,
  request_timeout_ms: 15000
});

try {
  const result = await bot.world.snapshot({
    surface: "nauvis",
    force: "player",
    area: { left_top: { x: -32, y: -32 }, right_bottom: { x: 32, y: 32 } },
    offset: 0,
    limit: 128
  });

  console.log(result.tick, result.data.resources.items);
  console.log(result.data.electric.items, result.data.threats.items);
} finally {
  await bot.close();
}
```

Semua operasi mengembalikan `ApiResult<T>` dengan `id`, `tick`, `cursor`, serta `data` bertipe. Error bridge dilempar sebagai `FactorioError` dengan `code` dan pesan asli yang bisa ditindaklanjuti. RCON yang putus, timeout, frame rusak, atau JSON yang tidak valid juga ditolak secara eksplisit.


## Chat API dan `getLocation()`

SDK v0.5 dapat membaca chat Factorio sebagai stream terstruktur:

```ts
const capabilities = await bot.capabilities();
const controller = new AbortController();

for await (const chat of bot.chat.follow(capabilities.cursor, 250, controller.signal)) {
  console.log(chat.player_name, chat.message, chat.position);
}
```

Lokasi player bisa diambil berdasarkan nama atau index:

```ts
const byName = await bot.world.getLocation("Fahri");
const byIndex = await bot.world.getLocation(1);

console.log(byName.data.surface, byName.data.position);
```

High-level virtual bot juga mempunyai `gotoPlayer()`:

```ts
const sena = bot.attachBot("sena", "main");
await sena.gotoPlayer("Fahri", { tolerance: 1.5 });
```

Contoh command chat **"Sena sini"**:

```ts
const sena = bot.attachBot("sena", "main");
const start = await bot.capabilities();
const controller = new AbortController();

for await (const chat of bot.chat.follow(start.cursor, 250, controller.signal)) {
  if (chat.source !== "player" || chat.player_index === undefined) continue;

  if (chat.message.trim().toLowerCase() === "sena sini") {
    await sena.gotoPlayer(chat.player_index, { tolerance: 1.5 });

    await bot.chat.send("Iya, aku datang.", {
      sender: "Sena",
      ...(chat.force === undefined ? {} : { force: chat.force })
    });
  }
}
```

`bot.chat.send()` memakai mutation bridge, jadi `fbot-enable-actions` harus aktif. Event chat biasa mempunyai posisi physical player saat pesan dikirim; `gotoPlayer()` memanggil `getLocation()` lagi sehingga menggunakan posisi player terbaru. Jika player dan bot berada di surface berbeda, SDK melempar `UNREACHABLE_TARGET` daripada berpura-pura bisa berjalan antarplanet.

## Space Age

Endpoint Space Age menggunakan protocol v2:

```ts
const capabilities = await bot.spaceAge.capabilities();
if (!capabilities.data.available) throw new Error(capabilities.data.limitation);

const space = await bot.spaceAge.snapshot({ force: "player" });
console.log(space.data.planets.items.map(planet => planet.name));
console.log(space.data.platforms.items.map(platform => ({
  name: platform.name,
  location: platform.space_location?.name,
  route: platform.space_connection,
  progress: platform.distance,
  asteroidCount: platform.asteroid_chunks.length
})));
```

`bot.spaceAge` menyediakan `planets`, `locations`, `connections`, `platforms`, `platform`, `contentSummary`, dan `content`. Catalog runtime dapat membaca item, fluid, entity, recipe, technology, quality, tile, space location, dan space connection dari prototype yang benar-benar aktif pada save. Semua method hanya membaca. `world.surfaces` lintas planet/platform; `world.entity` menyertakan context Space Age cargo pod, silo roket, hub/landing pad, dan asteroid collector. Event `space-age.invalidated` mengarahkan SDK membaca ulang scope yang berubah. Dukungan adapter mod pihak ketiga direncanakan untuk v0.3.

## Query terarah dan pagination

```ts
const page = await bot.world.resources({
  surface: "nauvis",
  force: "player",
  area: { left_top: { x: -32, y: -32 }, right_bottom: { x: 32, y: 32 } },
  offset: 0,
  limit: 128
});

for (const patch of page.data.items) {
  console.log(patch.name, patch.observed_amount, patch.bounds, patch.touches_query_boundary);
}
```

`world` juga mengekspos `entities`, `entity`, `surfaces`, `chunks`, `terrain`, `electric`, `logistics`, `trains`, `production`, `research`, `recipes`, `threats`, `players`, dan `snapshot`. Halaman dunia dibatasi luas dan jumlah entitas sesuai aturan mod. Pagination membaca world state live, bukan snapshot transaksi; refresh data setelah event menginvalidasi area.

Koleksi kosong pada jawaban Factorio dikodekan `{}`. SDK mengubahnya menjadi `[]` hanya saat field tersebut memang didefinisikan sebagai array. Angka resource adalah observasi pada area query. Satisfaction listrik ditandai tidak tersedia oleh mod; SDK tidak menghitung rasio perkiraan sebagai satisfaction.


## High-level API ala Mineflayer

SDK v0.5 juga menyediakan handle bot tingkat tinggi di atas primitive world bridge:

```ts
const miner = await bot.spawnBot({
  id: "miner-1",
  network: "main",
  surface: "nauvis",
  force: "player",
  position: { x: 0, y: 0 }
});

const iron = await miner.findNearestResource("iron-ore", {
  maxDistance: 192
});

await miner.goto(iron.position, {
  tolerance: 2.5
});

await miner.mineNearest("iron-ore", {
  maxDistance: 32,
  ticks: 180
});

console.log(await miner.position());
```

Method high-level sekarang juga mencakup `nearestEntity()`, `followPlayer()`, inventory transfer, equip/unequip, drop/pickup, attack/repair, placement/rotation, vehicle control, gun selection, machine recipe control, chat, `buildGhost()`, dan `stop()`. `attachBot(id)` dapat mengambil handle untuk bot yang sudah terdaftar.

Navigator v0.5 menggunakan short-step steering delapan arah dengan verifikasi posisi dan obstacle-direction recovery. Ia belum merupakan A*/navmesh penuh; jika semua arah lokal benar-benar buntu, `goto()` melempar `UNREACHABLE_TARGET` daripada men-teleport atau menembus collision.

## Virtual bot dan event

```ts
const created = await bot.bots.create({
  id: "worker-1", network: "factory-a", surface: "nauvis", force: "player", position: { x: 0, y: 0 }
});

await bot.bots.walk("worker-1", 4, 60); // east, 60 tick
const state = await bot.bots.get("worker-1");
console.log(created.data.unit_number, state.data.entity.position);
```

Primitive bot juga mencakup destroy, stop, mine, craftable, hand craft, dan penempatan machine ghost. `bots.buildGhost({id,name,position,direction})` membuat ghost mesin native pada lokasi yang bisa dijangkau karakter; Factorio construction network akan mengerjakannya bila robot dan material tersedia. Semua mutation memerlukan server setting `fbot-enable-actions`; admin dapat menyalakannya dengan `/fbot-enable-actions`. Karakter virtual mengikuti aturan jangkauan dan collision Factorio.

Mulai event polling dari cursor snapshot dan batalkan dengan `AbortController`:

```ts
const result = await bot.world.snapshot(area);
const controller = new AbortController();

for await (const event of bot.events.follow(result.cursor, 250, controller.signal)) {
  console.log(event.sequence, event.kind, event.data);
  if (event.kind === "entity.invalidated") controller.abort();
}
```

`events.watch(topic, options, parseInitial)` mendaftarkan sensor area sampled dan memberikan initial value beserta cursor. `events.delta(after, limit)` membaca invalidation/event log; `events.unwatch(id)` menghentikan subscription. `follow` tidak mendaftarkan sensor tambahan: ia mem-poll delta dan meneruskan error cursor/rate-limit kepada pemanggil.

SDK mengantrikan request melalui satu koneksi agar frame tidak tertukar ketika beberapa operasi dipanggil bersamaan. Satu panggilan RCON melakukan request beserta penanda akhir respons; keduanya memakai budget query mod. Mutation yang timeout **tidak diulang otomatis**; rekonsiliasi state terlebih dahulu karena server mungkin sudah menerapkan action. `RCON_TIMEOUT`, `RCON_CLOSED`, `RCON_AUTH_FAILED`, dan `RCON_PROTOCOL_ERROR` membedakan gangguan transport dari error Factorio API.

## Menjalankan contoh

```powershell
$env:FACTORIO_RCON_HOST = "127.0.0.1"
$env:FACTORIO_RCON_PORT = "27015"
$env:FACTORIO_RCON_PASSWORD = "your-secret"
$env:FACTORIO_SURFACE = "nauvis"
$env:FACTORIO_FORCE = "player"
npm run build
npm run example
```

Contoh berada di [`examples/read-world.ts`](examples/read-world.ts). Implementasi connector dan parsers runtime ada di `src/`; schema/API authority tetap pada `factorio-bot-mod` v1. SDK tidak mengakses `remote` secara langsung dan tidak memanggil Lua bebas.


## Catalog konten Space Age

```ts
const summary = await bot.spaceAge.contentSummary();
console.log(summary.data.counts);

const tech = await bot.spaceAge.content({
  category: "technologies",
  offset: 0,
  limit: 128
});
console.log(tech.data.page.items);
```
