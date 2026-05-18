import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pngToIco from 'png-to-ico'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = path.join(root, 'frontend', 'public', 'banu-adam-logo.png')
const iconsDir = path.join(root, 'electron', 'icons')
const tmpDir = path.join(iconsDir, '.tmp')

const sourceBuffer = readFileSync(source)

const resizeOpts = {
  fit: 'contain',
  background: { r: 255, g: 255, b: 255, alpha: 1 },
}

function resizeFromSource(size) {
  return sharp(sourceBuffer)
    .resize(size, size, resizeOpts)
    .png({ compressionLevel: 9, palette: size <= 48 })
    .toBuffer()
}

mkdirSync(iconsDir, { recursive: true })
mkdirSync(tmpDir, { recursive: true })

const icoSizes = [256, 128, 64, 48, 32, 16]
const tmpPaths = []

for (const size of icoSizes) {
  const buf = await resizeFromSource(size)
  const filePath = path.join(tmpDir, `icon-${size}.png`)
  writeFileSync(filePath, buf)
  tmpPaths.push(filePath)
}

const icoBuffer = await pngToIco(tmpPaths)

const outputs = [
  [path.join(iconsDir, 'icon.ico'), icoBuffer],
  [path.join(iconsDir, 'icon.png'), await resizeFromSource(512)],
  [path.join(root, 'electron', 'app-icon.png'), await resizeFromSource(256)],
  [path.join(root, 'frontend', 'public', 'favicon.ico'), icoBuffer],
  [path.join(root, 'frontend', 'public', 'favicon-32x32.png'), await resizeFromSource(32)],
  [path.join(root, 'frontend', 'public', 'icon-512.png'), await resizeFromSource(512)],
]

mkdirSync(path.join(root, 'frontend', 'src', 'assets'), { recursive: true })
outputs.push([path.join(root, 'frontend', 'src', 'assets', 'banu-adam-logo.png'), await resizeFromSource(512)])

for (const [target, data] of outputs) {
  writeFileSync(target, data)
  console.log(`Wrote ${path.relative(root, target)}`)
}

rmSync(tmpDir, { recursive: true, force: true })

console.log('Windows .ico ready. Rebuild installer: npm run dist:win')
console.log('After install: delete old desktop shortcut, then run: ie4uinit.exe -show')
