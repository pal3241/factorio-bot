# API References

FactoBot exposes three API layers.

## FactoBot

Recommended for normal bot development.

```ts
import { createFactoBot } from "factorio-bot";
```

Use this layer for events, plugins, movement, chat, mining, building, combat,
containers, crafting, vehicles, and player interaction.

See [FactoBot API](factobot-api.md).

## VirtualBot

VirtualBot is the gameplay-focused controller behind FactoBot.

```ts
const worker = client.attachBot("worker-1", "main");
```

Important methods include:

- `state()`
- `position()`
- `findNearestResource()`
- `nearestEntity()`
- `goto()`
- `gotoPlayer()`
- `followPlayer()`
- `mine()`
- `mineNearest()`
- `inventory()`
- `transferTo()` / `transferFrom()`
- `equip()` / `unequip()`
- `attack()` / `repair()`
- `enterVehicle()` / `drive()`
- `buildGhost()`

## FactorioBotClient

Low-level typed bridge client.

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

Use it for authoritative world queries and Factorio-native systems:

```text
client.world
client.bots
client.chat
client.events
client.shared
client.spaceAge
```

See [Low-level API](low-level-api.md).

## Errors

Bridge and transport failures are surfaced as `FactorioError`.

Common codes:

```text
INVALID_ARGUMENT
NOT_FOUND
UNREACHABLE_TARGET
COLLISION
ACTIONS_DISABLED
RATE_LIMIT
CURSOR_EXPIRED
RCON_TIMEOUT
RCON_CLOSED
RCON_AUTH_FAILED
RCON_PROTOCOL_ERROR
```
