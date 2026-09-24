# Usage Examples

## Chat-controlled helper

```ts
bot.on("chat", (username, message) => {
  const text = message.trim().toLowerCase();

  if (text === "sena sini") {
    void bot.gotoPlayer(username, { tolerance: 1.5 });
  }

  if (text === "sena stop") {
    void bot.controller.stop();
  }
});
```

## Find and mine iron

```ts
const patch = await bot.controller.findNearestResource(
  "iron-ore",
  { maxDistance: 192 }
);

await bot.goto(patch.position, { tolerance: 2.5 });

await bot.collect("iron-ore", {
  maxDistance: 32,
  ticks: 180
});
```

## Auto-defense

```ts
const enemy = await bot.nearestEntity(
  entity => entity.force === "enemy" && entity.type === "unit",
  24
);

if (enemy) {
  await bot.attack(enemy, { ticks: 120 });
}
```

## Chest logistics

```ts
const chest = await bot.nearestEntity(
  entity => entity.type === "container",
  32
);

if (chest) {
  const container = await bot.openChest(chest);
  await container.deposit("iron-plate", 100);
  await container.withdraw("coal", 20);
}
```

## Follow a player

```ts
const abort = new AbortController();

void bot.follow("Fahri", abort.signal, {
  distance: 4,
  intervalMs: 750
});

// later
abort.abort();
```

## Repository examples

The repository also contains:

```text
examples/read-world.ts
examples/read-space-age.ts
examples/high-level-bot.ts
examples/chat-command.ts
examples/factobot-style.ts
```
