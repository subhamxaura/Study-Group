import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const SUBJECTS = ['Mathematics', 'Physics', 'Computer Science', 'Chemistry', 'Economics']

async function main() {
  console.log('Seeding Study-Group demo data…')

  const passwordHash = await bcrypt.hash('password123', 12)

  const users = await Promise.all(
    [
      { email: 'subham@example.com', name: 'Subham Xaura', university: 'Tribhuvan University', course: 'BSc CS', semester: '4' },
      { email: 'alex@example.com', name: 'Alex Morgan', university: 'Tribhuvan University', course: 'BSc CS', semester: '4' },
      { email: 'jordan@example.com', name: 'Jordan Lee', university: 'TU', course: 'Physics', semester: '6' },
      { email: 'taylor@example.com', name: 'Taylor Swift', university: 'Kathmandu University', course: 'Mathematics', semester: '2' },
      { email: 'casey@example.com', name: 'Casey Kim', university: 'Kathmandu University', course: 'Economics', semester: '8' },
    ].map((u) =>
      prisma.user.upsert({
        where: { email: u.email },
        update: {},
        create: { ...u, passwordHash, subjects: [], interests: [] },
      })
    )
  )
  const [subham, alex, jordan, taylor, casey] = users

  const groupDefs = [
    { name: 'Advanced Mathematics', subject: 'Mathematics', description: 'Deep dive into calculus, linear algebra and differential equations. Weekly problem sets and exam prep.', difficulty: 'advanced', university: 'Tribhuvan University', owner: taylor, members: [subham, alex, jordan], tags: ['calculus', 'problem-sets'] },
    { name: 'Physics Study Circle', subject: 'Physics', description: 'Classical mechanics, thermodynamics and modern physics through collaborative problem-solving.', difficulty: 'intermediate', university: 'TU', owner: jordan, members: [subham, casey], tags: ['mechanics', 'thermodynamics'] },
    { name: 'Computer Science Hub', subject: 'Computer Science', description: 'Algorithms, data structures, system design and interview prep. From beginner to advanced topics.', difficulty: 'intermediate', university: 'Tribhuvan University', owner: subham, members: [alex, casey], tags: ['dsa', 'interviews'] },
    { name: 'Chemistry Lab Partners', subject: 'Chemistry', description: 'Organic and inorganic chemistry review, lab preparation and research collaboration.', difficulty: 'beginner', university: 'Kathmandu University', owner: casey, members: [], tags: ['organic', 'labs'] },
  ]

  const groups = []
  for (const def of groupDefs) {
    let group = await prisma.group.findFirst({ where: { name: def.name } })
    if (!group) {
      group = await prisma.group.create({
        data: {
          name: def.name,
          description: def.description,
          subject: def.subject,
          university: def.university,
          difficulty: def.difficulty,
          tags: def.tags,
          isPublic: true,
          ownerId: def.owner.id,
          members: {
            create: [
              { userId: def.owner.id, role: 'OWNER' },
              ...def.members.map((m) => ({ userId: m.id, role: 'MEMBER' as const })),
            ],
          },
        },
      })
    }
    groups.push(group)
  }
  const [math, physics, cs] = groups

  // Messages
  const msgs = [
    { group: math, user: alex, content: 'Has anyone started on the differential equations homework? I am stuck on problem 4.' },
    { group: math, user: taylor, content: 'Problem 4 uses separation of variables — get all y terms on one side and x terms on the other before integrating.' },
    { group: math, user: subham, content: 'I can share my notes from the lecture on that topic after class today.' },
    { group: cs, user: subham, content: 'Reminder: mock interview session on Saturday. Sign up on the calendar!' },
    { group: cs, user: alex, content: 'Just uploaded my DSA cheat sheet to resources — graphs section is the one most people struggle with.' },
  ]
  for (const m of msgs) {
    await prisma.message.create({ data: { groupId: m.group.id, userId: m.user.id, content: m.content } })
  }

  // Tasks
  const tomorrow = new Date(Date.now() + 864e5)
  const nextWeek = new Date(Date.now() + 7 * 864e5)
  await prisma.task.createMany({
    data: [
      { title: 'Problem set — Chapter 5 (ODEs)', groupId: math.id, creatorId: taylor.id, assigneeId: subham.id, dueDate: tomorrow, priority: 'HIGH', subject: 'Mathematics' },
      { title: 'Read DAA chapter on graph traversal', groupId: cs.id, creatorId: subham.id, assigneeId: alex.id, dueDate: nextWeek, priority: 'MEDIUM', subject: 'Computer Science' },
      { title: 'Lab report: titration experiment', groupId: groups[3].id, creatorId: casey.id, dueDate: nextWeek, priority: 'LOW', subject: 'Chemistry' },
      { title: 'Personal: review lecture 12 recording', creatorId: subham.id, dueDate: tomorrow, priority: 'MEDIUM' },
    ],
  })

  // Sessions (upcoming)
  const now = Date.now()
  await prisma.studySession.createMany({
    data: [
      { groupId: math.id, title: 'Linear Algebra Review', subject: 'Mathematics', kind: 'REVISION', startsAt: new Date(now + 26 * 3600e3), endsAt: new Date(now + 28 * 3600e3), location: 'Library Room 204', creatorId: taylor.id, maxParticipants: 8 },
      { groupId: cs.id, title: 'Mock Interviews — Graphs & Trees', subject: 'Computer Science', kind: 'PROBLEM_SOLVING', startsAt: new Date(now + 3 * 864e5), endsAt: new Date(now + 3 * 864e5 + 2 * 3600e3), isOnline: true, location: 'Meet link in chat', creatorId: subham.id, maxParticipants: 6 },
      { groupId: physics.id, title: 'Thermodynamics Problem Marathon', subject: 'Physics', kind: 'PROBLEM_SOLVING', startsAt: new Date(now + 5 * 864e5), endsAt: new Date(now + 5 * 864e5 + 3 * 3600e3), location: 'Physics Building 101', creatorId: jordan.id },
    ],
  })
  const firstSession = await prisma.studySession.findFirst({ where: { title: 'Linear Algebra Review' } })
  await prisma.sessionRSVP.createMany({
    data: [
      { sessionId: firstSession!.id, userId: subham.id, status: 'GOING' },
      { sessionId: firstSession!.id, userId: alex.id, status: 'MAYBE' },
      { sessionId: firstSession!.id, userId: taylor.id, status: 'GOING' },
    ],
  })

  // Calendar events
  await prisma.calendarEvent.createMany({
    data: [
      { title: 'Midterm — Differential Equations', kind: 'EXAM', startsAt: new Date(now + 10 * 864e5), endsAt: new Date(now + 10 * 864e5 + 2 * 3600e3), location: 'Exam Hall B', creatorId: subham.id, groupId: math.id },
      { title: 'Assignment deadline: DAA Assignment 3', kind: 'ASSIGNMENT_DEADLINE', startsAt: new Date(now + 6 * 864e5), endsAt: new Date(now + 6 * 864e5 + 1800e3), creatorId: subham.id, groupId: cs.id },
    ],
  })

  // Resources
  await prisma.resource.createMany({
    data: [
      { groupId: cs.id, uploaderId: alex.id, title: 'DSA Graph Algorithms Cheat Sheet', type: 'PDF', url: 'https://example.com/graphs-cheatsheet.pdf', description: 'BFS, DFS, Dijkstra and topological sort in one page.', tags: ['dsa', 'graphs'], views: 42, downloads: 18 },
      { groupId: math.id, uploaderId: subham.id, title: 'ODE Lecture Notes — Week 8', type: 'NOTE', url: 'https://example.com/ode-week8.pdf', description: 'Separation of variables, integrating factors, exact equations.', tags: ['calculus', 'ode'], views: 27, downloads: 11 },
      { groupId: physics.id, uploaderId: jordan.id, title: 'Khan Academy — Thermodynamics playlist', type: 'VIDEO', url: 'https://khanacademy.org/science/physics/thermodynamics', tags: ['video', 'thermodynamics'], views: 65, downloads: 0 },
    ],
  })

  // Notes
  await prisma.note.createMany({
    data: [
      { groupId: math.id, authorId: taylor.id, title: 'Integrating Factors — worked examples', kind: 'PROBLEM_SOLUTION', content: '# Integrating factors\n\n1. Write in standard form: y\' + P(x)y = Q(x)\n2. Compute mu(x) = e^{∫P dx}\n3. Multiply through and recognize the product rule…', tags: ['ode', 'week-8'] },
      { groupId: cs.id, authorId: subham.id, title: 'Big-O quick reference', kind: 'CHEAT_SHEET', content: '# Big-O of common operations\n\n- Array access: O(1)\n- Binary search: O(log n)\n- BST insert (balanced): O(log n)\n- Hash lookup (avg): O(1)\n- BFS/DFS: O(V+E)\n- Dijkstra (binary heap): O((V+E) log V)', tags: ['dsa'] },
    ],
  })

  // Focus logs (last 7 days, varied) + streak for subham
  for (let i = 0; i < 7; i++) {
    const day = new Date(now - i * 864e5)
    day.setHours(15, 0, 0, 0)
    if (i === 3) continue // gap for realism
    await prisma.studySessionLog.create({
      data: {
        userId: subham.id,
        subject: SUBJECTS[i % SUBJECTS.length],
        startedAt: day,
        endedAt: new Date(day.getTime() + (25 + (i % 3) * 25) * 60000),
        durationMinutes: 25 + (i % 3) * 25,
        tasksCompleted: i % 2,
      },
    })
  }
  await prisma.studyStreak.upsert({
    where: { userId: subham.id },
    update: { current: 4, longest: 6, lastStudyDate: new Date(now - 864e5) },
    create: { userId: subham.id, current: 4, longest: 6, lastStudyDate: new Date(now - 864e5) },
  })

  // Notifications for subham
  await prisma.notification.createMany({
    data: [
      { userId: subham.id, kind: 'SESSION_REMINDER', title: 'Linear Algebra Review starts tomorrow', body: 'You RSVPed Going. Library Room 204.', link: '/calendar' },
      { userId: subham.id, kind: 'TASK_ASSIGNED', title: 'New task: Problem set — Chapter 5 (ODEs)', body: 'Taylor assigned you a task in Advanced Mathematics.', link: '/tasks' },
      { userId: subham.id, kind: 'RESOURCE_SHARED', title: 'New resource: DSA Graph Algorithms Cheat Sheet', body: 'Alex Morgan shared a resource in Computer Science Hub.', link: '/resources', isRead: true },
    ],
  })

  console.log('Seed complete.')
  console.log('Demo logins (password: password123):')
  users.forEach((u) => console.log(`  ${u.email}`))
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
