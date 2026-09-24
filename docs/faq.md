# FAQ

## Why FactoBot?

FactoBot exposes authoritative Factorio state instead of forcing automation to
infer the world from screenshots or keyboard timing.

## Is this a real multiplayer client?

No. The bot is a server-side virtual Factorio character controlled by the
world bridge. The external SDK stays lightweight because it does not render a
second full Factorio client.

## Does it require a headless server?

Not necessarily. The intended direct setup is one GUI-hosted multiplayer
Factorio instance plus the external SDK over an available RCON configuration.

## Does the bot cheat?

The action API is designed to preserve Factorio rules. Placement consumes a real
item, mining uses character mining state, combat needs usable weapon/ammo,
inventory transfer respects reach and capacity, and movement respects collision.

## Is it exactly Mineflayer for Factorio?

It follows the same developer experience where Factorio has a meaningful
equivalent. Minecraft-only systems such as beds, villagers, enchanting,
fishing, elytra, signs/books, and Nether/End are not faked.

See [Mineflayer parity](mineflayer-parity.md).

## Does it support Space Age?

Yes when Space Age is active. The SDK can inspect planets, space locations,
connections, platforms, asteroid chunks, qualities, technologies, recipes,
items, tiles, and runtime prototypes.

## Can I connect an LLM?

Yes. AI is intentionally outside the Lua mod. A planner or LLM can consume
world/chat/research/inventory/production/threat data and call validated
FactoBot actions.

## Why can goto() fail?

v0.5 uses collision-respecting local steering, not a full global A* navigator.
Complex factory layouts may require a pathfinder plugin.

## Why are actions disabled?

Enable them in Factorio:

```text
/fbot-enable-actions
```

## Why does chat not catch slash commands?

The chat stream receives normal in-game chat. Factorio slash commands are a
different mechanism.

## Where do I report bugs?

Use the GitHub issue tracker for `pal3241/factorio-bot` or
`pal3241/factorio-bot-mod`. Include Factorio version, Space Age status,
SDK/mod version, error code, and a minimal reproduction.
