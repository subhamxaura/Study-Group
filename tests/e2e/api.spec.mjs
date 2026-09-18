/**
 * Study-Group E2E suite (API level).
 *
 * Runs against a RUNNING server (production build) + real PostgreSQL.
 * Usage:
 *   npm run build && npx next start -p 3210 &
 *   npm run test:e2e            (or: E2E_BASE_URL=http://localhost:3210 node tests/e2e/api.spec.mjs)
 *
 * Asserts actual behavior — payload shapes, persisted effects, and
 * authorization boundaries — never "HTTP 200 = pass".
 */

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3210'
const SKIP_IF_DOWN = process.env.E2E_SKIP_IF_DOWN === '1'

let passed = 0
let failed = 0
const failures = []

function assert(cond, label, extra = '') {
  if (cond) { passed++; return }
  failed++
  failures.push(`${label}${extra ? ` — ${extra}` : ''}`)
  console.error(`  ✗ ${label}${extra ? ` — ${extra}` : ''}`)
}

function section(name) {
  console.log(`\n▶ ${name}`)
}

/** Cookie-jar-per-user fetch client with envelope handling. */
function makeClient() {
  let cookie = ''
  const client = {
    async raw(path, init = {}) {
      const res = await fetch(`${BASE}${path}`, {
        ...init,
        headers: {
          ...(init.body && !(init.body instanceof FormData)
            ? { 'content-type': 'application/json' }
            : {}),
          ...(cookie ? { cookie } : {}),
          ...(init.headers || {}),
        },
        redirect: 'manual',
      })
      const setCookie = res.headers.get('set-cookie')
      if (setCookie) {
        const pair = setCookie.split(';')[0]
        const name = pair.slice(0, pair.indexOf('='))
        cookie = cookie
          .split('; ').filter((c) => !c.startsWith(`${name}=`))
          .concat(pair).join('; ')
      }
      return res
    },
    async json(path, init = {}) {
      const res = await this.raw(path, init)
      let body = null
      try { body = await res.json() } catch { /* non-JSON */ }
      return { status: res.status, body }
    },
    get(path) { return this.json(path) },
    post(path, data) { return this.json(path, { method: 'POST', body: JSON.stringify(data) }) },
    patch(path, data) { return this.json(path, { method: 'PATCH', body: JSON.stringify(data) }) },
    put(path, data) { return this.json(path, { method: 'PUT', body: JSON.stringify(data) }) },
    del(path) { return client.json(path, { method: 'DELETE' }) },
  }
  return client
}

async function registerUser(client, suffix) {
  const email = `e2e-${suffix}-${Date.now()}@test.studygroup.dev`
  const res = await client.post('/api/auth/register', {
    name: `E2E ${suffix}`,
    email,
    password: 'correct-horse-battery',
  })
  assert(res.status === 200 && res.body?.ok, `register ${suffix} succeeds`, `status ${res.status}`)
  assert(Boolean(res.body?.data?.user?.id), `register ${suffix} returns a user id`)
  return { email, id: res.body?.data?.user?.id }
}

async function main() {
  // Probe
  try {
    const res = await fetch(`${BASE}/`, { redirect: 'manual' })
    if (res.status >= 500) throw new Error(`probe ${res.status}`)
  } catch (err) {
    if (SKIP_IF_DOWN) { console.log(`Server not reachable at ${BASE} — skipping E2E.`); return }
    console.error(`Server not reachable at ${BASE}: ${err.message}`)
    process.exit(1)
  }

  const A = makeClient() // group owner
  const B = makeClient() // second member
  const C = makeClient() // outsider (registered, not a member)

  section('Health & unauthenticated access')
  {
    const r = await A.raw('/')
    assert(r.status === 200, 'landing page loads', `status ${r.status}`)

    const me = await C.get('/api/auth/me')
    assert(me.status === 401 && me.body?.ok === false, 'unauthenticated /api/auth/me rejected with 401', `status ${me.status}`)

    const dash = await C.get('/api/dashboard')
    assert(dash.status === 401, 'unauthenticated dashboard API rejected with 401', `status ${dash.status}`)

    const groups = await C.get('/api/groups')
    assert(groups.status === 401, 'unauthenticated groups API rejected with 401', `status ${groups.status}`)
  }

  section('Registration & login')
  {
    const a = await registerUser(A, 'owner')
    globalThis.__aId = a.id
    const b = await registerUser(B, 'member')
    globalThis.__bId = b.id
    await registerUser(C, 'outsider')

    const dup = await A.post('/api/auth/register', { name: 'Dup', email: a.email, password: 'x'.repeat(12) })
    assert(dup.status === 409, 'duplicate email registration rejected with 409', `status ${dup.status}`)

    const badLogin = await makeClient()
    const bl = await badLogin.post('/api/auth/login', { email: a.email, password: 'wrong-password' })
    assert(bl.status === 401 && bl.body?.error === 'Invalid email or password', 'wrong password rejected with exact message', `status ${bl.status}`)

    const okLogin = await makeClient()
    const ol = await okLogin.post('/api/auth/login', { email: a.email, password: 'correct-horse-battery' })
    assert(ol.status === 200 && ol.body?.data?.user?.email === a.email, 'correct login returns the user')
  }

  section('Groups: create, join, membership')
  {
    const created = await A.post('/api/groups', {
      name: 'E2E Test Group',
      description: 'Created by the E2E suite',
      subject: 'Testing',
      isPublic: true,
      tags: [],
    })
    assert(created.status === 200 && created.body?.data?.group?.id, 'group creation returns a group', `status ${created.status}`)
    globalThis.__groupId = created.body?.data?.group?.id

    const join = await B.post(`/api/groups/${globalThis.__groupId}/join`)
    assert(join.status === 200 && join.body?.data?.joined === true, 'second user can join public group', `status ${join.status}`)

    const joinAgain = await B.post(`/api/groups/${globalThis.__groupId}/join`)
    assert(joinAgain.status === 200 && joinAgain.body?.data?.alreadyMember === true, 'double-join is idempotent (alreadyMember)', `status ${joinAgain.status}`)

    const members = await A.get(`/api/groups/${globalThis.__groupId}/members`)
    const list = members.body?.data?.members ?? []
    assert(members.status === 200 && Array.isArray(list) && list.length >= 2, 'members list contains both users', `count ${list.length}`)
    assert(list.some((m) => m.user?.id === globalThis.__aId && m.role === 'OWNER'), 'creator has OWNER role')

    // Join notifications went to the owner
    const notifs = await A.get('/api/notifications?pageSize=30')
    assert((notifs.body?.data?.notifications ?? []).some((n) => n.kind === 'JOIN_REQUEST' && n.title.includes('E2E member')), 'owner received a join notification')
  }

  section('Chat: send, sync, edit, reactions, mentions, delete')
  {
    const gid = globalThis.__groupId
    const send = await A.post(`/api/groups/${gid}/messages`, { content: 'Hello from E2E' })
    assert(send.status === 200 && send.body?.data?.message?.id, 'message send returns persisted message', `status ${send.status}`)
    const mid = send.body?.data?.message?.id

    const tooLong = await A.post(`/api/groups/${gid}/messages`, { content: 'x'.repeat(4001) })
    assert(tooLong.status === 422, 'oversized message rejected with 422', `status ${tooLong.status}`)
    const empty = await A.post(`/api/groups/${gid}/messages`, { content: '   ' })
    assert(empty.status === 422, 'empty message rejected with 422', `status ${empty.status}`)

    // Edit: author allowed, non-author forbidden
    const edit = await A.patch(`/api/messages/${mid}`, { content: 'Hello from E2E (edited)' })
    assert(edit.status === 200 && edit.body?.data?.message?.content === 'Hello from E2E (edited)', 'author can edit own message', `status ${edit.status}`)
    const editByOther = await B.patch(`/api/messages/${mid}`, { content: 'hijacked' })
    assert(editByOther.status === 403, 'non-author edit rejected with 403', `status ${editByOther.status}`)

    // Reactions: toggle on -> propagates via sync -> toggle off
    const reactOn = await B.post(`/api/messages/${mid}/reactions`, { emoji: '👍' })
    assert(reactOn.status === 200 && reactOn.body?.data?.reacted === true, 'member can react to a message', `status ${reactOn.status}`)

    const sync = await A.get(`/api/groups/${gid}/sync?since=${encodeURIComponent(new Date(Date.now() - 5 * 60000).toISOString())}&vsince=${encodeURIComponent(new Date(Date.now() - 3600000).toISOString())}`)
    assert(sync.status === 200 && sync.body?.ok, 'sync endpoint responds', `status ${sync.status}`)
    assert(Array.isArray(sync.body?.data?.online), 'sync returns online member ids')
    const reacted = (sync.body?.data?.messages ?? []).find((m) => m.id === mid)
    assert(reacted && (reacted.reactions ?? []).some((r) => r.emoji === '👍'), 'reaction propagates via sync to other members')

    const reactOff = await B.post(`/api/messages/${mid}/reactions`, { emoji: '👍' })
    assert(reactOff.status === 200 && reactOff.body?.data?.reacted === false, 'reaction toggles off', `status ${reactOff.status}`)

    // Mentions: mention by name -> B receives a MENTION notification
    const mention = await A.post(`/api/groups/${gid}/messages`, { content: 'Pinging @E2E member for the problem set' })
    assert(mention.status === 200, 'mention message sends', `status ${mention.status}`)
    const notifs = await B.get('/api/notifications?pageSize=30')
    assert((notifs.body?.data?.notifications ?? []).some((n) => n.kind === 'MENTION'), 'mentioned user receives a MENTION notification')

    // Delete: non-author, non-moderator forbidden; author can delete
    const delByOther = await B.del(`/api/messages/${mid}`)
    assert(delByOther.status === 403, 'non-author delete rejected with 403', `status ${delByOther.status}`)
    const del = await A.del(`/api/messages/${mid}`)
    assert(del.status === 200 && del.body?.data?.deleted === true, 'author can delete own message', `status ${del.status}`)
  }

  section('Permission-aware search & discovery')
  {
    const search = await C.get(`/api/search?q=${encodeURIComponent('E2E Test Group')}`)
    assert(search.status === 200 && search.body?.ok, 'search endpoint responds', `status ${search.status}`)
    assert((search.body?.data?.groups ?? []).some((g) => g.name === 'E2E Test Group'), 'public group found by search')

    // Private group must NOT appear for outsiders
    const priv = await A.post('/api/groups', { name: 'E2E Private Group', subject: 'Secret', description: '', isPublic: false, tags: [] })
    globalThis.__privId = priv.body?.data?.group?.id
    const searchPriv = await C.get(`/api/search?q=${encodeURIComponent('E2E Private Group')}`)
    assert((searchPriv.body?.data?.groups ?? []).length === 0, 'private group NOT returned in outsider search (permission-aware)')

    const asOutsider = await C.get(`/api/groups/${globalThis.__privId}`)
    assert(asOutsider.body?.data?.restricted === true && asOutsider.body?.data?.myRole === null, 'private group content restricted for outsider (limited header only)')

    const outsiderMsgs = await C.get(`/api/groups/${globalThis.__privId}/messages`)
    assert(outsiderMsgs.status === 403 || outsiderMsgs.body?.ok === false, 'private group messages forbidden for outsider', `status ${outsiderMsgs.status}`)

    const outsiderMembers = await C.get(`/api/groups/${globalThis.__privId}/members`)
    assert(outsiderMembers.status === 403 || outsiderMembers.body?.ok === false, 'private group members forbidden for outsider', `status ${outsiderMembers.status}`)
  }

  section('Tasks: create, transition, comments')
  {
    const created = await A.post('/api/tasks', {
      title: 'E2E task: solve problem set',
      groupId: globalThis.__groupId,
      priority: 'HIGH',
    })
    assert(created.status === 200 && created.body?.data?.task?.id, 'task creation returns task', `status ${created.status}`)
    const tid = created.body?.data?.task?.id

    const complete = await A.patch(`/api/tasks/${tid}`, { status: 'COMPLETED' })
    assert(complete.status === 200 && complete.body?.data?.task?.status === 'COMPLETED', 'task status transition persists', `status ${complete.status}`)

    const mine = await A.get('/api/tasks?scope=mine&status=COMPLETED')
    assert((mine.body?.data?.tasks ?? []).some((t) => t.id === tid), 'completed task appears in the mine+completed query')

    const comment = await A.post(`/api/tasks/${tid}/comments`, { content: 'Finished the first three problems.' })
    assert(comment.status === 200 && comment.body?.data?.comment?.id, 'task comment persists', `status ${comment.status}`)

    const comments = await A.get(`/api/tasks/${tid}/comments`)
    assert((comments.body?.data?.comments ?? []).some((c) => c.content === 'Finished the first three problems.'), 'comment round-trips through the API')

    // Group membership gate: outsider cannot comment on the group task
    const outsiderComment = await C.post(`/api/tasks/${tid}/comments`, { content: 'intruding' })
    assert(outsiderComment.status === 403 || outsiderComment.body?.ok === false, 'outsider cannot comment on group task', `status ${outsiderComment.status}`)
  }

  section('Sessions: create, RSVP, participants, attendance')
  {
    // Attendance can only be marked once a session has started (enforced with 409),
    // so this session is created already in progress.
    const start = new Date(Date.now() - 10 * 60000)
    const end = new Date(Date.now() + 50 * 60000)
    const created = await A.post('/api/sessions', {
      title: 'E2E study session',
      groupId: globalThis.__groupId,
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
    })
    assert(created.status === 200 && created.body?.data?.session?.id, 'session creation returns session', `status ${created.status}`)
    const sid = created.body?.data?.session?.id

    const rsvp = await B.post(`/api/sessions/${sid}/rsvp`, { status: 'GOING' })
    assert(rsvp.status === 200 && rsvp.body?.ok, 'member can RSVP going', `status ${rsvp.status}`)

    const detail = await A.get(`/api/sessions/${sid}/attendance`)
    const s = detail.body?.data?.session
    // Host is auto-RSVP'd GOING on creation; B adds one more
    assert(s && s.goingCount === 2, 'going count includes auto-RSVPed host + member', `goingCount ${s?.goingCount}`)
    assert(Array.isArray(s?.rsvps) && s.rsvps.some((r) => r.userId === globalThis.__bId), 'participant list includes the RSVPed member')
    assert(s?.isHost === true && s?.isPast === false && s?.isLive === true, 'detail exposes host/live/past flags')
    assert(s?.creator?.id === globalThis.__aId, 'detail includes the host user')

    const attend = await A.post(`/api/sessions/${sid}/attendance`, { userId: globalThis.__bId, attended: true })
    assert(attend.status === 200 && attend.body?.ok, 'host can mark attendance', `status ${attend.status}`)
    const detail2 = await A.get(`/api/sessions/${sid}/attendance`)
    const r = (detail2.body?.data?.session?.rsvps ?? []).find((x) => x.userId === globalThis.__bId)
    assert(r?.attended === true, 'attendance flag persists')

    // Outsider cannot RSVP
    const outsiderRsvp = await C.post(`/api/sessions/${sid}/rsvp`, { status: 'GOING' })
    assert(outsiderRsvp.status === 403 || outsiderRsvp.body?.ok === false, 'outsider RSVP rejected', `status ${outsiderRsvp.status}`)
  }

  section('Focus logging & streaks')
  {
    const before = await A.get('/api/focus')
    const beforeStreak = before.body?.data?.streak?.current ?? 0

    const log = await A.post('/api/focus', {
      durationMinutes: 25,
      subject: 'E2E Subject',
      tasksCompleted: 1,
      startedAt: new Date(Date.now() - 25 * 60000).toISOString(),
    })
    assert(log.status === 200 && log.body?.data?.log?.id, 'focus log persists', `status ${log.status}`)
    assert(log.body?.data?.streak?.current >= Math.max(1, beforeStreak), 'streak maintained or advanced', `${beforeStreak} -> ${log.body?.data?.streak?.current}`)

    const invalid = await A.post('/api/focus', { durationMinutes: 999 })
    assert(invalid.status === 422, 'oversized focus duration rejected with 422', `status ${invalid.status}`)

    const after = await A.get('/api/focus')
    assert((after.body?.data?.todayMinutes ?? 0) >= 25, 'today minutes include the logged session', `today ${after.body?.data?.todayMinutes}`)
  }

  section('Resources: link share, bookmark, file upload + gating')
  {
    const link = await A.post('/api/resources', {
      title: 'E2E linked resource',
      url: 'https://example.com/lecture-notes',
      type: 'LINK',
      groupId: globalThis.__groupId,
      tags: [],
    })
    assert(link.status === 200 && link.body?.data?.resource?.id, 'link resource persists', `status ${link.status}`)
    const rid = link.body?.data?.resource?.id

    const bm = await A.post(`/api/resources/${rid}/bookmark`)
    assert(bm.status === 200 && bm.body?.data?.bookmarked === true, 'bookmark toggles on', `status ${bm.status}`)
    const saved = await A.get('/api/resources?saved=1')
    assert((saved.body?.data?.resources ?? []).some((x) => x.id === rid), 'bookmarked resource appears in saved view')

    // File upload: minimal valid PNG (magic bytes checked server-side)
    const png = Buffer.from(
      '89504e470d0a1a0a0000000d494844520000000100000001080600000'
        + '01f15c4890000000d49444154789c6360000002000154a24f4d0000000049454e44ae426082',
      'hex',
    )
    const form = new FormData()
    form.append('file', new Blob([png], { type: 'image/png' }), 'e2e-diagram.png')
    form.append('title', 'E2E uploaded file')
    form.append('groupId', globalThis.__groupId)
    const upRes = await A.raw('/api/uploads', { method: 'POST', body: form })
    const upBody = await upRes.json().catch(() => null)
    assert(upRes.status === 200 && upBody?.ok, 'file upload persists a resource', `status ${upRes.status} ${JSON.stringify(upBody?.error || '')}`)
    const fileUrl = upBody?.data?.resource?.url

    if (fileUrl) {
      const served = await B.raw(fileUrl)
      const buf = Buffer.from(await served.arrayBuffer())
      assert(served.status === 200, 'uploaded file is served to a group member', `status ${served.status}`)
      assert(buf.subarray(0, 4).toString('hex') === '89504e47', 'served bytes match the original file (PNG magic)')

      const outsiderFetch = await C.raw(fileUrl)
      assert(outsiderFetch.status === 403, 'file download forbidden for non-members', `status ${outsiderFetch.status}`)
    }

    // Validation: mismatched content (PNG bytes declared as PDF) must be rejected
    const badForm = new FormData()
    badForm.append('file', new Blob([png], { type: 'application/pdf' }), 'fake.pdf')
    const badUp = await A.raw('/api/uploads', { method: 'POST', body: badForm })
    assert(badUp.status === 415, 'content/extension mismatch rejected with 415', `status ${badUp.status}`)
  }

  section('Profile privacy enforcement')
  {
    const me = await B.get('/api/auth/me')
    globalThis.__bId = me.body?.data?.user?.id
    assert(Boolean(globalThis.__bId), 'session /me returns the user id')

    const pub = await C.get(`/api/profile?userId=${globalThis.__bId}`)
    assert(pub.status === 200 && pub.body?.data?.profile?.name === 'E2E member', 'public profile visible to logged-in users', `status ${pub.status}`)
    const payload = JSON.stringify(pub.body?.data) || ''
    assert(!payload.includes('@test.studygroup.dev'), 'profile payload does not leak email')

    // B locks profile to private; outsider must no longer see it
    const lock = await B.put('/api/profile', {
      name: 'E2E member',
      privacy: 'PRIVATE',
    })
    assert(lock.status === 200 && lock.body?.ok, 'user can set profile privacy', `status ${lock.status}`)
    const afterLock = await C.get(`/api/profile?userId=${globalThis.__bId}`)
    assert(afterLock.status === 403 && afterLock.body?.error === 'This profile is private', 'private profile blocked for outsiders with a clear message', `status ${afterLock.status}`)
    const selfView = await B.get(`/api/profile?userId=${globalThis.__bId}`)
    assert(selfView.status === 200 && selfView.body?.data?.isSelf === true, 'owner can still view own private profile', `status ${selfView.status}`)
    const unlock = await B.put('/api/profile', { name: 'E2E member', privacy: 'PUBLIC' })
    assert(unlock.status === 200, 'privacy restored', `status ${unlock.status}`)
  }

  section('Notifications: read state & category filter')
  {
    const list = await B.get('/api/notifications?pageSize=30')
    assert(list.status === 200 && list.body?.ok, 'notification list loads', `status ${list.status}`)
    const unreadBefore = list.body?.data?.unreadCount ?? 0
    assert(typeof unreadBefore === 'number', 'unread count is numeric')

    if (unreadBefore > 0) {
      const first = list.body.data.notifications.find((n) => !n.isRead)
      const mark = await B.patch('/api/notifications', { id: first.id })
      assert(mark.status === 200, 'single mark-read works', `status ${mark.status}`)
      const after = await B.get('/api/notifications?pageSize=30')
      assert(after.body?.data?.unreadCount === unreadBefore - 1, 'unread count decrements exactly once', `${unreadBefore} -> ${after.body?.data?.unreadCount}`)

      const markAll = await B.patch('/api/notifications', { all: true })
      assert(markAll.status === 200, 'mark-all works', `status ${markAll.status}`)
      const empty = await B.get('/api/notifications?pageSize=30')
      assert(empty.body?.data?.unreadCount === 0, 'mark-all zeroes unread count')
    }

    // Kind filter: only MENTION notifications returned
    await A.post(`/api/groups/${globalThis.__groupId}/messages`, { content: 'Second ping @E2E member' })
    const filtered = await B.get('/api/notifications?kinds=MENTION&pageSize=30')
    assert(filtered.status === 200 && filtered.body?.ok, 'category filter endpoint works', `status ${filtered.status}`)
    const kinds = [...new Set((filtered.body?.data?.notifications ?? []).map((n) => n.kind))]
    assert(kinds.every((k) => k === 'MENTION'), 'kind filter returns only requested kinds', kinds.join(',') || 'none')
  }

  section('Group administration & role gates')
  {
    const gid = globalThis.__groupId
    const promote = await A.patch(`/api/groups/${gid}/members`, { userId: globalThis.__bId, role: 'ADMIN' })
    assert(promote.status === 200 && promote.body?.ok, 'owner promotes member to admin', `status ${promote.status} ${JSON.stringify(promote.body || {})}`)

    const esc = await B.patch(`/api/groups/${gid}/members`, { userId: globalThis.__bId, role: 'OWNER' })
    assert(esc.status === 422 || esc.status === 403, 'admin cannot set role to OWNER (schema rejects OWNER)', `status ${esc.status}`)

    // Member B (ADMIN) cannot demote the owner
    const demoteOwner = await B.patch(`/api/groups/${gid}/members`, { userId: globalThis.__aId, role: 'MEMBER' })
    assert(demoteOwner.status === 403 || demoteOwner.body?.ok === false, 'admin cannot change the owner role', `status ${demoteOwner.status}`)

    const outsiderPatch = await C.patch(`/api/groups/${gid}`, { description: 'vandalized' })
    assert(outsiderPatch.status === 403 || outsiderPatch.body?.ok === false, 'outsider cannot edit group settings', `status ${outsiderPatch.status}`)

    const anon = makeClient()
    const anonMe = await anon.get('/api/auth/me')
    assert(anonMe.status === 401, 'fresh client is unauthenticated (401)', `status ${anonMe.status}`)
  }

  section('Onboarding & logout')
  {
    const status = await C.get('/api/onboarding')
    assert(status.status === 200 && typeof status.body?.data?.completed === 'boolean', 'onboarding status endpoint works', `status ${status.status}`)

    const done = await C.post('/api/onboarding', {
      university: 'E2E University',
      course: 'Testing',
      semester: '1',
      subjects: ['Testing'],
      goals: ['DAILY_CONSISTENCY'],
    })
    assert(done.status === 200 && done.body?.data?.completed === true, 'onboarding completion persists', `status ${done.status}`)
    const after = await C.get('/api/onboarding')
    assert(after.body?.data?.completed === true, 'onboarding completed flag flips')

    const out = await C.post('/api/auth/logout', {})
    assert(out.status === 200 && out.body?.data?.signedOut === true, 'logout succeeds', `status ${out.status}`)
    const afterOut = await C.get('/api/auth/me')
    assert(afterOut.status === 401, 'session invalidated after logout', `status ${afterOut.status}`)
  }

  section('Notes: version history, autosave-equivalent PUT, restore')
  {
    // Create a note in the group
    const note = await A.post(`/api/notes?groupId=${globalThis.__groupId}`, {
      title: 'E2E versioned note',
      content: 'Version one content',
      kind: 'LECTURE',
      tags: ['e2e'],
    })
    const nid = note.body?.data?.note?.id
    assert(note.status === 200 && nid, 'note creation works', `status ${note.status}`)

    // Two successive edits → snapshot versions server-side
    const edit1 = await B.put(`/api/notes/${nid}`, { title: 'E2E versioned note', content: 'Version two content', kind: 'LECTURE', tags: ['e2e'] })
    assert(edit1.status === 200 && edit1.body?.data?.note?.version === 2, 'first edit bumps to version 2', `status ${edit1.status} v=${edit1.body?.data?.note?.version}`)
    const edit2 = await A.put(`/api/notes/${nid}`, { title: 'E2E versioned note', content: 'Version three content', kind: 'LECTURE', tags: ['e2e'] })
    assert(edit2.status === 200 && edit2.body?.data?.note?.version === 3, 'second edit bumps to version 3')

    // History: exactly two snapshots (v1, v2), newest first
    const history = await A.get(`/api/notes/${nid}?versions=1`)
    const versions = history.body?.data?.versions ?? []
    assert(history.status === 200 && versions.length === 2, 'version history returns 2 snapshots', `got ${versions.length}`)
    assert(versions[0]?.version === 2 && versions[0]?.content === 'Version two content', 'newest snapshot is v2 with its own content')
    assert(versions[0]?.editor?.name, 'snapshot records who edited')

    // Member gating: outsider cannot read history
    const outsiderHistory = await C.get(`/api/notes/${nid}?versions=1`)
    assert(outsiderHistory.status === 401 || outsiderHistory.status === 403, 'note history blocked for non-members', `status ${outsiderHistory.status}`)

    // Restore v2 → note content reverts but becomes v4; history grows to 3
    const restore = await A.post(`/api/notes/${nid}`, { versionId: versions[0].id })
    assert(restore.status === 200 && restore.body?.data?.note?.content === 'Version two content', 'restore applies the old content', `status ${restore.status}`)
    assert(restore.body?.data?.note?.version === 4, 'restore creates a NEW version (4), history preserved')
    const historyAfter = await A.get(`/api/notes/${nid}?versions=1`)
    assert((historyAfter.body?.data?.versions ?? []).length === 3, 'history grows to 3 snapshots after restore')
  }

  section('Dashboard aggregate: today timeline shape')
  {
    const dash = await A.get('/api/dashboard')
    assert(dash.status === 200 && dash.body?.ok, 'dashboard aggregate loads')
    const timeline = dash.body?.data?.todayTimeline
    assert(Array.isArray(timeline), 'todayTimeline is an array')
    if (timeline.length > 0) {
      const valid = timeline.every((i) => ['task', 'session', 'focus'].includes(i.kind))
      assert(valid, 'every timeline item has a known kind', timeline.map((i) => i.kind).join(','))
      const focus = timeline.find((i) => i.kind === 'focus')
      if (focus) assert(typeof focus.recommendedMinutes === 'number' && focus.recommendedMinutes > 0, 'focus recommendation carries a positive duration')
    }
  }

  section('Security regressions: privacy-aware search, resource counter IDOR, upload key handling')
  {
    // Private profiles must never surface in people search
    await B.put('/api/profile', { name: 'E2E member', privacy: 'PRIVATE' })
    const privSearch = await C.get(`/api/search?q=${encodeURIComponent('E2E member')}`)
    const privPeople = privSearch.body?.data?.people ?? []
    assert(
      privPeople.every((p) => p.id !== globalThis.__bId),
      'private profile NOT returned in people search (privacy-aware)',
      `got ${privPeople.length} people`,
    )
    await B.put('/api/profile', { name: 'E2E member', privacy: 'PUBLIC' })

    // Resource view/download counters: outsiders must not mutate
    const resList = await A.get(`/api/resources?groupId=${globalThis.__groupId}&pageSize=6`)
    const counterTarget = (resList.body?.data?.resources ?? [])[0]
    if (counterTarget) {
      const before = counterTarget.views ?? 0
      const idor = await C.patch(`/api/resources/${counterTarget.id}?track=view`)
      assert(idor.status === 401 || idor.status === 403, 'resource counter PATCH forbidden for outsiders (IDOR fixed)', `status ${idor.status}`)
      const memberPatch = await A.patch(`/api/resources/${counterTarget.id}?track=view`)
      assert(memberPatch.status === 200 && memberPatch.body?.data?.resource?.views === before + 1, 'resource counter PATCH works for members')
    }

    // Malformed percent-encoding on the file route must never 5xx (Next may 400 before routing)
    const badKey = await A.raw('/api/uploads/uploads/%ff%fe-broken.png')
    assert(badKey.status < 500, 'malformed upload key never causes a server error', `status ${badKey.status}`)
  }

  section('Cleanup')
  {
    if (globalThis.__groupId) {
      const del = await A.del(`/api/groups/${globalThis.__groupId}`)
      assert(del.status === 200 || del.status === 403, 'owner deletes test group', `status ${del.status}`)
    }
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`)
  console.log(`E2E RESULT: ${passed} passed, ${failed} failed`)
  if (failures.length) {
    console.log('\nFailures:')
    failures.forEach((f) => console.log(`  ✗ ${f}`))
  }
  process.exit(failed ? 1 : 0)
}

main().catch((err) => {
  console.error('E2E runner crashed:', err)
  process.exit(1)
})
