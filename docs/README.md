# FactoBot Documentation

FactoBot adalah SDK TypeScript untuk mengontrol virtual character di Factorio 2.x melalui **Factorio Bot World Bridge**. Desain high-level-nya terinspirasi Mineflayer, tetapi setiap aksi tetap mengikuti aturan Factorio: collision, reach distance, inventory nyata, ammo, crafting, vehicle, dan state world.

## Mulai dari sini

- [Getting Started](getting-started.md) — instalasi, koneksi, dan bot pertama.
- [FactoBot API](factobot-api.md) — API high-level ala Mineflayer.
- [Events & Plugins](events-plugins.md) — event-driven bot dan plugin system.
- [Low-level Client](low-level-api.md) — world sensors, bots, events, dan raw SDK.
- [Space Age](space-age.md) — planet, platform, asteroid, quality, dan runtime content catalog.
- [Architecture](architecture.md) — hubungan SDK, mod, Factorio, event log, dan virtual character.
- [Troubleshooting](troubleshooting.md) — error umum dan langkah diagnosis.
- [Mineflayer Parity](mineflayer-parity.md) — pemetaan konsep Mineflayer ke FactoBot.

Dokumentasi protocol yang menjadi authority untuk world bridge ada di repo **factorio-bot-mod**: `docs/protocol.md`.

## Level API

FactoBot punya tiga level API:

```text
FactoBot facade
   ↓
VirtualBot high-level API
   ↓
FactorioBotClient low-level typed API
   ↓
Factorio Bot World Bridge mod
   ↓
Factorio runtime
```

Gunakan **FactoBot facade** untuk bot/gameplay normal. Gunakan **FactorioBotClient** saat membutuhkan akses penuh ke listrik, logistics, production, trains, research, Space Age, pagination, event cursor, atau query khusus.

## Status v0.5.0

v0.5 menyediakan world sensing, chat, plugin/events, entity/player helpers, inventory, equipment, crafting, mining, building, container transfer, combat, repair, vehicle control, research/production/logistics/electric sensors, biter threat sensors, dan Space Age world/content APIs.

Pathfinding global A*/navmesh belum menjadi core v0.5. `goto()` memakai local steering yang mematuhi collision dan mencoba recovery arah bila terhalang.
