/**
 * Generates Flow's raster assets from scratch — no image dependencies.
 *   build/icon.png    512×512 app icon (rounded charcoal tile, clay timer ring)
 *   build/icon.ico    256×256 PNG-compressed ICO for Windows
 *   build/icon.icns   128/256/512/1024 PNG-compressed ICNS for macOS
 *   resources/tray.png 64×64 transparent tray glyph
 *
 * Run: node scripts/gen-icons.mjs
 */
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/* ------------------------------------------------------------------ PNG */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(buf) {
  let c = 0xffffffff
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const out = Buffer.alloc(8 + data.length + 4)
  out.writeUInt32BE(data.length, 0)
  out.write(type, 4, 'ascii')
  data.copy(out, 8)
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length)
  return out
}

/** Encodes RGBA pixels (straight alpha) as a PNG. */
function encodePNG(width, height, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA

  const stride = width * 4
  const raw = Buffer.alloc(height * (stride + 1))
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0 // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/* --------------------------------------------------------------- shapes */

const SS = 4 // supersampling factor for clean edges

/**
 * Composites premultiplied samples over one another, straight-alpha output.
 * `sample(x, y)` returns [r, g, b, a] with a in 0..1, or null for no coverage.
 */
function render(size, sample) {
  const rgba = Buffer.alloc(size * size * 4)
  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      for (let sy = 0; sy < SS; sy += 1) {
        for (let sx = 0; sx < SS; sx += 1) {
          const hit = sample((px + (sx + 0.5) / SS) / size, (py + (sy + 0.5) / SS) / size)
          if (!hit) continue
          const [hr, hg, hb, ha] = hit
          r += hr * ha
          g += hg * ha
          b += hb * ha
          a += ha
        }
      }
      const n = SS * SS
      const i = (py * size + px) * 4
      if (a <= 0) continue
      rgba[i] = Math.max(0, Math.min(255, Math.round((r / a) * 255)))
      rgba[i + 1] = Math.max(0, Math.min(255, Math.round((g / a) * 255)))
      rgba[i + 2] = Math.max(0, Math.min(255, Math.round((b / a) * 255)))
      rgba[i + 3] = Math.max(0, Math.min(255, Math.round((a / n) * 255)))
    }
  }
  return rgba
}

const CHARCOAL = [0x23, 0x21, 0x1e]
const CLAY = [0xb2, 0x5b, 0x3c]

// Normalised distance from a rounded-rect edge; negative inside.
function roundedRectSD(x, y, cx, cy, halfW, halfH, radius) {
  const qx = Math.abs(x - cx) - (halfW - radius)
  const qy = Math.abs(y - cy) - (halfH - radius)
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0))
  return outside - radius + Math.min(Math.max(qx, qy), 0)
}

/**
 * Clay timer ring: a C opening at the top (12 o'clock), antialiased ends.
 * Ring exists for |angle| >= gapHalf, angle measured from 12 o'clock, clockwise.
 */
function ringSample(x, y, cx, cy, radius, thickness, gapHalf, color, scale) {
  const dx = x - cx
  const dy = y - cy
  const dist = Math.hypot(dx, dy)
  const sd = Math.abs(dist - radius) - thickness / 2 // <0 inside the band
  if (sd > 1 / scale) return null

  const absAngle = Math.abs(Math.atan2(dx, -dy))
  const aa = ((2 * Math.PI) / 180) / scale // ~2° of angular antialiasing

  let arc
  if (absAngle <= gapHalf) arc = 0
  else if (absAngle - gapHalf < aa) arc = (absAngle - gapHalf) / aa
  else arc = 1
  if (arc <= 0) return null

  const radial = sd <= 0 ? 1 : Math.max(0, 1 - sd * scale)
  const alpha = radial * arc
  if (alpha <= 0) return null
  return [color[0] / 255, color[1] / 255, color[2] / 255, Math.min(1, alpha)]
}

function dotSample(x, y, cx, cy, radius, color, scale) {
  const sd = Math.hypot(x - cx, y - cy) - radius
  const alpha = sd <= 0 ? 1 : Math.max(0, 1 - sd * scale)
  if (alpha <= 0) return null
  return [color[0] / 255, color[1] / 255, color[2] / 255, Math.min(1, alpha)]
}

/** The Flow mark: charcoal tile, clay timer ring with a top gap, marker bead. */
function appIcon(size) {
  return render(size, (u, v) => {
    const scale = size

    // Tile
    const tileSD = roundedRectSD(u, v, 0.5, 0.5, 0.5, 0.5, 0.225)
    const tileAlpha = tileSD <= 0 ? 1 : Math.max(0, 1 - tileSD * scale)
    if (tileAlpha <= 0) return null

    const cx = 0.5
    const cy = 0.5
    const radius = 0.3
    const thickness = 0.05
    const gapHalf = (36 * Math.PI) / 180

    const ring = ringSample(u, v, cx, cy, radius, thickness, gapHalf, CLAY, scale)

    // Marker knob sits on the clockwise end of the arc (just right of the gap).
    const beadAngle = gapHalf
    const beadR = 0.042
    const bx = cx + Math.sin(beadAngle) * radius
    const by = cy - Math.cos(beadAngle) * radius
    const bead = dotSample(u, v, bx, by, beadR, CLAY, scale)

    const mark = bead && bead[3] >= (ring?.[3] ?? 0) ? bead : ring
    const base = [CHARCOAL[0] / 255, CHARCOAL[1] / 255, CHARCOAL[2] / 255]
    if (!mark) return [base[0], base[1], base[2], tileAlpha]

    // Composite the mark's antialiased coverage over the charcoal tile.
    const mA = Math.min(1, Math.max(0, mark[3]))
    return [
      mark[0] * mA + base[0] * (1 - mA),
      mark[1] * mA + base[1] * (1 - mA),
      mark[2] * mA + base[2] * (1 - mA),
      tileAlpha,
    ]
  })
}

/** Tray glyph: the mark alone, clay on transparency, slightly bolder. */
function trayGlyph(size) {
  return render(size, (u, v) => {
    const scale = size
    const cx = 0.5
    const cy = 0.5
    const radius = 0.33
    const thickness = 0.075
    const gapHalf = (34 * Math.PI) / 180

    const ring = ringSample(u, v, cx, cy, radius, thickness, gapHalf, CLAY, scale)
    const beadAngle = gapHalf
    const beadR = 0.055
    const bx = cx + Math.sin(beadAngle) * radius
    const by = cy - Math.cos(beadAngle) * radius
    const bead = dotSample(u, v, bx, by, beadR, CLAY, scale)

    return bead && bead[3] > (ring?.[3] ?? 0) ? bead : ring
  })
}

/* ---------------------------------------------------------------- ICO/ICNS */

function pngICO(png256) {
  const header = Buffer.alloc(6 + 16)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(1, 4) // count
  header[6] = 0 // width (0 = 256)
  header[7] = 0 // height
  header[8] = 0 // palette
  header[9] = 0
  header.writeUInt16LE(1, 10) // planes
  header.writeUInt16LE(32, 12) // bit count
  header.writeUInt32LE(png256.length, 14)
  header.writeUInt32LE(6 + 16, 18) // offset
  return Buffer.concat([header, png256])
}

function pngICNS(pngs) {
  const entries = pngs.map(({ type, data }) => {
    const head = Buffer.alloc(8)
    head.write(type, 0, 'ascii')
    head.writeUInt32BE(8 + data.length, 4)
    return Buffer.concat([head, data])
  })
  const body = Buffer.concat(entries)
  const head = Buffer.alloc(8)
  head.write('icns', 0, 'ascii')
  head.writeUInt32BE(8 + body.length, 4)
  return Buffer.concat([head, body])
}

/* ------------------------------------------------------------------- main */

function resizeNearest(rgba, from, to) {
  const out = Buffer.alloc(to * to * 4)
  const ratio = from / to
  for (let y = 0; y < to; y += 1) {
    for (let x = 0; x < to; x += 1) {
      const sx = Math.min(from - 1, Math.floor(x * ratio))
      const sy = Math.min(from - 1, Math.floor(y * ratio))
      rgba.copy(out, (y * to + x) * 4, (sy * from + sx) * 4, (sy * from + sx) * 4 + 4)
    }
  }
  return out
}

mkdirSync(join(ROOT, 'build'), { recursive: true })
mkdirSync(join(ROOT, 'resources'), { recursive: true })

const icon1024 = appIcon(1024)
const icon512 = appIcon(512)
const icon256 = appIcon(256)
const icon128 = appIcon(128)
const tray64 = trayGlyph(64)

writeFileSync(join(ROOT, 'build', 'icon.png'), encodePNG(512, 512, icon512))
writeFileSync(join(ROOT, 'build', 'icon.ico'), pngICO(encodePNG(256, 256, icon256)))
writeFileSync(
  join(ROOT, 'build', 'icon.icns'),
  pngICNS([
    { type: 'ic07', data: encodePNG(128, 128, icon128) },
    { type: 'ic08', data: encodePNG(256, 256, icon256) },
    { type: 'ic09', data: encodePNG(512, 512, icon512) },
    { type: 'ic10', data: encodePNG(1024, 1024, icon1024) },
  ]),
)
writeFileSync(join(ROOT, 'resources', 'tray.png'), encodePNG(64, 64, tray64))
writeFileSync(join(ROOT, 'resources', 'app-icon.png'), encodePNG(512, 512, icon512))

void resizeNearest // kept for future density variants

console.log('icons written: build/icon.png, build/icon.ico, build/icon.icns, resources/tray.png, resources/app-icon.png')
