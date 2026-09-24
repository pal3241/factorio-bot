# Low-level FactorioBotClient

Gunakan `createBot()` bila membutuhkan API typed yang dekat dengan protocol bridge.

```ts
import { createBot } from "factorio-bot";

const client = await createBot({
  host: "127.0.0.1",
  port: 27015,
  password,
  connect_timeout_ms: 5000,
  request_timeout_ms: 15000
});
```

## `client.world`

### Snapshot

```ts
const snapshot = await client.world.snapshot({
  surface: "nauvis",
  force: "player",
  area: {
    left_top: { x: -32, y: -32 },
    right_bottom: { x: 32, y: 32 }
  },
  offset: 0,
  limit: 128
});
```

Snapshot mencakup:
- chunks
- entities
- resources
- electric
- logistics
- threats
- research
- bots
- players
- production
- trains

### Query terarah

```ts
client.world.surfaces(...)
client.world.chunks(...)
client.world.terrain(...)
client.world.entities(...)
client.world.entity(...)
client.world.resources(...)
client.world.electric(...)
client.world.logistics(...)
client.world.trains(...)
client.world.production(...)
client.world.research(...)
client.world.recipes(...)
client.world.threats(...)
client.world.players(...)
client.world.player(...)
client.world.getLocation(...)
```

Area query maksimum ditentukan capabilities bridge. Jangan melakukan scan world tanpa batas; paginate dan query area sesuai kebutuhan.

## `client.bots`

### Lifecycle

```ts
await client.bots.create({
  id: "worker-1",
  network: "main",
  surface: "nauvis",
  force: "player",
  position: { x: 0, y: 0 }
});

await client.bots.destroy("worker-1");
```

### Primitive movement/mining

```ts
await client.bots.walk("worker-1", 4, 60);
await client.bots.stop("worker-1");
await client.bots.mine(
  "worker-1",
  { x: 10, y: 5 },
  180
);
```

### Inventory

```ts
await client.bots.inventory("worker-1");

await client.bots.transfer({
  id: "worker-1",
  unit_number: 123,
  direction: "to-entity",
  name: "iron-plate",
  count: 100
});

await client.bots.drop(
  "worker-1",
  "coal",
  10
);
```

### Equipment

```ts
await client.bots.equip(
  "worker-1",
  "light-armor",
  inventoryIndex
);

await client.bots.unequip(
  "worker-1",
  "light-armor",
  inventoryIndex
);
```

### Crafting

```ts
await client.bots.craftable(
  "worker-1",
  "iron-gear-wheel"
);

await client.bots.craft(
  "worker-1",
  "iron-gear-wheel",
  10
);
```

### Build

```ts
await client.bots.place(
  "worker-1",
  "assembling-machine-1",
  { x: 5, y: 5 }
);

await client.bots.buildGhost({
  id: "worker-1",
  name: "electric-mining-drill",
  position: { x: 20, y: 10 },
  direction: 0
});
```

### Combat & repair

```ts
await client.bots.selectGun(
  "worker-1",
  1
);

await client.bots.attack(
  "worker-1",
  enemyUnitNumber,
  120
);

await client.bots.repair(
  "worker-1",
  damagedEntityUnitNumber,
  120
);
```

### Vehicle

```ts
await client.bots.enterVehicle(
  "worker-1",
  vehicleUnitNumber
);

await client.bots.drive(
  "worker-1",
  accelerationEnum,
  directionEnum,
  60
);

await client.bots.leaveVehicle(
  "worker-1"
);
```

Riding enum tersedia melalui `client.capabilities().data.enums`.

## Chat

```ts
await client.chat.send(
  "Aku datang.",
  {
    sender: "Sena",
    force: "player"
  }
);
```

Chat stream:

```ts
const cap = await client.capabilities();
const abort = new AbortController();

for await (
  const chat of client.chat.follow(
    cap.cursor,
    250,
    abort.signal
  )
) {
  console.log(chat);
}
```

## Shared bot network

```ts
await client.shared.write({
  network: "main",
  key: "base:status",
  value: JSON.stringify({
    iron: 1000
  })
});
```

Shared state cocok untuk koordinasi multi-bot sederhana. Planner/HiveMind tetap sebaiknya berada di application layer.

## Watches & delta events

```ts
const event = await client.events.delta(
  cursor,
  256
);
```

`watch()` mendaftarkan sampled sensor pada scope tertentu; gunakan untuk data kontinu yang tidak punya native Factorio event.

## Error

Bridge errors dilempar sebagai `FactorioError`.

Contoh code yang umum:
- `INVALID_ARGUMENT`
- `NOT_FOUND`
- `UNREACHABLE_TARGET`
- `COLLISION`
- `RATE_LIMIT`
- `ACTIONS_DISABLED`
- `CURSOR_EXPIRED`
- `RCON_TIMEOUT`
- `RCON_CLOSED`

Selalu tangani mutation timeout secara konservatif: action mungkin sudah diterapkan server walaupun client tidak menerima response. Baca ulang state sebelum retry.
