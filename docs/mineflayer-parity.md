# Mineflayer → FactoBot parity

FactoBot v0.5 mirrors Mineflayer concepts where Factorio has a meaningful equivalent. It does not fake Minecraft-only mechanics.

## Core parity

| Mineflayer concept | FactoBot | Notes |
| --- | --- | --- |
| `createBot()` | `createFactoBot()` | Creates or attaches a server-side virtual character |
| `bot.username` | `bot.username` | Virtual bot id |
| `bot.entity` | `bot.entity` | Cached own entity summary |
| `bot.entities` | `bot.entities` | Nearby entity cache; `refreshEntities()` for explicit refresh |
| `bot.players` | `bot.players` | Player cache |
| `bot.nearestEntity()` | `bot.nearestEntity()` | Predicate-based nearest entity |
| block/world lookup | `tileAt()`, `blockAt()`, world entity/resource APIs | Factorio uses tiles/entities/resources instead of Minecraft blocks |
| `bot.chat()` | `bot.chat()` | Force chat response through bridge |
| chat events | `bot.on("chat")` | Includes Factorio player/location context |
| plugin loading | `bot.loadPlugin()` | Async plugins supported |
| generic events | `bot.on(...)` | Node EventEmitter façade over ordered bridge events |
| health | `bot.health`, `bot.maxHealth` | Updated from own-entity damage events |
| inventory | `bot.inventory()` | Typed virtual-character inventories |
| `equip/unequip` | `bot.equip/unequip` | Uses Factorio inventory indices from capabilities |
| `toss` | `bot.toss` | Removes real item and spills it into the world |
| item pickup | `bot.pickup` | Character picking state |
| `dig` | `bot.dig` | Native character mining |
| `placeBlock/placeEntity` | `bot.place/placeBlock` | Consumes a real placement item, checks reach/collision |
| `craft` | `bot.craft` | Native hand crafting |
| containers/chests | `openContainer/openChest` | `FactoContainer.deposit/withdraw/inventories` |
| furnace interaction | `openFurnace`, `setRecipe` | Inventory transfer + machine recipe control |
| `attack` | `bot.attack` | Character shooting state with current weapon/ammo |
| repair/use tool | `bot.repair` | Native repair state |
| `mount/dismount` | `bot.mount/dismount` | Factorio vehicle driver state |
| `moveVehicle` | `bot.moveVehicle` | Runtime riding enums from capabilities |
| movement | `goto`, `gotoPlayer`, `follow` | Collision-respecting short-step steering |
| wait ticks | `waitForTicks` | Waits on real Factorio simulation ticks |
| feature detection | `supportFeature/supportsFeature` | Reports façade capabilities |
| stop/end | `quit/end` | Stops event stream and closes transport |

## Factorio-native features beyond Mineflayer

Low-level `bot.client` additionally exposes:

- electric networks, generation/storage and measured flows
- logistic networks and robot counts/content
- production/consumption statistics
- research tree/progress and recipes
- resource patches with bounds and observed amount
- trains
- pollution, biter threats and evolution context
- multi-surface/planet information
- Space Age platforms, routes, cargo, asteroid chunks and content catalog
- shared bot-network state
- ordered delta events and sampled watches

## No direct Factorio equivalent

These Mineflayer/Minecraft mechanics are intentionally not emulated: beds/sleep, enchantment tables, villagers/trading, fishing rods, elytra, signs/books, resource packs, Minecraft scoreboards, hunger/food, dimensions as Nether/End, and Minecraft packet-specific controls.

## Pathfinding note

Mineflayer's commonly used A* pathfinder is a separate plugin rather than Mineflayer core. FactoBot v0.5 currently provides collision-respecting local steering with obstacle-direction recovery. A terrain/entity-grid A* plugin can be layered onto the existing plugin API without changing the world bridge.
