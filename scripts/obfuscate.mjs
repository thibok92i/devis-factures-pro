/**
 * Post-build obfuscation script
 *
 * Obfuscates the compiled main process and preload JavaScript files
 * to protect business logic, license system, and encryption code.
 *
 * The renderer (React app) is already bundled by Vite with minification,
 * which provides reasonable protection. The main process code is the
 * critical target as it contains:
 * - License validation logic
 * - Database encryption keys/algorithms
 * - IPC handler implementations
 *
 * Usage: node scripts/obfuscate.mjs
 * Called automatically by the "postbuild" npm script.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join, extname } from 'path'

// Check if javascript-obfuscator is available
let JavaScriptObfuscator
try {
  const mod = await import('javascript-obfuscator')
  JavaScriptObfuscator = mod.default || mod
} catch {
  console.log('[Obfuscate] javascript-obfuscator not installed. Skipping obfuscation.')
  console.log('[Obfuscate] Run: npm install --save-dev javascript-obfuscator')
  process.exit(0)
}

const OUT_DIR = join(process.cwd(), 'out')

// Obfuscation config — balanced between security and performance
const OBFUSCATION_OPTIONS = {
  // Control flow
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.5,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.2,

  // String transformations
  stringArray: true,
  stringArrayEncoding: ['base64'],
  stringArrayThreshold: 0.5,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 2,
  stringArrayWrappersType: 'function',

  // Identifier renaming
  identifierNamesGenerator: 'hexadecimal',
  renameGlobals: false, // Don't rename globals — can break Node.js modules

  // Other
  selfDefending: false, // Don't use — can break in Electron
  splitStrings: true,
  splitStringsChunkLength: 10,
  transformObjectKeys: true,
  unicodeEscapeSequence: false,

  // Source map
  sourceMap: false,

  // Target
  target: 'node'
}

/**
 * Recursively find all .js files in a directory
 */
function findJsFiles(dir) {
  const files = []
  try {
    const entries = readdirSync(dir)
    for (const entry of entries) {
      const fullPath = join(dir, entry)
      const stat = statSync(fullPath)
      if (stat.isDirectory()) {
        files.push(...findJsFiles(fullPath))
      } else if (extname(entry) === '.js') {
        files.push(fullPath)
      }
    }
  } catch {
    // Directory doesn't exist
  }
  return files
}

/**
 * Obfuscate a single file
 */
function obfuscateFile(filePath) {
  try {
    const code = readFileSync(filePath, 'utf-8')

    // Skip tiny files (likely just exports/re-exports)
    if (code.length < 100) {
      console.log(`  [skip] ${filePath} (too small)`)
      return
    }

    const result = JavaScriptObfuscator.obfuscate(code, OBFUSCATION_OPTIONS)
    writeFileSync(filePath, result.getObfuscatedCode())
    console.log(`  [done] ${filePath}`)
  } catch (err) {
    console.error(`  [error] ${filePath}: ${err.message}`)
  }
}

// Main
console.log('[Obfuscate] Starting code obfuscation...')
console.log(`[Obfuscate] Output directory: ${OUT_DIR}`)

// Obfuscate main process files
const mainFiles = findJsFiles(join(OUT_DIR, 'main'))
console.log(`\n[Obfuscate] Main process (${mainFiles.length} files):`)
for (const file of mainFiles) {
  obfuscateFile(file)
}

// Obfuscate preload files
const preloadFiles = findJsFiles(join(OUT_DIR, 'preload'))
console.log(`\n[Obfuscate] Preload (${preloadFiles.length} files):`)
for (const file of preloadFiles) {
  obfuscateFile(file)
}

console.log('\n[Obfuscate] Done!')
