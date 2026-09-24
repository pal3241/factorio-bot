FactoBot
========

**FactoBot** is a TypeScript SDK for building Factorio 2.x bots with a
high-level, event-driven API inspired by Mineflayer.

It provides virtual characters that can inspect the world, move, mine, craft,
build, use inventories and containers, fight enemies, drive vehicles, react
to chat, and access Factorio-native systems such as electricity, logistics,
production, research, trains, pollution, resources, and Space Age.

Installation
------------

Build the SDK from source:

.. code-block:: bash

   npm ci
   npm run build

A Factorio world must have ``factorio-bot-mod`` v0.5.x enabled and RCON
available. For mutation APIs, enable bot actions in-game:

.. code-block:: text

   /fbot-enable-actions

Quick example
-------------

.. code-block:: typescript

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
     attach: true
   });

   bot.on("chat", (username, message) => {
     if (message.trim().toLowerCase() === "sena sini") {
       void bot.gotoPlayer(username);
     }
   });

Sections
--------

.. toctree::
   :maxdepth: 3
   :caption: Getting Started

   getting-started

.. toctree::
   :maxdepth: 3
   :caption: API References

   api-reference
   factobot-api
   low-level-api
   space-age

.. toctree::
   :maxdepth: 3
   :caption: Usage Guides

   events-plugins
   examples

.. toctree::
   :maxdepth: 3
   :caption: Advanced Usage

   architecture
   mineflayer-parity

.. toctree::
   :maxdepth: 2
   :caption: Help

   faq
   troubleshooting
