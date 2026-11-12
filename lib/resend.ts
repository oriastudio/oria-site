// The one place the site reads its Resend credentials. Every call to Resend
// goes through `resendKey()`, so a key pasted with a line break or a stray
// character fails here, by name, instead of inside fetch as a bare TypeError.
//
// No import here: tests/resend.test.ts runs this file directly under Node.

export type KeyCheck =
  | { ok: true; key: string }
  | { ok: false; problem: 'missing' | 'malformed'; detail: string }

// Resend keys are `re_` followed by letters, digits and underscores.
const KEY_SHAPE = /^re_[A-Za-z0-9_]{8,}$/

export function resendKey(raw: string | undefined = process.env.RESEND_API_KEY): KeyCheck {
  // Whitespace never belongs in a key, but a paste into a dashboard can carry
  // a line break into the middle of one. Inside an Authorization header that
  // makes fetch throw before any request leaves.
  const key = (raw ?? '').replace(/\s+/g, '')
  if (!key) return { ok: false, problem: 'missing', detail: 'RESEND_API_KEY is not set' }
  if (!KEY_SHAPE.test(key)) {
    return { ok: false, problem: 'malformed', detail: describeShape(key) }
  }
  return { ok: true, key }
}

// What is wrong with a key, without a single character of it.
function describeShape(key: string): string {
  const parts = [`RESEND_API_KEY is not a Resend key (length ${key.length}`]
  if (!key.startsWith('re_')) parts.push('no re_ prefix')
  if (/[^\x20-\x7e]/.test(key)) parts.push('non-ASCII characters')
  else if (/[^A-Za-z0-9_]/.test(key)) parts.push('punctuation')
  return parts.join(', ') + ')'
}

// A thrown fetch error, named closely enough to act on and never with its
// message: an invalid-header message repeats the header, which holds the key.
export function fetchFailure(err: unknown): string {
  if (!(err instanceof Error)) return 'unknown error'
  if (/^Headers\./.test(err.message)) return `${err.name}: invalid header value`
  const cause = (err as { cause?: { code?: unknown } }).cause
  const code = typeof cause?.code === 'string' ? cause.code : ''
  return code ? `${err.name}: ${code}` : err.name
}
