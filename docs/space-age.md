# Space Age API

Space Age bersifat opsional. Cek capability sebelum menggunakan endpoint DLC.

```ts
const capability =
  await client.spaceAge.capabilities();

if (!capability.data.available) {
  console.log(
    capability.data.limitation
  );
}
```

## Snapshot Space Age

```ts
const space =
  await client.spaceAge.snapshot({
    force: "player"
  });

console.log(
  space.data.planets.items
);

console.log(
  space.data.platforms.items
);
```

## Planet

```ts
const planets =
  await client.spaceAge.planets({
    offset: 0,
    limit: 128
  });
```

Data dapat mencakup:
- nama planet
- generated surface
- surface properties
- pollutant type
- unlock state
- platform references

Jangan hard-code hanya Nauvis/Vulcanus/Fulgora/Gleba/Aquilo jika targetnya kompatibel modded content; runtime catalog lebih fleksibel.

## Space locations & connections

```ts
const locations =
  await client.spaceAge.locations({
    offset: 0,
    limit: 128
  });

const connections =
  await client.spaceAge.connections({
    offset: 0,
    limit: 128
  });
```

Gunakan ini untuk graph perjalanan antar-space-location.

## Space platforms

```ts
const platforms =
  await client.spaceAge.platforms({
    force: "player",
    offset: 0,
    limit: 128
  });

for (const platform of platforms.data.items) {
  console.log(
    platform.name,
    platform.space_location?.name,
    platform.speed,
    platform.asteroid_chunks.length
  );
}
```

Detail platform:

```ts
const detail =
  await client.spaceAge.platform({
    force: "player",
    index: platformIndex
  });
```

Platform context dapat memuat hub inventory, route/connection, speed, damaged tiles, asteroid chunks, schedule, dan posisi perjalanan bila API runtime menyediakan data tersebut.

## Runtime content catalog

Salah satu fitur penting v0.3+ adalah catalog prototype runtime.

```ts
const summary =
  await client.spaceAge.contentSummary();

console.log(
  summary.data.counts
);
```

Kategori:

```text
items
fluids
entities
recipes
technologies
qualities
tiles
space-locations
space-connections
```

Contoh:

```ts
const technologies =
  await client.spaceAge.content({
    category: "technologies",
    offset: 0,
    limit: 128
  });
```

Catalog membaca prototype yang aktif di save, sehingga lebih cocok untuk Space Age + mod daripada database statis.

## AI/planner usage

Application layer dapat menggunakan catalog untuk:
- mengetahui recipe yang benar-benar tersedia.
- membaca technology graph.
- mengetahui entity/items dari mod.
- memilih planet/resource strategy.
- memahami quality prototypes.
- merencanakan platform tanpa hard-code seluruh DLC.

FactoBot core tidak memasukkan LLM/planner; data ini sengaja disediakan agar AI project di atas SDK dapat membuat keputusan sendiri.
