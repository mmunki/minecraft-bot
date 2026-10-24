# minecraft-bot

An intentionally idle [Mineflayer](https://github.com/PrismarineJS/mineflayer) bot.

It joins the configured Minecraft Java server as **`plugin-01`**, disables its
physics as soon as it spawns, and then stands still. It does not use a
pathfinder, does not send movement input, does not chat, and does not run
commands. Keep-alive packets are answered by Mineflayer, so the connection
stays open.

## Target server

| Setting | Value |
| --- | --- |
| Host | `mikailamin.aternos.me` |
| Port | **`30266`** |
| Username | `plugin-01` |
| Minecraft version | `26.2` |
| Auth | `offline` |

`mikailamin.aternos.me:25565` is an Aternos status/redirect endpoint. The status
ping tells clients to connect to port **`30266`**, which is the real server
port. Use `30266`.

## Important: the Aternos server requires client-side Fabric mods

The Aternos server is a Fabric 26.2 server with client-required mods (the kick
message mentions **Fabric Loader**, **Fabric API**, **Create**, and
**Copycats**). Mineflayer is a vanilla-protocol client. It can connect and log
in, but the server then disconnects it with:

```text
This server requires Fabric Loader and Fabric API installed on your client!
The following registry entry namespaces may be related:

copycats
create

Contact the server's administrator for more information!
```

A vanilla bot cannot pass that check. To make this bot join, do one of these:

1. **Use a vanilla server** (or remove/disable the client-required mods on the
   Aternos server) and then start the bot.
2. Run a **real Minecraft client with Fabric and the required mods** on a
   machine that stays online. Mineflayer cannot load Fabric mods.

The bot itself is tested against a local Fabric 26.2 server with no mods (see
[Test locally](#test-locally)). On that server it spawns and stands still as
expected.

## Quick start

Requirements: Node.js **22 or newer**.

```bash
npm install
npm start
```

`npm install` runs `scripts/patch-deps.js` automatically. That script adds the
Minecraft 26.2 data files and the small version mappings that Mineflayer
4.39.0 does not ship yet. The dependency versions are pinned in
`package.json`; do not upgrade them without re-checking the patch script.

Stop the bot with `Ctrl+C`.

## Configuration

All settings are environment variables:

| Variable | Default | Meaning |
| --- | --- | --- |
| `MC_HOST` | `mikailamin.aternos.me` | Server hostname |
| `MC_PORT` | `30266` | Server port |
| `MC_USERNAME` | `plugin-01` | Bot player name |
| `MC_AUTH` | `offline` | `offline` for cracked/offline servers |
| `MC_VERSION` | `26.2` | Protocol version |
| `MC_FREEZE` | `true` | Disable physics after spawn |
| `MC_RECONNECT_MS` | `30000` | Base reconnect delay |
| `MC_CHAT_LOG` | `false` | Log all chat messages |

Example for a different server:

```bash
MC_HOST=play.example.com MC_PORT=25565 MC_USERNAME=plugin-01 npm start
```

If the server is in **online mode**, the bot cannot join with `plugin-01`
unless that name belongs to a Microsoft account. This project deliberately uses
offline auth and does not store Microsoft credentials. Use an offline-mode
server or provide your own Microsoft-auth integration.

## Test locally

A local Fabric 26.2 server is included in `test-server/docker-compose.yml`:

```bash
cd test-server
docker compose up -d
```

Wait until the server logs `Done (`. Then, from the project root:

```bash
MC_HOST=127.0.0.1 MC_PORT=25565 npm run test:connect
```

Expected output includes:

```text
OK: spawned at 7.50 -60.00 -0.50; version=26.2
```

Stop the test server with:

```bash
cd test-server && docker compose down
```

## Docker

```bash
docker compose up -d --build
docker compose logs -f
```

The container restarts automatically and receives `SIGTERM` cleanly.

## GitHub Actions

`.github/workflows/bot.yml` starts the bot manually for up to 330 minutes:

1. Open **Actions** → **minecraft-bot** → **Run workflow**.
2. Set the duration and, if needed, the host/port/username.
3. The bot log is uploaded as the `bot-log` artifact.

GitHub Actions is not a 24/7 host. The job stops after the duration, and the
bot reconnects only while the job is alive. For an always-on bot, run the
Docker container on a VPS, Raspberry Pi, or home server. The same applies to
Aternos: if the Aternos server is offline or sleeping, the bot keeps retrying
but cannot make the server start.

## How "stand still" is implemented

On the `spawn` event the bot sets `bot.physicsEnabled = false` and clears all
movement controls. No pathfinder plugin is loaded. Mineflayer still handles
keep-alives and the connection. If the bot dies, Mineflayer's default respawn
behavior is enabled; it will stand still at the new spawn point.

## 26.2 support note

Mineflayer 4.39.0 can speak 26.2 once it has the data, but the data package
currently stops at 26.1. The post-install patch:

- copies the vendored 26.2 data into `node_modules/minecraft-data`;
- registers 26.2 in `minecraft-data`'s runtime map;
- adds 26.2 to the tested/supported version lists;
- maps 26.2 chunks to the 1.18-family implementation;
- adds 26.2 to the physics liquid-gravity/climb features.

This is a temporary compatibility shim until upstream Mineflayer and
minecraft-data publish 26.2 support.

## Troubleshooting

### The bot repeatedly gets kicked with the Fabric message

The server has client-required mods. See the warning above. Remove the mods or
use a vanilla server.

### `unsupported protocol version: 26.2`

`npm install` did not run the patch script. Run it manually:

```bash
npm run postinstall
```

### `No chunk implementation for pc 26.2 found`

The same patch script was not applied. Run:

```bash
npm install
```

### Aternos says the server is offline

Start the server in the Aternos panel. The bot retries every 30 seconds and
will connect when the server is online.

## License

MIT
