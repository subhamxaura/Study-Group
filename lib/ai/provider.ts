import 'server-only'

export interface AIProvider {
  name: string
  chat(messages: { role: string; content: string }[]): Promise<string>
}

/**
 * Classified AI failure. Carries an HTTP status and a user-safe message —
 * provider internals (bodies, stack traces, keys) never leave the server.
 */
export class AIError extends Error {
  status: number
  retryAfter?: number
  constructor(status: number, message: string, retryAfter?: number) {
    super(message)
    this.name = 'AIError'
    this.status = status
    this.retryAfter = retryAfter
  }
}

export function isAIError(err: unknown): err is AIError {
  return err instanceof AIError
}

// Paid-provider call budget: abort before serverless limits bite.
const PROVIDER_TIMEOUT_MS = 45_000
const MAX_OUTPUT_TOKENS = 1500

class OpenAIProvider implements AIProvider {
  name = 'openai'
  async chat(messages: { role: string; content: string }[]): Promise<string> {
    const key = process.env.OPENAI_API_KEY
    if (!key) {
      throw new AIError(503, 'StudyMate is not configured on this deployment. Set OPENAI_API_KEY to enable it.')
    }
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), PROVIDER_TIMEOUT_MS)
    let res: Response
    try {
      res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model, messages, temperature: 0.4, max_tokens: MAX_OUTPUT_TOKENS }),
        signal: ctrl.signal,
      })
    } catch (err) {
      // Timeout / network failure — never leak the underlying error text.
      throw new AIError(504, 'StudyMate timed out. Please try again in a moment.')
    } finally {
      clearTimeout(timer)
    }
    if (res.status === 429) {
      const retryAfter = Number(res.headers.get('retry-after')) || 30
      throw new AIError(429, 'StudyMate is busy right now. Please wait a moment and try again.', retryAfter)
    }
    if (res.status === 401 || res.status === 403) {
      // Key invalid/revoked — a server misconfiguration, reported honestly.
      throw new AIError(503, 'StudyMate is misconfigured on this deployment. The administrator should check the API key.')
    }
    if (!res.ok) {
      throw new AIError(502, 'The AI provider failed. Please try again in a moment.')
    }
    const json = (await res.json().catch(() => null)) as { choices?: { message?: { content?: string } }[] } | null
    const content = json?.choices?.[0]?.message?.content?.trim()
    if (!content) throw new AIError(502, 'The AI provider returned an empty response. Please try again.')
    return content
  }
}

class GeminiProvider implements AIProvider {
  name = 'gemini'
  async chat(messages: { role: string; content: string }[]): Promise<string> {
    const key = process.env.GEMINI_API_KEY
    if (!key) {
      throw new AIError(503, 'StudyMate is not configured on this deployment. Set GEMINI_API_KEY to enable it.')
    }
    const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash'
    const systemParts: { text: string }[] = []
    const contents: { role: string; parts: { text: string }[] }[] = []

    for (const m of messages) {
      if (m.role === 'system') {
        systemParts.push({ text: m.content })
      } else {
        contents.push({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })
      }
    }

    const payload: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
      },
    }
    if (systemParts.length > 0) {
      payload.systemInstruction = { parts: systemParts }
    }

    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), PROVIDER_TIMEOUT_MS)
    let res: Response
    try {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: ctrl.signal,
        },
      )
    } catch {
      throw new AIError(504, 'StudyMate timed out. Please try again in a moment.')
    } finally {
      clearTimeout(timer)
    }

    if (res.status === 429) {
      const retryAfter = Number(res.headers.get('retry-after')) || 30
      throw new AIError(429, 'StudyMate is busy right now. Please wait a moment and try again.', retryAfter)
    }
    if (res.status === 400 || res.status === 401 || res.status === 403) {
      throw new AIError(503, 'StudyMate is misconfigured on this deployment. The administrator should check the Gemini API key.')
    }
    if (!res.ok) {
      throw new AIError(502, 'The AI provider failed. Please try again in a moment.')
    }

    const json = (await res.json().catch(() => null)) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[]
    } | null
    const content = json?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('').trim()
    if (!content) throw new AIError(502, 'The AI provider returned an empty response. Please try again.')
    return content
  }
}

// Registry — swap providers without touching call sites.
const providers: Record<string, () => AIProvider> = {
  openai: () => new OpenAIProvider(),
  gemini: () => new GeminiProvider(),
}

export function getProviderName(): 'gemini' | 'openai' {
  if (process.env.AI_PROVIDER === 'gemini' || (!process.env.OPENAI_API_KEY && process.env.GEMINI_API_KEY)) {
    return 'gemini'
  }
  return 'openai'
}

export function getProvider(): AIProvider | null {
  const name = getProviderName()
  const hasKey = name === 'gemini' ? Boolean(process.env.GEMINI_API_KEY) : Boolean(process.env.OPENAI_API_KEY)
  if (!hasKey) return null
  const factory = providers[name]
  return factory ? factory() : null
}

export function isAIConfigured(): boolean {
  const name = getProviderName()
  return name === 'gemini' ? Boolean(process.env.GEMINI_API_KEY) : Boolean(process.env.OPENAI_API_KEY)
}

/**
 * Ask the provider for strict JSON and validate it. Strips code fences the
 * model sometimes wraps around the payload. Throws AIError(502) when the
 * model does not return conforming JSON — callers surface a friendly message.
 */
export async function chatJson<T>(
  provider: AIProvider,
  messages: { role: string; content: string }[],
  parse: (raw: unknown) => T,
): Promise<T> {
  const reply = await provider.chat([
    ...messages.slice(0, -1),
    {
      role: messages[messages.length - 1].role,
      content: `${messages[messages.length - 1].content}\n\nRespond with JSON only. No markdown fences, no commentary.`,
    },
  ])
  const cleaned = reply.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
  let raw: unknown
  try {
    raw = JSON.parse(cleaned)
  } catch {
    throw new AIError(502, 'The AI provider returned an unreadable response. Please try again.')
  }
  try {
    return parse(raw)
  } catch {
    throw new AIError(502, 'The AI provider returned an invalid response. Please try again.')
  }
}

export const STUDYMATE_SYSTEM_PROMPT = `You are StudyMate, a study assistant inside the Study-Group app.
Your job is to help students learn — not to do their work for them.
- Explain concepts clearly, with small examples.
- When asked for quizzes or flashcards, format them readably (Q/A lines, numbered).
- When asked to summarize, produce tight bullet points.
- Keep answers focused and student-friendly. Use markdown-style plain text.
- The STUDY CONTEXT block (when present) is the user's real data — use it for
  personal answers, and say explicitly when there is not enough data.
- Never invent facts about the user's private data beyond the context provided.`
