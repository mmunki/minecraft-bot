'use strict'

// One-shot connection test. Exits 0 after the bot spawns, non-zero otherwise.
// Defaults to a local test server; override with MC_* environment variables.

const mineflayer = require('mineflayer')
const { reasonToString } = require('../lib/chat')

const host = process.env.MC_HOST || '127.0.0.1'
const port = Number(process.env.MC_PORT || 25565)
const username = process.env.MC_USERNAME || 'plugin-01'
const auth = process.env.MC_AUTH || 'offline'
const version = process.env.MC_VERSION || '26.2'

console.log(`testing ${host}:${port} as ${username} (version ${version})`)

const bot = mineflayer.createBot({
  host,
  port,
  username,
  auth,
  version,
  hideErrors: false,
  respawn: true
})

let finished = false

function finish (code, message) {
  if (finished) return
  finished = true
  if (message) console.log(message)
  try { bot.quit() } catch {}
  setTimeout(() => process.exit(code), 500)
}

const timeout = setTimeout(() => {
  finish(3, 'TIMEOUT: no spawn within 30 seconds')
}, 30000)

bot.once('spawn', () => {
  clearTimeout(timeout)
  const pos = bot.entity && bot.entity.position
  const position = pos
    ? `${pos.x.toFixed(2)} ${pos.y.toFixed(2)} ${pos.z.toFixed(2)}`
    : 'unknown'
  finish(0, `OK: spawned at ${position}; version=${bot.version}`)
})

bot.on('kicked', (reason) => {
  clearTimeout(timeout)
  finish(1, `KICKED: ${reasonToString(reason)}`)
})

bot.on('error', (err) => {
  clearTimeout(timeout)
  finish(1, `ERROR: ${err && err.message ? err.message : err}`)
})

bot.on('end', (reason) => {
  clearTimeout(timeout)
  finish(2, `END: ${reason}`)
})
