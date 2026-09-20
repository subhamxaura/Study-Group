/**
 * Functional journey sweep — covers API features beyond the 142-test E2E suite.
 * Run: node tests/e2e/journey.mjs  (server must be on :3210)
 */
import { PrismaClient } from '@prisma/client'

const BASE = 'http://localhost:3210'
let passed = 0, failed = 0
const failures = []
function check(cond, label, extra = '') {
  if (cond) { passed++ }
  else { failed++; failures.push(`${label}${extra ? ' — ' + extra : ''}`); console.log(`  ✗ ${label}${extra ? ' — ' + extra : ''}`) }
}
function makeClient() {
  let cookie = ''
  const raw = async (path, init = {}) => {
    const res = await fetch(BASE + path, {
      ...init,
      headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}), ...(init.headers || {}) },
    })
    const sc = res.headers.getSetCookie?.() || []
    if (sc.length) cookie = sc.map((c) => c.split(';')[0]).join('; ')
    let body = null
    try { body = await res.json() } catch {}
    return { status: res.status, body }
  }
  return {
    get: (p) => raw(p),
    post: (p, b) => raw(p, { method: 'POST', body: JSON.stringify(b ?? {}) }),
    patch: (p, b) => raw(p, { method: 'PATCH', body: JSON.stringify(b ?? {}) }),
    put: (p, b) => raw(p, { method: 'PUT', body: JSON.stringify(b ?? {}) }),
    del: (p) => raw(p, { method: 'DELETE' }),
  }
}
const uniq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
async function register(suffix) {
  const c = makeClient()
  const email = `jr-${suffix}-${uniq()}@test.studygroup.dev`
  const r = await c.post('/api/auth/register', { name: `Journey ${suffix}`, email, password: 'correct-horse-battery' })
  check(r.status === 200 && r.body?.data?.user?.id, `register ${suffix}`, `status ${r.status}`)
  return c
}

console.log('▶ Setup')
const A = await register('A'), B = await register('B'), C = await register('C')
await B.post('/api/onboarding', { completed: true, profile: { university: 'J Univ', course: 'CS', semester: '2' }, subjects: ['Physics'], goals: { weeklyStudyMinutes: 300 } })
const g = await A.post('/api/groups', { name: `JGroup-${uniq()}`, subject: 'Physics', description: 'journey', isPublic: true })
const G = g.body?.data?.group?.id
check(Boolean(G), 'group created by A')
const join = await B.post(`/api/groups/${G}/join`)
check(join.status === 200, 'B joins group', `status ${join.status}`)

console.log('▶ Calendar events: create, scope, validate, delete gates')
const ev = await A.post('/api/events', { groupId: G, title: 'Journey Event', kind: 'STUDY_SESSION', startsAt: new Date(Date.now() + 36e5).toISOString(), endsAt: new Date(Date.now() + 72e5).toISOString() })
const EV = ev.body?.data?.event?.id
check(ev.status === 200 && Boolean(EV), 'member creates event', `status ${ev.status} ${JSON.stringify(ev.body).slice(0, 80)}`)
const evC = await C.post('/api/events', { groupId: G, title: 'Outsider', kind: 'STUDY_SESSION', startsAt: new Date(Date.now() + 36e5).toISOString(), endsAt: new Date(Date.now() + 72e5).toISOString() })
check(evC.status >= 400 && evC.status < 500, 'non-member cannot create event in group', `status ${evC.status}`)
const evB = await B.post('/api/events', { groupId: G, title: 'Bad dates', kind: 'STUDY_SESSION', startsAt: new Date(Date.now() + 72e5).toISOString(), endsAt: new Date(Date.now() + 36e5).toISOString() })
check(evB.status === 422, 'end<=start rejected 422', `status ${evB.status} ${JSON.stringify(evB.body).slice(0, 80)}`)
const listB = await B.get(`/api/events?from=${new Date(Date.now() - 864e5).toISOString()}&to=${new Date(Date.now() + 7 * 864e5).toISOString()}`)
check(listB.body?.data?.events?.some((e) => e.id === EV), 'member sees group event in calendar range')
const listC = await C.get(`/api/events?from=${new Date(Date.now() - 864e5).toISOString()}&to=${new Date(Date.now() + 7 * 864e5).toISOString()}`)
check(!listC.body?.data?.events?.some((e) => e.id === EV), 'non-member does not see group event')
const delB = await B.del(`/api/events?id=${EV}`)
check(delB.status === 403, 'plain member cannot delete another’s event', `status ${delB.status}`)
const delA = await A.del(`/api/events?id=${EV}`)
check(delA.status === 200, 'creator deletes event', `status ${delA.status}`)

console.log('▶ Group admin gates')
const patchB = await B.patch(`/api/groups/${G}`, { name: 'Hacked' })
check(patchB.status === 403, 'member cannot rename group', `status ${patchB.status}`)
const patchA = await A.patch(`/api/groups/${G}`, { description: 'Updated by owner' })
check(patchA.status === 200, 'owner updates group', `status ${patchA.status}`)

console.log('▶ Focus log → analytics/insights/my-study consistency')
const flog = await B.post('/api/focus', { durationMinutes: 45, subject: 'Physics' })
check(flog.status === 200, 'focus log accepted', `status ${flog.status}`)
const fstate = await B.get('/api/focus')
check((fstate.body?.data?.todayMinutes ?? 0) >= 45, 'focus state todayMinutes >= 45', `got ${fstate.body?.data?.todayMinutes}`)
check((fstate.body?.data?.weekMinutes ?? 0) >= 45, 'focus state weekMinutes >= 45', `got ${fstate.body?.data?.weekMinutes}`)
const an7 = await B.get('/api/analytics?range=7')
const an7min = an7.body?.data?.weekMinutes ?? an7.body?.data?.studyMinutes ?? an7.body?.data?.totalMinutes
check(an7.status === 200 && (an7min ?? 0) >= 45, 'analytics 7d reflects the 45m log', JSON.stringify(an7.body?.data).slice(0, 120))
check((await B.get('/api/analytics?range=30')).status === 200, 'analytics range=30 ok')
check((await B.get('/api/analytics?range=semester')).status === 200, 'analytics range=semester ok')
const anBad = await B.get('/api/analytics?range=bogus')
check(anBad.status === 200 || anBad.status === 400, 'invalid range handled sanely', `status ${anBad.status}`)
const ms = await B.get('/api/my-study')
check(ms.status === 200 && Array.isArray(ms.body?.data?.consistency), 'my-study returns consistency array', JSON.stringify(ms.body?.data).slice(0, 100))
const ins = await B.get('/api/insights')
check(ins.status === 200, 'insights 200')
const insArr = ins.body?.data?.insights ?? ins.body?.data
check(Array.isArray(insArr) ? insArr.every((s) => typeof s === 'string' || typeof s?.text === 'string') : Boolean(insArr), 'insights statements are text', JSON.stringify(ins.body?.data).slice(0, 120))
const dash = await B.get('/api/dashboard')
check(dash.status === 200, 'dashboard 200')
check(['stats', 'todayPlan', 'upcoming', 'dueTasks'].every((k) => k in (dash.body?.data ?? {})), 'dashboard has stats/todayPlan/upcoming/dueTasks keys', Object.keys(dash.body?.data ?? {}).join(','))

console.log('▶ Discover personalization + privacy + joined-group exclusion')
const g2 = await A.post('/api/groups', { name: `PhysMatch-${uniq()}`, subject: 'Physics', description: 'match', isPublic: true })
check(g2.status === 200, 'second public group created')
const priv = await C.post('/api/groups', { name: `Secret-${uniq()}`, subject: 'Physics', isPublic: false })
const privId = priv.body?.data?.group?.id
// A posts 3 messages in its own group G so G would trend, then checks discover:
const myDiscover = await A.get('/api/discover')
const myDiscStr = JSON.stringify(myDiscover.body?.data ?? {})
check(myDiscover.status === 200, 'discover 200 for A', myDiscover.status + '')
check(privId ? !myDiscStr.includes(privId) : true, 'private group hidden from discover')
check(!myDiscStr.includes(`"${G}"`), 'own group never appears in discover sections (trending exclusion)')
const discB = await B.get('/api/discover')
const discBStr = JSON.stringify(discB.body?.data ?? {})
check(discB.status === 200 && discBStr.includes(g2.body?.data?.group?.id), 'matching-subject public group appears in discover for B', discB.status + '')
check(!discBStr.includes(`"${G}"`), 'joined group never appears in discover sections')

console.log('▶ Focus rooms: discovery scoping + duration bounds')
const room = await A.post('/api/focus-rooms', { subject: 'Physics', goal: 'journey room', durationMin: 50, groupId: G })
const RID = room.body?.data?.room?.id ?? room.body?.data?.id
check(room.status === 200 && Boolean(RID), 'room created', `status ${room.status}`)
const roomsB = await B.get('/api/focus-rooms')
check(JSON.stringify(roomsB.body?.data ?? {}).includes(RID), 'member sees room in discovery')
const roomsC = await C.get('/api/focus-rooms')
check(!JSON.stringify(roomsC.body?.data ?? {}).includes(RID), 'non-member does not see group room')
const rLo = await A.post('/api/focus-rooms', { subject: 'X', durationMin: 4, groupId: G })
const rHi = await A.post('/api/focus-rooms', { subject: 'X', durationMin: 300, groupId: G })
check(rLo.status === 422 && rHi.status === 422, 'duration bounds enforced (4 and 300 rejected)', `${rLo.status}/${rHi.status}`)
const cjoin = await C.post(`/api/focus-rooms/${RID}/join`)
check(cjoin.status === 403 || cjoin.status === 404, 'outsider cannot join group room', `status ${cjoin.status}`)
await A.post(`/api/focus-rooms/${RID}`, { action: 'end' }).catch(() => {})

console.log('▶ Notes cross-group listing')
const n1 = await A.post(`/api/notes?groupId=${G}`, { title: 'Note G', content: 'one', kind: 'LECTURE', tags: [] })
const g3 = await A.post('/api/groups', { name: `G3-${uniq()}`, subject: 'Math', isPublic: true })
const n2 = await A.post(`/api/notes?groupId=${g3.body?.data?.group?.id}`, { title: 'Note G3', content: 'two', kind: 'LECTURE', tags: [] })
check(n1.status === 200 && n2.status === 200, 'notes created in two groups', `${n1.status}/${n2.status} ${JSON.stringify(n1.body).slice(0, 80)}`)
const notesG = await A.get(`/api/notes?groupId=${G}`)
check(JSON.stringify(notesG.body?.data ?? []).includes('Note G'), 'notes scoped to a group return')

console.log('▶ Notifications mark-all')
const markAll = await B.patch('/api/notifications', { all: true })
check(markAll.status === 200, 'mark all read', `status ${markAll.status}`)
const notifs = await B.get('/api/notifications')
check((notifs.body?.data?.unreadCount ?? 0) === 0, 'unreadCount 0 after mark-all', `got ${notifs.body?.data?.unreadCount}`)

console.log('▶ AI StudyMate graceful degradation')
const aiStatus = await B.get('/api/ai/chat')
check(aiStatus.status === 200 && typeof aiStatus.body?.data?.configured === 'boolean', 'AI status exposes only a boolean', JSON.stringify(aiStatus.body?.data))
const aiPost = await B.post('/api/ai/chat', { messages: [{ role: 'user', content: 'Explain photosynthesis' }] })
check(aiPost.status === 200 || aiPost.status === 503, 'AI unconfigured → graceful 503 (or works if configured)', `status ${aiPost.status}`)
check(aiPost.status !== 500, 'AI post never 500')
if (n1.body?.data?.note?.id) {
  const aiNote = await C.post('/api/ai/chat', { messages: [{ role: 'user', content: 'summarize' }], context: { noteId: n1.body.data.note.id } })
  check(aiNote.status === 403 || aiNote.status === 503, 'AI note context authorization enforced', `status ${aiNote.status}`)
}

console.log('▶ Profile update + privacy + email leak check')
const prof = await B.put('/api/profile', { name: 'Journey B Renamed', bio: 'bio', subjects: ['Physics'], privacy: 'PUBLIC' })
check(prof.status === 200, 'profile PUT', `status ${prof.status}`)
const meB = await B.get('/api/auth/me')
const BID = meB.body?.data?.user?.id
const profC2 = await C.get(`/api/profile?userId=${BID}`)
const pc = profC2.body?.data?.profile ?? profC2.body?.data
check(profC2.status === 200, 'PUBLIC profile viewable by others', `status ${profC2.status}`)
check(pc ? !('email' in pc) : true, 'profile response carries no email field', JSON.stringify(pc).slice(0, 80))
check(pc?.user?.name === 'Journey B Renamed' || pc?.name === 'Journey B Renamed', 'renamed name reflected', JSON.stringify(pc).slice(0, 80))
await B.put('/api/profile', { name: 'Journey B Renamed', privacy: 'PRIVATE' })
const profPriv = await C.get(`/api/profile?userId=${BID}`)
check(profPriv.status === 404 || profPriv.status === 403, 'PRIVATE profile hidden from others', `status ${profPriv.status}`)

console.log('▶ Cleanup')
for (const c of [A, B, C]) await c.post('/api/auth/logout').catch(() => {})
const prisma = new PrismaClient()
const del = await prisma.user.deleteMany({ where: { email: { contains: '@test.studygroup.dev' } } })
await prisma.$disconnect()
console.log(`cleanup: deleted ${del.count} journey users`)

console.log('\n============================================================')
console.log(`JOURNEY RESULT: ${passed} passed, ${failed} failed`)
if (failures.length) { console.log('\nFAILURES:'); failures.forEach((f) => console.log('  - ' + f)) }
process.exit(failed ? 1 : 0)
