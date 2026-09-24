# Events & Plugins

FactoBot memakai `EventEmitter` Node.js di atas ordered event log dari mod.

## Event utama

### `spawn`

Dikirim setelah FactoBot selesai initialize.

```ts
bot.on("spawn", () => {
  console.log("ready");
});
```

### `chat`

Signature:

```ts
bot.on("chat", (username, message, chat) => {
  // username: string
  // message: string
  // chat: ChatMessage
});
```

Payload player dapat membawa:
- player index
- player name
- force
- surface
- physical position saat pesan diterima

### `health`

Dikirim ketika own entity health cache berubah.

```ts
bot.on("health", (health, maxHealth) => {
  console.log(health, maxHealth);
});
```

### `death`

Dikirim bila bridge melaporkan virtual bot mati.

### `move`

Dikirim ketika action state bot berubah/stopped/target lost dan state bot direfresh.

### `entityChanged`

Dikirim saat bridge menginvalidasi entity. Entity cache diperbarui jika payload bisa diparse sebagai `EntitySummary`.

### `playerChanged`

Cache player direfresh saat event player berubah.

### `researchChanged`

Dikirim ketika research mulai/selesai/reversed.

### `event`

Semua raw ordered bridge events juga diteruskan:

```ts
bot.on("event", event => {
  console.log(event.kind, event.sequence);
});
```

### `error`

**Pasang listener error pada aplikasi nyata.**

```ts
bot.on("error", error => {
  console.error(error);
});
```

Jika event polling gagal dan tidak dibatalkan secara sengaja, error diteruskan ke event ini.

## Plugin

Plugin adalah function:

```ts
type FactoBotPlugin =
  (bot: FactoBot) => void | Promise<void>;
```

Contoh:

```ts
const greetingPlugin = async bot => {
  bot.on("chat", (username, message) => {
    if (message === "halo sena") {
      void bot.chat(`Halo ${username}`);
    }
  });
};

await bot.loadPlugin(greetingPlugin);
```

Setelah selesai:
- plugin tetap hidup melalui listener yang didaftarkan.
- `pluginLoaded` dipancarkan.
- plugin dapat mengakses `bot.client` untuk API Factorio-native.

## Auto-defense plugin

```ts
const autoDefense = async bot => {
  bot.on("entityChanged", () => {
    void (async () => {
      const enemy = await bot.nearestEntity(
        e =>
          e.force === "enemy" &&
          (e.type === "unit" || e.type === "turret"),
        24
      );

      if (enemy) {
        await bot.attack(enemy, {
          ticks: 90
        });
      }
    })().catch(error => {
      bot.emit("error", error);
    });
  });
};

await bot.loadPlugin(autoDefense);
```

Untuk production, tambahkan locking/cooldown agar beberapa event tidak menjalankan combat task secara paralel.

## Follow plugin

```ts
const followPlugin = async bot => {
  const followAbort = new AbortController();

  bot.on("chat", (username, message) => {
    if (message === "sena ikut") {
      void bot.follow(username, followAbort.signal, {
        distance: 4
      });
    }

    if (message === "sena stop") {
      followAbort.abort();
    }
  });
};
```

Pada plugin nyata, buat controller baru setelah controller lama sudah abort.

## Event cursor low-level

`FactoBot` mengelola cursor sendiri. Bila menggunakan low-level client:

```ts
const start = await client.capabilities();
const controller = new AbortController();

for await (
  const event of client.events.follow(
    start.cursor,
    250,
    controller.signal
  )
) {
  console.log(event);
}
```

Bridge menyimpan event log terbatas. Cursor terlalu lama dapat menghasilkan `CURSOR_EXPIRED`; ambil snapshot baru lalu restart event stream.
