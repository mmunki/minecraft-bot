'use strict'

// Turn a minecraft-protocol chat/NBT value into readable plain text.
function flattenChat (value) {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(flattenChat).join('')

  if (typeof value === 'object') {
    // minecraft-protocol wraps NBT values as { type, value }.
    if (value.type && Object.prototype.hasOwnProperty.call(value, 'value')) {
      return flattenChat(value.value)
    }

    const hasText = Object.prototype.hasOwnProperty.call(value, 'text')
    const hasExtra = Object.prototype.hasOwnProperty.call(value, 'extra')
    if (hasText || hasExtra) {
      return flattenChat(value.text) + flattenChat(value.extra)
    }

    // Chat components sometimes use an empty key for a plain text part.
    return Object.values(value).map(flattenChat).join('')
  }

  return String(value)
}

function reasonToString (reason) {
  if (reason == null) return String(reason)
  if (typeof reason === 'string') return reason

  try {
    const text = flattenChat(reason).trim()
    if (text) return text
  } catch {}

  try {
    return JSON.stringify(reason)
  } catch {
    return String(reason)
  }
}

module.exports = { reasonToString }
