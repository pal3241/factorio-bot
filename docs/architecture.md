# Architecture

## Overview

```text
Application / AI / scripts
          │
          ▼
      FactoBot
  EventEmitter + plugins
          │
          ▼
      VirtualBot
 high-level gameplay API
          │
          ▼
  FactorioBotClient
 typed request/event layer
          │
          ▼
        RCON
          │
          ▼
Factorio Bot World Bridge
          │
          ▼
 Factorio runtime + save
```

## Kenapa bot bukan client multiplayer palsu?

v0.5 menggunakan **server-side virtual character** yang dibuat mod. Ini menghindari implementasi ulang protocol/simulation client Factorio tetapi tetap memberikan entity character nyata di world dengan:
- collision
- health
- inventory
- crafting
- mining
- weapon/ammo
- vehicle
- interaction range

Bot AI/SDK berjalan sebagai process Node.js terpisah dan tidak merender game.

## World bridge

Mod dibagi menjadi:
- `world/` — entities, resources, map, force, networks, threats, players.
- `bot/` — registry dan character action primitives.
- `bridge/` — validation, API dispatch, chat, events, persistent bridge state.
- `space_age/` — Space Age runtime queries/catalog.

## Query vs mutation

Query:
- tidak mengubah world.
- dapat berjalan saat actions disabled.
- sebaiknya bounded dan paginated.

Mutation:
- membutuhkan `fbot-enable-actions`.
- dapat mengubah bot/world.
- tidak aman untuk retry buta jika transport timeout.

## Event model

Bridge punya ordered ring event log:
- sequence
- tick
- kind
- data

SDK mem-poll delta dari cursor. FactoBot mengubah sebagian event menjadi EventEmitter events dan memperbarui cache local.

Untuk data yang berubah tanpa event native, bridge punya sampled `watch`.

## State ownership

Source of truth tetap Factorio.

SDK cache:
- `bot.entity`
- `bot.health`
- `bot.players`
- `bot.entities`

Cache boleh stale. Untuk keputusan penting, refresh/query world lagi.

## Bot network

Setiap virtual bot punya:
- id
- network
- entity
- created tick
- current bounded action

Shared network state menyediakan key/value coordination, tetapi bukan replacement database besar atau autonomous planner.

## Security

RCON setara admin-level control terhadap server. Praktik yang dianjurkan:
- bind loopback bila SDK satu mesin.
- jangan expose ke public internet.
- password kuat.
- gunakan VPN/tunnel privat bila remote.
- jangan commit secret.
- matikan actions bila hanya membutuhkan sensor.

## Extensibility

Plugin layer berada di SDK, bukan mod. Ini memungkinkan:
- pathfinder plugin
- combat plugin
- logistics plugin
- blueprint builder
- planner/LLM
- multi-agent HiveMind
- dashboards

Mod tetap kecil, deterministic, dan focused pada authoritative game state + valid action primitives.
