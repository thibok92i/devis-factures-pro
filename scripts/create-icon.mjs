/**
 * Generate DevisPro app icon (256x256) as PNG and ICO.
 * Pure Node.js — no external dependencies.
 *
 * Design: Warm brown rounded square + white hammer icon (menuiserie/artisan)
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

function fillCircle(cx, cy, r, cr, cg, cb, ca) {
  for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++) {
    for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
      const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
      if (d <= r - 1) setPixel(x, y, cr, cg, cb, ca)
      else if (d <= r + 0.5) setPixel(x, y, cr, cg, cb, Math.round(ca * Math.max(0, r + 0.5 - d) / 1.5))
    }
  }
}

/** Draw a filled rotated rectangle (for hammer parts) */
function fillRotatedRect(cx, cy, w, h, angle, r, g, b, a) {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const maxR = Math.sqrt(w * w + h * h) / 2 + 2
  for (let dy = -maxR; dy <= maxR; dy++) {
    for (let dx = -maxR; dx <= maxR; dx++) {
      // Rotate point back to rect-local coords
      const lx = dx * cos + dy * sin
      const ly = -dx * sin + dy * cos
      if (lx >= -w / 2 && lx <= w / 2 && ly >= -h / 2 && ly <= h / 2) {
        setPixel(cx + dx, cy + dy, r, g, b, a)
      }
    }
  }
}

// ---- Icon Design ----

// Background: Warm brown/wood rounded square (matches app theme)
// Primary color from app: hsl(35 65% 30%) ≈ #7D5C1F → richer brown
const bgR = 101, bgG = 67, bgB = 33 // Deep warm brown (#654321)
fillRoundedRect(10, 10, 245, 245, 48, bgR, bgG, bgB, 255)

// Subtle warm gradient at top
for (let y = 10; y < 140; y++) {
  const alpha = Math.round((1 - y / 140) * 30)
  fillRect(10, y, 245, y, 255, 200, 140, alpha)
}

// Subtle dark gradient at bottom
for (let y = 180; y <= 245; y++) {
  const alpha = Math.round(((y - 180) / 65) * 25)
  fillRect(10, y, 245, y, 0, 0, 0, alpha)
}

// ---- Hammer icon (white, centered) ----
const angle = -Math.PI / 4 // 45 degrees tilted

// Handle (long thin rect, tilted 45°)
// Center of handle is offset down-right from center
const handleCX = 148, handleCY = 148
fillRotatedRect(handleCX, handleCY, 14, 120, angle, 255, 255, 255, 230)

// Handle grip lines (subtle darker marks)
for (let i = -3; i <= 3; i++) {
  const ox = i * 6
  const hx = handleCX + ox * Math.cos(angle) + ox * Math.sin(angle) * 0.3
  const hy = handleCY + ox * Math.sin(angle) - ox * Math.cos(angle) * 0.3
  fillRotatedRect(hx + 18, hy + 18, 12, 2, angle, bgR, bgG, bgB, 60)
}

// Hammer head (big thick rect on top of handle, tilted 45°)
const headCX = 105, headCY = 105
fillRotatedRect(headCX, headCY, 80, 30, angle, 255, 255, 255, 245)

// Hammer head face (flat striking surface — slightly brighter)
const faceOffX = -22 * Math.cos(angle + Math.PI / 2)
const faceOffY = -22 * Math.sin(angle + Math.PI / 2)
fillRotatedRect(headCX + faceOffX, headCY + faceOffY, 36, 8, angle + Math.PI / 2, 255, 255, 255, 255)

// Small accent line on hammer head
fillRotatedRect(headCX, headCY, 76, 3, angle, bgR, bgG, bgB, 40)

// Connection circle (where handle meets head)
fillCircle(128, 128, 10, 255, 255, 255, 250)
fillCircle(128, 128, 5, bgR, bgG, bgB, 80)

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
