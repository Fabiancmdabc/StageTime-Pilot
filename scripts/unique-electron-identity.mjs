/**
 * Im Dev-Modus teilen alle Apps dieselbe Electron.app-Identity
 * (CFBundleIdentifier com.github.Electron). macOS aktiviert dann oft
 * nur eine Instanz und „schließt“ die andere.
 *
 * Vor dem Start: Bundle-ID + Name pro Projekt setzen.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))

const productName = pkg.productName || pkg.name || 'ElectronApp'
const appId = pkg.build?.appId || `com.local.${pkg.name || 'electron-app'}`
const bundleId = `${appId}.dev`

const plistPath = path.join(
  root,
  'node_modules',
  'electron',
  'dist',
  'Electron.app',
  'Contents',
  'Info.plist',
)

if (!fs.existsSync(plistPath)) {
  console.warn('[unique-electron] Info.plist nicht gefunden – übersprungen')
  process.exit(0)
}

function setPlist(key, value) {
  execFileSync('plutil', ['-replace', key, '-string', value, plistPath], {
    stdio: 'inherit',
  })
}

try {
  setPlist('CFBundleIdentifier', bundleId)
  setPlist('CFBundleName', productName)
  setPlist('CFBundleDisplayName', productName)
  console.log(`[unique-electron] ${productName} → ${bundleId}`)
} catch (err) {
  console.warn('[unique-electron] Patch fehlgeschlagen:', err?.message || err)
  process.exit(0)
}
