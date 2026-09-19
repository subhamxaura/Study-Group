/**
 * Responsive QA — drives the installed Chrome binary (headless, no deps)
 * to load authed pages at 1440 / 768 / 390 and check for horizontal
 * overflow. Uses --remote-debugging-port + CDP over the stdio-free
 * /json endpoints; screenshots land in .next/qa-shots/.
 */
import { execFile } from 'node:child_process'
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { setTimeout as sleep } from 'node:timers/promises'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 9333
const BASE = 'http://localhost:3210'
const WIDTHS = [1440, 768, 390]
const PAGES = ['/dashboard', '/focus', '/tasks', '/calendar', '/discover', '/messages', '/groups', '/resources', '/notes', '/analytics', '/my-study', '/profile', '/settings']

const tmp = process.env.TEMP || '/tmp'
mkdirSync('.next/qa-shots', { recursive: true })

const chrome = execFile(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`,
  '--user-data-dir=' + tmp + '/sg-qa-profile', '--no-first-run', '--no-default-browser-check',
  '--window-size=1440,900', 'about:blank',
])
process.on('exit', () => { try { chrome.kill() } catch {} })

// Wait for the devtools endpoint
let ready = false
for (let i = 0; i < 40 && !ready; i++) {
  try { await fetch(`http://127.0.0.1:${PORT}/json/version`); ready = true } catch { await sleep(250) }
}
if (!ready) { console.error('Chrome devtools never came up'); process.exit(1) }

// Open a tab
const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
let target = targets.find((t) => t.type === 'page')
const created = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json().catch(() => null)
if (created?.id) target = created
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })

let mid = 0
const pending = new Map()
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data)
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id) }
}
function send(method, params = {}) {
  const id = ++mid
  return new Promise((res) => {
    pending.set(id, res)
    ws.send(JSON.stringify({ id, method, params }))
  })
}

// Seed the auth cookie from the curl jar passed via QA_COOKIE_JAR
const jarPath = process.env.QA_COOKIE_JAR
const jar = jarPath ? readFileSync(jarPath, 'utf8').split('\n') : []
// curl marks HttpOnly cookies as `#HttpOnly_...` — strip that prefix before parsing
const authLine = jar.filter((l) => l.trim() && !l.startsWith('# ') && !l.startsWith('#Netscape') && !l.startsWith('#http') && !l.startsWith('# This')).pop()
let token = null, cookieName = null
if (authLine) {
  const parts = authLine.split('\t')
  cookieName = parts[5]
  token = parts[6]?.trim()
}
if (!token) { console.error('NO AUTH TOKEN in jar — pass QA_COOKIE_JAR'); process.exit(1) }

await send('Network.enable')
await send('Network.setCookie', { name: cookieName, value: token, domain: 'localhost', path: '/', httpOnly: true, secure: false })

let failures = 0
for (const width of WIDTHS) {
  await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 500 })
  for (const path of PAGES) {
    await send('Page.enable')
    await send('Page.navigate', { url: BASE + path })
    await sleep(1700) // allow client fetches to settle
    const expr = `(() => {
      const d = document.documentElement
      const overflow = d.scrollWidth - d.clientWidth
      const offenders = overflow > 1
        ? [...document.querySelectorAll('body *')]
            .filter(el => el.getBoundingClientRect().right > d.clientWidth + 1 && el.offsetWidth > 0)
            .slice(0, 3)
            .map(el => el.tagName + '.' + String(el.className).split(' ').slice(0, 3).join('.'))
        : []
      return JSON.stringify({ overflow, offenders })
    })()`
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true })
    let result = { overflow: -1, offenders: [] }
    try { result = JSON.parse(r.result.result.value) } catch {}
    const bad = result.overflow > 1
    if (bad) failures++
    const shot = `.next/qa-shots/${width}${path.replaceAll('/', '_')}.png`
    const cap = await send('Page.captureScreenshot', { format: 'png' })
    if (cap.result?.data) writeFileSync(shot, Buffer.from(cap.result.data, 'base64'))
    console.log(`${bad ? 'FAIL' : ' ok '} ${width}px ${path}  overflow=${result.overflow}${bad ? '  ← ' + result.offenders.join(' | ') : ''}`)
  }
}
console.log(failures === 0 ? '\nALL CLEAR — no horizontal overflow at any width' : `\n${failures} overflowing view(s)`)
ws.close()
process.exit(failures === 0 ? 0 : 1)
