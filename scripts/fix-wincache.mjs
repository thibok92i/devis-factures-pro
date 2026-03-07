import { readdirSync, mkdirSync, existsSync, writeFileSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

const cacheDir = join(homedir(), 'AppData', 'Local', 'electron-builder', 'Cache', 'winCodeSign')

if (!existsSync(cacheDir)) {
  console.log('No winCodeSign cache found, creating dummy structure...')
  mkdirSync(cacheDir, { recursive: true })
}

const dirs = readdirSync(cacheDir).filter(f => !f.endsWith('.7z'))

for (const d of dirs) {
  const libDir = join(cacheDir, d, 'darwin', '10.12', 'lib')
  mkdirSync(libDir, { recursive: true })
  for (const file of ['libcrypto.dylib', 'libssl.dylib']) {
    const fp = join(libDir, file)
    if (!existsSync(fp)) {
      writeFileSync(fp, '')
      console.log(`  Created: ${fp}`)
    }
  }
  console.log(`✓ Patched ${d}`)
}

console.log('Done!')
