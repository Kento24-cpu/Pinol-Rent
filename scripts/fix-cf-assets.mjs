import { existsSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const dist = resolve(process.cwd(), 'dist')
const assets = join(dist, 'assets')
const oldDir = join(assets, 'node_modules')

if (existsSync(oldDir)) {
  for (const entry of readdirSync(oldDir)) {
    renameSync(join(oldDir, entry), join(assets, entry))
  }
  rmSync(oldDir, { recursive: true, force: true })
  console.log('fix-cf-assets: moved assets out of node_modules')
} else {
  console.log('fix-cf-assets: no node_modules folder to move')
}

const targets = []
function walk(dir) {
  if (!existsSync(dir)) return
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name)
    if (entry.isDirectory()) walk(p)
    else if (/\.(js|css|html)$/.test(entry.name)) targets.push(p)
  }
}
walk(join(dist, '_expo', 'static'))
const html = join(dist, 'index.html')
if (existsSync(html)) targets.push(html)

let changed = 0
for (const file of targets) {
  const content = readFileSync(file, 'utf8')
  const next = content.replaceAll('assets/node_modules', 'assets')
  if (next !== content) {
    writeFileSync(file, next)
    changed++
  }
}
console.log(`fix-cf-assets: patched ${changed} file(s)`)
