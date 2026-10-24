'use strict'

// Mineflayer 4.39.0 / minecraft-data 3.117.0 know about the 26.2 protocol
// number but do not ship the 26.2 data files or the small version mappings
// needed by the chunk and physics libraries.  This script adds them after
// `npm install`.
//
// The versions in package.json are pinned so these small, targeted edits stay
// valid.  If a dependency is upgraded, re-check this script.

const fs = require('fs')
const path = require('path')

function packageDir (name) {
  return path.dirname(require.resolve(`${name}/package.json`))
}

function read (file) {
  return fs.readFileSync(file, 'utf8')
}

function write (file, text) {
  fs.writeFileSync(file, text)
}

function requireFile (file, description) {
  if (!fs.existsSync(file)) {
    throw new Error(`patch-deps: cannot find ${description} at ${file}`)
  }
}

function patchMinecraftData () {
  const root = packageDir('minecraft-data')
  const dataRoot = path.join(root, 'minecraft-data')
  const target = path.join(dataRoot, 'data', 'pc', '26.2')
  const vendor = path.join(__dirname, '..', 'vendor', 'minecraft-data-26.2')

  if (!fs.existsSync(vendor)) {
    throw new Error(`patch-deps: missing vendored data at ${vendor}`)
  }

  fs.cpSync(vendor, target, { recursive: true, force: true })
  console.log('patched: minecraft-data 26.2 data files')

  // data.js is the runtime map from version -> JSON files.
  const dataJsPath = path.join(root, 'data.js')
  requireFile(dataJsPath, 'minecraft-data/data.js')
  let dataJs = read(dataJsPath)

  if (!dataJs.includes("'26.2': {")) {
    const fields = {
      attributes: '26.2',
      blockCollisionShapes: '26.2',
      blocks: '26.2',
      blockLoot: '26.2',
      biomes: '26.2',
      commands: '26.2',
      effects: '26.1',
      enchantments: '26.1',
      entities: '26.2',
      entityLoot: '26.2',
      foods: '26.2',
      instruments: '26.1',
      items: '26.2',
      language: '26.2',
      loginPacket: '26.2',
      mapIcons: '1.20.2',
      materials: '26.2',
      particles: '26.2',
      protocol: '26.2',
      recipes: '26.2',
      sounds: '26.2',
      tints: '26.2',
      version: '26.2',
      windows: '1.16.1'
    }

    const lines = Object.entries(fields)
      .map(([name, version]) => `      get ${name} () { return require("./minecraft-data/data/pc/${version}/${name}.json") }`)
      .join(',\n')

    const entry = [
      '    },',
      "    '26.2': {",
      lines + ',',
      "      proto: __dirname + '/minecraft-data/data/pc/latest/proto.yml'",
      '    }'
    ].join('\n')

    const marker = "\n    }\n  },\n  'bedrock': {"
    if (!dataJs.includes(marker)) {
      throw new Error('patch-deps: could not find the end of the PC data map in data.js')
    }
    dataJs = dataJs.replace(marker, `\n${entry}\n  },\n  'bedrock': {`)
    write(dataJsPath, dataJs)
    console.log('patched: minecraft-data/data.js 26.2 entry')
  }

  // Supported-version lists (used by tooling and some libraries).
  const versionsPath = path.join(dataRoot, 'data', 'pc', 'common', 'versions.json')
  requireFile(versionsPath, 'minecraft-data versions.json')
  const versions = JSON.parse(read(versionsPath))
  if (!versions.includes('26.2')) {
    versions.push('26.2')
    write(versionsPath, JSON.stringify(versions, null, 2) + '\n')
    console.log('patched: minecraft-data versions.json')
  }

  // Protocol versions are already present in 3.117.0; keep a fallback in case
  // a dependency resolution ever produces an older data package.
  const protocolPath = path.join(dataRoot, 'data', 'pc', 'common', 'protocolVersions.json')
  requireFile(protocolPath, 'minecraft-data protocolVersions.json')
  const protocolVersions = JSON.parse(read(protocolPath))
  if (!protocolVersions.some((entry) => entry.minecraftVersion === '26.2')) {
    protocolVersions.unshift({
      minecraftVersion: '26.2',
      version: 776,
      dataVersion: 4903,
      usesNetty: true,
      majorVersion: '26.2',
      releaseType: 'release'
    })
    write(protocolPath, JSON.stringify(protocolVersions, null, 2) + '\n')
    console.log('patched: minecraft-data protocolVersions.json')
  }

  // dataPaths.json is not used at runtime, but keeping it complete makes the
  // package consistent for tools that read it.
  const dataPathsPath = path.join(dataRoot, 'data', 'dataPaths.json')
  requireFile(dataPathsPath, 'minecraft-data dataPaths.json')
  const dataPaths = JSON.parse(read(dataPathsPath))
  if (!dataPaths.pc['26.2']) {
    dataPaths.pc['26.2'] = {
      attributes: 'pc/26.2',
      blockCollisionShapes: 'pc/26.2',
      blocks: 'pc/26.2',
      blockLoot: 'pc/26.2',
      biomes: 'pc/26.2',
      commands: 'pc/26.2',
      effects: 'pc/26.1',
      enchantments: 'pc/26.1',
      entities: 'pc/26.2',
      entityLoot: 'pc/26.2',
      foods: 'pc/26.2',
      instruments: 'pc/26.1',
      items: 'pc/26.2',
      language: 'pc/26.2',
      loginPacket: 'pc/26.2',
      mapIcons: 'pc/1.20.2',
      materials: 'pc/26.2',
      particles: 'pc/26.2',
      protocol: 'pc/26.2',
      recipes: 'pc/26.2',
      sounds: 'pc/26.2',
      tints: 'pc/26.2',
      version: 'pc/26.2',
      windows: 'pc/1.16.1',
      proto: 'pc/latest'
    }
    write(dataPathsPath, JSON.stringify(dataPaths, null, 2) + '\n')
    console.log('patched: minecraft-data dataPaths.json')
  }
}

function patchMineflayer () {
  const file = path.join(packageDir('mineflayer'), 'lib', 'version.js')
  requireFile(file, 'mineflayer lib/version.js')
  let text = read(file)
  if (!text.includes("'26.2'")) {
    if (!text.includes("'26.1']")) {
      throw new Error('patch-deps: could not find the 26.1 entry in mineflayer/lib/version.js')
    }
    text = text.replace("'26.1']", "'26.1', '26.2']")
    write(file, text)
    console.log('patched: mineflayer testedVersions (26.2)')
  }
}

function patchMinecraftProtocol () {
  const dir = packageDir('minecraft-protocol')
  const file = path.join(dir, 'src', 'version.js')
  if (!fs.existsSync(file)) return
  let text = read(file)
  if (!text.includes("'26.2'")) {
    if (!text.includes("'26.1']")) {
      throw new Error('patch-deps: could not find the 26.1 entry in minecraft-protocol/src/version.js')
    }
    text = text.replace("'26.1']", "'26.1', '26.2']")
    write(file, text)
    console.log('patched: minecraft-protocol supportedVersions (26.2)')
  }
}

function patchPrismarineChunk () {
  const file = path.join(packageDir('prismarine-chunk'), 'src', 'index.js')
  requireFile(file, 'prismarine-chunk src/index.js')
  let text = read(file)
  if (!text.includes('26.2:')) {
    const oldLine = "    26.1: require('./pc/1.18/chunk')\n"
    if (!text.includes(oldLine)) {
      throw new Error('patch-deps: could not find the 26.1 chunk mapping in prismarine-chunk')
    }
    text = text.replace(
      oldLine,
      "    26.1: require('./pc/1.18/chunk'),\n    26.2: require('./pc/1.18/chunk')\n"
    )
    write(file, text)
    console.log('patched: prismarine-chunk 26.2 mapping')
  }
}

function patchPrismarinePhysics () {
  const file = path.join(packageDir('prismarine-physics'), 'lib', 'features.json')
  requireFile(file, 'prismarine-physics lib/features.json')
  const features = JSON.parse(read(file))
  let changed = false
  for (const name of ['proportionalLiquidGravity', 'climbUsingJump']) {
    const feature = features.find((entry) => entry.name === name)
    if (!feature) {
      throw new Error(`patch-deps: missing physics feature ${name}`)
    }
    if (!feature.versions.includes('26.2')) {
      feature.versions.push('26.2')
      changed = true
    }
  }
  if (changed) {
    write(file, JSON.stringify(features, null, 2) + '\n')
    console.log('patched: prismarine-physics 26.2 liquid/climb features')
  }
}

function verify () {
  const mcData = require('minecraft-data')('26.2')
  if (!mcData || !mcData.version || mcData.version.version !== 776) {
    throw new Error('patch-deps: minecraft-data did not load 26.2 (protocol 776)')
  }
  console.log('verified: minecraft-data 26.2 (protocol 776)')
}

patchMinecraftData()
patchMineflayer()
patchMinecraftProtocol()
patchPrismarineChunk()
patchPrismarinePhysics()
verify()
