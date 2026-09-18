// Shared mention parsing — used by the server (validation + notification fan-out)
// and the client (rendering `@Name` as an interactive token).
//
// Display names contain spaces ("E2E member", "Subham Xaura"), so a single regex
// capture cannot know where a name ends. Resolution works in two steps:
//   1. find every `@` candidate (a run of non-terminator characters)
//   2. from each candidate, take the LONGEST member name that the text starting
//      right after `@` begins with (case-insensitive). Longest wins so
//      "@E2E member" prefers the full name over a hypothetical "@E2E".
//
// Punctuation (`. , ! ? : ; ) ] }`) terminates a candidate; whitespace does NOT,
// because names contain spaces — the prefix match decides the extent.

const CANDIDATE_RE = /@([^\s,.!?:;)\]}]{1,40})/g

export type MentionToken = { type: 'text'; value: string } | { type: 'mention'; value: string }

/**
 * Resolve mentions in `content` against the actual member list.
 * Returns de-duplicated members whose names appear as `@name` (case-insensitive).
 */
export function matchMentions(
  content: string,
  members: Array<{ id: string; name: string }>,
): Array<{ id: string; name: string }> {
  const byLower = new Map(members.map((m) => [m.name.toLowerCase(), m]))
  // Longest first so full names win over shorter prefixes.
  const names = [...byLower.keys()].sort((a, b) => b.length - a.length)
  const seen = new Set<string>()
  const out: Array<{ id: string; name: string }> = []
  for (const match of content.matchAll(CANDIDATE_RE)) {
    const start = (match.index ?? 0) + 1 // skip the '@'
    const rest = content.slice(start).toLowerCase()
    for (const name of names) {
      if (rest.startsWith(name)) {
        const member = byLower.get(name)!
        if (!seen.has(member.id)) {
          seen.add(member.id)
          out.push({ id: member.id, name: member.name })
        }
        break // longest name matched — do not also match a shorter prefix
      }
    }
  }
  return out
}

/**
 * Tokenize content for rendering. A segment renders as a `mention` token when it
 * matches a member name under the same longest-prefix rule used for validation,
 * so what the client highlights is exactly what the server resolves.
 */
export function tokenizeMentions(
  content: string,
  members: Array<{ id: string; name: string }>,
): MentionToken[] {
  const byLower = new Map(members.map((m) => [m.name.toLowerCase(), m]))
  const names = [...byLower.keys()].sort((a, b) => b.length - a.length)
  const lowerContent = content.toLowerCase()

  const tokens: MentionToken[] = []
  let lastIndex = 0
  for (const match of content.matchAll(CANDIDATE_RE)) {
    const at = match.index ?? 0
    const start = at + 1
    let matchedName: string | null = null
    for (const name of names) {
      if (lowerContent.startsWith(name, start)) {
        matchedName = byLower.get(name)!.name
        break
      }
    }
    if (!matchedName) continue
    if (at > lastIndex) tokens.push({ type: 'text', value: content.slice(lastIndex, at) })
    tokens.push({ type: 'mention', value: matchedName })
    lastIndex = start + matchedName.length
  }
  if (lastIndex < content.length) tokens.push({ type: 'text', value: content.slice(lastIndex) })
  return tokens
}
