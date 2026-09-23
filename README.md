# factorio-bot v0.2.1

SDK TypeScript untuk mengakses **Factorio Bot World Bridge v0.2.1** melalui TCP RCON. Client SDK berjalan sebagai proses Node.js; karakter virtual dikelola mod di server Factorio. SDK tidak membuat client multiplayer tiruan.

Memerlukan Node.js 22+ dan mod `factorio-bot-mod` versi 0.2.1 pada save yang sedang dibuka. Fitur Space Age memerlukan DLC/mod Space Age aktif pada save. RCON harus aktif pada server Factorio. RCON memberi hak admin server; bind ke loopback atau jaringan privat yang sudah diamankan. Jangan commit password RCON ke source code.

## Memasang

```powershell
npm ci
npm run build
```

Package menggunakan ESM dan mengekspor JavaScript, declaration types, serta RCON connector. Typecheck dan build memakai TypeScript strict. Timeout dan tujuan koneksi dinyatakan eksplisit; SDK tidak mencoba host/port atau password alternatif.

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

`bot.spaceAge` menyediakan `planets`, `locations`, `connections`, `platforms`, dan `platform`. Semua method hanya membaca. `world.surfaces` lintas planet/platform; `world.entity` menyertakan context Space Age cargo pod, silo roket, hub/landing pad, dan asteroid collector. Event `space-age.invalidated` mengarahkan SDK membaca ulang scope yang berubah. Dukungan adapter mod pihak ketiga direncanakan untuk v0.3.

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
