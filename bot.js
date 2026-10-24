'use strict'

// A deliberately idle Mineflayer bot.
//
// It joins the configured server, disables physics as soon as it spawns, and
// never installs a pathfinder, never sends movement input, and never chats.
// If the connection drops it reconnects with a bounded backoff.

const mineflayer = require('mineflayer')

const config = {
  host: process.env.MC_HOST || 'mikailamin.aternos.me',
  port: Number(process.env.MC_PORT || 30266),
  username: process.env.MC_USERNAME || 'plugin-01',
  auth: process.env.MC_AUTH || 'offline',
  version: process.env.MC_VERSION || '26.2',
  reconnectMs: Number(process.env.MC_RECONNECT_MS || 30000),
  freeze: String(process.env.MC_FREEZE || 'true').toLowerCase() !== 'false',
  chatLog: String(process.env.MC_CHAT_LOG || 'false').toLowerCase() === 'true'
}

let bot = null
let reconnectTimer = null
let stopping = false
let attempts = 0

function log (...args) {
  console.log(new Date().toISOString(), ...args)
}

function reasonToString (reason) {
  if (reason == null) return String(reason)
  if (typeof reason === 'string') return reason
  try {
    if (typeof reason.toString === 'function') {
      const text = reason.toString()
      if (text && text !== '[object Object]') return text
    }
  } catch {}
  try {
    return JSON.stringify(reason)
  } catch {
    return String(reason)
  }
}

function scheduleReconnect (why) {
  if (stopping) return
  attempts += 1
  const delay = Math.min(config.reconnectMs * Math.min(attempts, 4), 120000)
  log(`reconnecting in ${Math.round(delay / 1000)}s (${why})`)
  clearTimeout(reconnectTimer)
  reconnectTimer = setTimeout(connect, delay)
}

function connect () {
  if (stopping) return

  log(`connecting to ${config.host}:${config.port} as ${config.username} ` +
      `(version ${config.version}, auth ${config.auth})`)

  try {
    bot = mineflayer.createBot({
      host: config.host,
      port: config.port,
      username: config.username,
      auth: config.auth,
      version: config.version,
      hideErrors: false,
      respawn: true
    })
  } catch (err) {
    log('createBot failed:', err && err.stack ? err.stack : err)
    bot = null
    scheduleReconnect('createBot failed')
    return
  }

  bot.once('spawn', () => {
    attempts = 0
    const pos = bot.entity && bot.entity.position
    const position = pos
      ? `${pos.x.toFixed(2)} ${pos.y.toFixed(2)} ${pos.z.toFixed(2)}`
      : 'unknown'
    log(`spawned at ${position}; dimension=${bot.game && bot.game.dimension}`)

    if (config.freeze) {
      // Stop the physics simulation. The bot stays where it spawned and does
      // not send movement input. It will still answer keep-alives.
      bot.physicsEnabled = false
      log('physics disabled: the bot will stand still')
    }

    for (const control of ['forward', 'back', 'left', 'right', 'jump', 'sprint', 'sneak']) {
      try { bot.setControlState(control, false) } catch {}
    }
  })

  bot.on('kicked', (reason) => {
    const text = reasonToString(reason)
    log('kicked:', text)
    if (/Fabric Loader|Fabric API|registry entry namespaces/i.test(text)) {
      log('The server requires client-side Fabric mods; a vanilla Mineflayer bot cannot join it.')
      log('Remove the client-required mods on Aternos, or point the bot at a vanilla server.')
    }
  })

  bot.on('error', (err) => {
    log('error:', err && err.message ? err.message : err)
  })

  bot.on('end', (reason) => {
    log('disconnected:', reasonToString(reason))
    bot = null
    scheduleReconnect('disconnected')
  })

  if (config.chatLog) {
    bot.on('messagestr', (message) => log('chat:', message))
  }
}

function shutdown (signal) {
  stopping = true
  clearTimeout(reconnectTimer)
  log(`received ${signal}; shutting down`)
  if (bot) {
    try { bot.quit() } catch {}
  }
  setTimeout(() => process.exit(0), 1000).unref()
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

process.on('uncaughtException', (err) => {
  log('uncaughtException:', err && err.stack ? err.stack : err)
  if (bot) {
    try { bot.quit() } catch {}
  }
  bot = null
  scheduleReconnect('uncaughtException')
})

process.on('unhandledRejection', (err) => {
  log('unhandledRejection:', err && err.stack ? err.stack : err)
})

connect()
