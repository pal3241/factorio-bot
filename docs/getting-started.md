# Getting Started

## Requirements

- Factorio **2.x**.
- `factorio-bot-mod` v0.5.x aktif pada save.
- Node.js 22+.
- RCON aktif.
- `fbot-enable-actions` aktif bila bot akan mengubah world.
- Space Age bersifat opsional.

## 1. Pasang mod

Salin folder mod ke direktori mod Factorio, misalnya pada Windows:

```text
%APPDATA%\Factorio\mods\factorio-bot-mod_0.5.0
```

Aktifkan **Factorio Bot World Bridge** lalu buka save.

Untuk menyalakan action bot:

```text
/fbot-enable-actions
```

Untuk mode sensor-only:

```text
/fbot-disable-actions
```

## 2. Pilih koneksi

### GUI-hosted world tanpa headless kedua

FactoBot tidak membutuhkan Factorio headless terpisah. Jalankan world sebagai multiplayer dari Factorio GUI dan hubungkan SDK melalui RCON/local RCON yang tersedia pada konfigurasi Factorio.

### TCP RCON

Contoh environment:

```powershell
$env:FACTORIO_RCON_HOST = "127.0.0.1"
$env:FACTORIO_RCON_PORT = "27015"
$env:FACTORIO_RCON_PASSWORD = "ganti-password"
```

Jangan expose RCON langsung ke internet. Gunakan loopback, LAN tepercaya, VPN, atau tunnel privat.

## 3. Install SDK

Dari repo:

```bash
npm ci
npm run build
```

Saat package sudah dipublish, target penggunaannya adalah:

```bash
npm install factorio-bot
```

## 4. Bot pertama

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

  // true = pakai virtual bot yang sudah ada.
  // false = buat virtual bot baru.
  attach: true
});

bot.on("error", console.error);

console.log(bot.username);
console.log(await bot.inventory());
```

Jika bot belum dibuat sebelumnya:

```ts
const bot = await createFactoBot({
  host: "127.0.0.1",
  port: 27015,
  password,
  connect_timeout_ms: 5000,
  request_timeout_ms: 15000,
  id: "sena",
  surface: "nauvis",
  force: "player",
  position: { x: 10, y: 10 },
  attach: false
});
```

Posisi spawn harus berada pada chunk generated dan tidak bertabrakan dengan entity/tile.

## 5. Chat command

```ts
bot.on("chat", (username, message) => {
  if (
    typeof username === "string" &&
    typeof message === "string" &&
    message.trim().toLowerCase() === "sena sini"
  ) {
    void bot.gotoPlayer(username, { tolerance: 1.5 })
      .then(() => bot.chat("Aku sudah sampai."))
      .catch(error => bot.emit("error", error));
  }
});
```

## 6. Cari dan tambang resource

```ts
const iron = await bot.controller.findNearestResource("iron-ore", {
  maxDistance: 192
});

await bot.goto(iron.position, { tolerance: 2.5 });
await bot.collect("iron-ore", {
  maxDistance: 32,
  ticks: 180
});
```

## 7. Buka chest

```ts
const chest = await bot.nearestEntity(
  entity => entity.type === "container",
  32
);

if (chest) {
  const container = await bot.openChest(chest);

  await container.deposit("iron-plate", 100);
  await container.withdraw("coal", 20);

  console.log(await container.inventories());
}
```

## 8. Tutup dengan benar

```ts
process.on("SIGINT", () => {
  void bot.quit();
});
```

`quit()` menghentikan event polling dan menutup transport. Virtual character di world tidak otomatis dihancurkan.
