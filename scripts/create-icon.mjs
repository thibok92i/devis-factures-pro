/**
 * Generate DevisPro app icon (256x256) as PNG and ICO.
 * Pure Node.js — no external dependencies.
 *
 * Design: Blue rounded square + white document with fold + text lines + total bar
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { deflateSync } from 'zlib'

const SIZE = 256
const pixels = Buffer.alloc(SIZE * SIZE * 4, 0)

// ---- Drawing helpers ----

function setPixel(x, y, r, g, b, a) {
  x = Math.round(x)
  y = Math.round(y)
  if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return
  const i = (y * SIZE + x) * 4
  const srcA = a / 255
  const dstA = pixels[i + 3] / 255
  const outA = srcA + dstA * (1 - srcA)
  if (outA > 0) {
    pixels[i] = Math.round((r * srcA + pixels[i] * dstA * (1 - srcA)) / outA)
    pixels[i + 1] = Math.round((g * srcA + pixels[i + 1] * dstA * (1 - srcA)) / outA)
    pixels[i + 2] = Math.round((b * srcA + pixels[i + 2] * dstA * (1 - srcA)) / outA)
    pixels[i + 3] = Math.round(outA * 255)
  }
}

function fillRect(x1, y1, x2, y2, r, g, b, a) {
  for (let y = Math.floor(y1); y <= Math.ceil(y2); y++)
    for (let x = Math.floor(x1); x <= Math.ceil(x2); x++)
      setPixel(x, y, r, g, b, a)
}

function fillRoundedRect(x1, y1, x2, y2, rad, r, g, b, a) {
  for (let y = Math.floor(y1); y <= Math.ceil(y2); y++) {
    for (let x = Math.floor(x1); x <= Math.ceil(x2); x++) {
      let draw = true
      const corners = [
        [x1 + rad, y1 + rad, x < x1 + rad && y < y1 + rad],
        [x2 - rad, y1 + rad, x > x2 - rad && y < y1 + rad],
        [x1 + rad, y2 - rad, x < x1 + rad && y > y2 - rad],
        [x2 - rad, y2 - rad, x > x2 - rad && y > y2 - rad],
      ]
      for (const [cx, cy, inCorner] of corners) {
        if (inCorner) {
          const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
          if (d > rad) { draw = false; break }
          if (d > rad - 1.5) {
            setPixel(x, y, r, g, b, Math.round(a * Math.max(0, rad - d) / 1.5))
            draw = false
            break
          }
        }
      }
      if (draw) setPixel(x, y, r, g, b, a)
    }
  }
}

// ---- Icon Design ----

// Background: Blue rounded square (#2563eb)
fillRoundedRect(10, 10, 245, 245, 48, 37, 99, 235, 255)

// Subtle light gradient at top
for (let y = 10; y < 128; y++) {
  const alpha = Math.round((1 - y / 128) * 25)
  fillRect(10, y, 245, y, 255, 255, 255, alpha)
}

// Document shape
const dL = 68, dR = 188, dT = 40, dB = 216
const fold = 30

// Document body (white, skip fold corner)
for (let y = dT; y <= dB; y++) {
  for (let x = dL; x <= dR; x++) {
    if (y < dT + fold && x > dR - fold) continue
    setPixel(x, y, 255, 255, 255, 240)
  }
}

// Fold triangle (slightly darker shade)
for (let y = dT; y < dT + fold; y++) {
  for (let x = dR - fold; x <= dR; x++) {
    const relX = x - (dR - fold)
    const relY = y - dT
    if (relX + relY >= fold) {
      setPixel(x, y, 195, 210, 240, 235)
    }
  }
}

// Fold diagonal line
for (let i = 0; i <= fold; i++) {
  setPixel(dR - fold + i, dT + i, 160, 180, 215, 200)
}

// "Title" line — bolder, blue
fillRect(dL + 16, dT + 44, dL + 96, dT + 52, 37, 99, 235, 180)

// Text lines (gray)
fillRect(dL + 16, dT + 66, dL + 88, dT + 71, 150, 165, 190, 140)
fillRect(dL + 16, dT + 82, dL + 78, dT + 87, 150, 165, 190, 140)
fillRect(dL + 16, dT + 98, dL + 84, dT + 103, 150, 165, 190, 140)
fillRect(dL + 16, dT + 114, dL + 60, dT + 119, 150, 165, 190, 120)

// Separator line
fillRect(dL + 12, dB - 42, dR - 12, dB - 41, 37, 99, 235, 80)

// "Total" bar at bottom — blue accent
fillRoundedRect(dR - 70, dB - 34, dR - 12, dB - 18, 4, 37, 99, 235, 160)

// Small "amount" text in total bar
fillRect(dR - 62, dB - 29, dR - 20, dB - 23, 255, 255, 255, 200)

// ---- PNG Encoding ----

const rawData = Buffer.alloc(SIZE * (1 + SIZE * 4))
for (let y = 0; y < SIZE; y++) {
  rawData[y * (1 + SIZE * 4)] = 0 // Filter: None
  pixels.copy(rawData, y * (1 + SIZE * 4) + 1, y * SIZE * 4, (y + 1) * SIZE * 4)
}

const compressed = deflateSync(rawData, { level: 9 })

// CRC-32 table
const crcTable = new Int32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
  crcTable[n] = c
}
function crc32(buf) {
  let crc = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8)
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeB = Buffer.from(type)
  const crcB = Buffer.alloc(4)
  crcB.writeUInt32BE(crc32(Buffer.concat([typeB, data])))
  return Buffer.concat([len, typeB, data, crcB])
}

const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(SIZE, 0)
ihdr.writeUInt32BE(SIZE, 4)
ihdr[8] = 8  // bit depth
ihdr[9] = 6  // RGBA
ihdr[10] = 0 // compression
ihdr[11] = 0 // filter
ihdr[12] = 0 // interlace

const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
  pngChunk('IHDR', ihdr),
  pngChunk('IDAT', compressed),
  pngChunk('IEND', Buffer.alloc(0)),
])

if (!existsSync('build')) mkdirSync('build')
writeFileSync('build/icon.png', png)
console.log(`✓ build/icon.png (${png.length} bytes, ${SIZE}x${SIZE})`)

// ---- ICO Wrapper (embeds PNG) ----

const icoHeader = Buffer.alloc(6)
icoHeader.writeUInt16LE(0, 0)  // reserved
icoHeader.writeUInt16LE(1, 2)  // type: icon
icoHeader.writeUInt16LE(1, 4)  // image count

const icoDir = Buffer.alloc(16)
icoDir[0] = 0   // width  (0 = 256)
icoDir[1] = 0   // height (0 = 256)
icoDir[2] = 0   // color palette
icoDir[3] = 0   // reserved
icoDir.writeUInt16LE(1, 4)           // color planes
icoDir.writeUInt16LE(32, 6)          // bits per pixel
icoDir.writeUInt32LE(png.length, 8)  // PNG data size
icoDir.writeUInt32LE(22, 12)         // offset to PNG data (6 + 16)

const ico = Buffer.concat([icoHeader, icoDir, png])
writeFileSync('build/icon.ico', ico)
console.log(`✓ build/icon.ico (${ico.length} bytes)`)
