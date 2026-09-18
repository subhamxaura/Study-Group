import 'server-only'

export interface AIProvider {
  name: string
  chat(messages: { role: string; content: string }[]): Promise<string>
}

class SetupRequiredError extends Error {
  constructor() {
    super('AI is not configured. Add OPENAI_API_KEY to your environment to enable StudyMate.')
  }
}

class OpenAIProvider implements AIProvider {
  name = 'openai'
  async chat(messages: { role: string; content: string }[]): Promise<string> {
    const key = process.env.OPENAI_API_KEY
    if (!key) throw new SetupRequiredError()
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, messages, temperature: 0.4, max_tokens: 1200 }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`OpenAI API error ${res.status}: ${body.slice(0, 200)}`)
    }
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] }
    return json.choices?.[0]?.message?.content?.trim() || 'The model returned an empty response.'
  }
}

// Registry — swap providers without touching call sites.
const providers: Record<string, () => AIProvider> = {
  openai: () => new OpenAIProvider(),
  // anthropic: () => new AnthropicProvider(), // add when needed
}

export function getProvider(): AIProvider | null {
  const name = process.env.AI_PROVIDER || 'openai'
  const hasKey = Boolean(process.env.OPENAI_API_KEY)
  if (!hasKey) return null
  const factory = providers[name]
  return factory ? factory() : null
}

export function isAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY)
}

export const STUDYMATE_SYSTEM_PROMPT = `You are StudyMate, a study assistant inside the Study-Group app.
Your job is to help students learn — not to do their work for them.
- Explain concepts clearly, with small examples.
- When asked for quizzes or flashcards, format them readably (Q/A lines, numbered).
- When asked to summarize, produce tight bullet points.
- Keep answers focused and student-friendly. Use markdown-style plain text.
- Never invent facts about the user's private data beyond the context provided.`
