# FactoBot High-level API

`FactoBot` adalah façade utama yang paling mirip pola penggunaan Mineflayer.

## Membuat bot

```ts
import { createFactoBot } from "factorio-bot";

const bot = await createFactoBot({
  host: "127.0.0.1",
  port: 27015,
  password,
  connect_timeout_ms: 5000,
  request_timeout_ms: 15000,
  id: "sena",
  network: "main",
  surface: "nauvis",
  force: "player",
  position: { x: 0, y: 0 },
  attach: true,
  eventPollIntervalMs: 250
});
```

## Properti utama

- `bot.username` — id virtual bot.
- `bot.entity` — cached own entity summary.
- `bot.health` / `bot.maxHealth` — health cache.
- `bot.players` — `Map<string, Player>`.
- `bot.entities` — `Map<number, EntitySummary>`.
- `bot.client` — low-level typed client.
- `bot.controller` — `VirtualBot` high-level handle.

## World & entity

### `refreshPlayers()`

Memuat ulang cache player.

```ts
await bot.refreshPlayers();
console.log(bot.players.get("Fahri"));
```

### `refreshEntities(radius?)`

Memuat entity sekitar bot. Radius maksimum high-level saat ini 64 tile.

```ts
await bot.refreshEntities(32);
```

### `nearestEntity(matcher?, maxDistance?)`

```ts
const enemy = await bot.nearestEntity(
  e => e.force === "enemy",
  24
);
```

### `findEntity(...)`

Alias untuk `nearestEntity()`.

### `entityAt(unitNumber)`

Mengambil detail entity yang diketahui di sekitar bot.

### `tileAt(position)` / `blockAt(position)`

Mengambil tile Factorio pada posisi.

## Movement

### `goto(position, options?)`

```ts
await bot.goto(
  { x: 100, y: -20 },
  {
    tolerance: 1,
    stepTicks: 8,
    maxSteps: 384
  }
);
```

Navigator v0.5 memakai short-step steering dengan collision dan obstacle-direction recovery. Ini **belum A*** global.

### `gotoPlayer(player, options?)`

```ts
await bot.gotoPlayer("Fahri", {
  tolerance: 1.5
});
```

Nama atau player index dapat digunakan. Jika player berada di surface berbeda, method gagal dengan `UNREACHABLE_TARGET`.

### `follow(player, signal, options?)`

```ts
const controller = new AbortController();

void bot.follow(
  "Fahri",
  controller.signal,
  {
    distance: 4,
    intervalMs: 750
  }
);

// nanti
controller.abort();
```

### `waitForTicks(ticks)`

Menunggu berdasarkan simulation tick Factorio, bukan timer asumsi 60 UPS.

## Chat

### `chat(message)`

```ts
await bot.chat("Aku datang.");
```

Pesan ditulis sebagai bot melalui bridge.

## Mining

### `dig(entity, options?)`

```ts
const ore = await bot.nearestEntity(
  e => e.type === "resource" && e.name === "iron-ore"
);

if (ore) {
  await bot.dig(ore, { ticks: 180 });
}
```

### `collect(resourceName, options?)`

Cari patch, bergerak mendekat, pilih resource entity yang valid, lalu mining.

```ts
await bot.collect("copper-ore", {
  maxDistance: 128,
  ticks: 180
});
```

## Building

### `place(name, position, direction?)`

Placement nyata: membutuhkan item yang dapat menempatkan entity tersebut, harus dalam build range, dan collision harus valid.

```ts
await bot.place(
  "assembling-machine-1",
  { x: 20, y: 10 }
);
```

### `placeBlock(...)`

Alias untuk `place()`.

### `rotate(entity, reverse?)`

Memutar reachable entity.

### `controller.buildGhost(...)`

Untuk workflow construction robot:

```ts
await bot.controller.buildGhost(
  "electric-mining-drill",
  { x: 50, y: 20 }
);
```

## Inventory

### `inventory()`

```ts
const view = await bot.inventory();

for (const inv of view.inventories) {
  console.log(inv.index, inv.contents);
}
```

### `countItem(name, quality?)`

```ts
const plates = await bot.countItem("iron-plate");
```

### `toss(name, count)`

Mengeluarkan item nyata dari inventory ke world.

### `pickup(options?)`

Mengaktifkan character picking state selama bounded ticks.

## Equipment

### `equip(name, inventoryIndex, count?, quality?)`

Memindahkan item dari main inventory ke inventory khusus character.

### `unequip(...)`

Kebalikannya.

Indeks inventory bergantung pada enum Factorio. Low-level capabilities mengekspos `defines.inventory`.

## Containers

### `openContainer(entity)`

Menghasilkan `FactoContainer`.

Alias:
- `openChest()`
- `openFurnace()`

### `container.inventories()`

Membaca inventory entity.

### `container.deposit(name, count, options?)`

Bot → entity.

### `container.withdraw(name, count, options?)`

Entity → bot.

Transfer mengikuti reach dan kapasitas inventory. Item yang tidak muat dikembalikan ke source sebanyak mungkin.

## Crafting & machine

### `craft(recipe, count?)`

Hand crafting native Factorio.

```ts
await bot.craft("iron-gear-wheel", 10);
```

### `setRecipe(entity, recipe)`

Mengubah recipe machine reachable bila entity mendukungnya.

## Combat

### `attack(entity, options?)`

Menggunakan weapon/ammo character yang saat ini tersedia.

```ts
const biter = await bot.nearestEntity(
  e => e.force === "enemy" && e.type === "unit",
  20
);

if (biter) {
  await bot.attack(biter, { ticks: 120 });
}
```

### `repair(entity, options?)`

Memakai repair state character terhadap target reachable.

### Gun slot

Gun selection saat ini tersedia di VirtualBot:

```ts
await bot.controller.selectGun(1);
```

## Vehicle

### `mount(entity)` / `enterVehicle(entity)`

Menjadikan virtual character sebagai driver.

### `dismount()` / `leaveVehicle()`

Keluar dari kendaraan.

### `moveVehicle(left, forward, options?)`

Nilai:
- `left`: -1, 0, 1
- `forward`: -1, 0, 1

FactoBot mengambil enum riding aktual dari capabilities bridge.

### `drive(acceleration, direction, options?)`

Low-level riding enum version.

## Feature detection

```ts
if (bot.supportFeature("attack")) {
  // ...
}
```

Alias: `supportsFeature()`.

## Menutup koneksi

```ts
await bot.quit();
```

Alias: `end()`.
