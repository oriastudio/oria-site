import { NextResponse } from 'next/server'
import { allow } from '@/lib/rate-limit'
import { fetchFailure, resendKey } from '@/lib/resend'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TO = process.env.WAITLIST_TO || 'hello@oriastudio.ai'
const FROM = process.env.WAITLIST_FROM || 'Oria Waitlist <waitlist@oriastudio.ai>'
// The Resend segment that holds the waitlist. Once it is set, each sign-up is
// kept as a Resend contact in it (the list the owner's dashboard reads and a
// broadcast goes to) instead of an email to hello@. Unset, sign-ups arrive by
// email as before.
const SEGMENT = process.env.RESEND_WAITLIST_SEGMENT_ID?.trim() || ''

// Conservative, single-@ address check. Length-capped before the regex so a
// pathological input can't spend time in the matcher.
const EMAIL = /^[^\s@,;:<>"']{1,64}@[^\s@,;:<>"']{1,190}\.[A-Za-z]{2,24}$/
const MIN_FILL_MS = 400

function bad(status: number, error: string, headers?: HeadersInit) {
  return NextResponse.json({ error }, { status, headers })
}

function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0]!.trim()
  return req.headers.get('x-real-ip')?.trim() || 'unknown'
}

// Health check for the uptime monitor: can a sign-up be kept right now? It
// proves the key is well formed and accepted, and that the segment exists,
// with one read-only Resend call, cached so a burst of checks costs one call.
// It answers in a word; the reason goes to the logs.
const HEALTH_TTL_MS = 5 * 60 * 1000
type Health = { status: number; body: { ok: boolean; problem?: string } }
// The promise, not its result, is cached, so checks arriving together share
// one Resend call instead of each spending the team's rate limit.
let health: { at: number; result: Promise<Health> } | null = null

export async function GET() {
  const now = Date.now()
  if (!health || now - health.at > HEALTH_TTL_MS) {
    health = { at: now, result: checkResend() }
  }
  const { status, body } = await health.result
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

async function checkResend(): Promise<Health> {
  const checked = resendKey()
  if (!checked.ok) {
    console.error(`[waitlist health] ${checked.detail}`)
    return { status: 503, body: { ok: false, problem: 'key' } }
  }
  // With no segment, sign-ups go by email, which a sending-only key can do but
  // a read cannot: Resend answering `restricted_api_key` proves the key is
  // real, which is all email mode needs.
  const url = SEGMENT
    ? `https://api.resend.com/segments/${encodeURIComponent(SEGMENT)}`
    : 'https://api.resend.com/domains'
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${checked.key}` } })
    if (res.ok) return { status: 200, body: { ok: true } }
    const name = await errorName(res)
    if (!SEGMENT && name === 'restricted_api_key') return { status: 200, body: { ok: true } }
    console.error('[waitlist health] Resend refused the check:', res.status, name)
    const problem = res.status === 401 || res.status === 403 ? 'key' : SEGMENT ? 'segment' : 'resend'
    return { status: 503, body: { ok: false, problem } }
  } catch (err) {
    console.error('[waitlist health] Resend unreachable:', fetchFailure(err))
    return { status: 503, body: { ok: false, problem: 'resend' } }
  }
}

export async function POST(req: Request) {
  let body: { email?: unknown; company?: unknown; elapsed?: unknown }
  try {
    body = await req.json()
  } catch {
    return bad(400, 'We couldn’t read that request.')
  }

  // Honeypot and impossible-speed submissions get a clean 200 with no send,
  // so a bot learns nothing from the response.
  const trap = typeof body.company === 'string' ? body.company.trim() : ''
  const elapsed = typeof body.elapsed === 'number' ? body.elapsed : Number.MAX_SAFE_INTEGER
  if (trap.length > 0 || elapsed < MIN_FILL_MS) {
    return NextResponse.json({ ok: true })
  }

  const email = typeof body.email === 'string' ? body.email.trim() : ''
  if (email.length > 254 || !EMAIL.test(email)) {
    return bad(400, 'That address doesn’t look complete — mind checking it?')
  }

  const gate = allow(clientIp(req))
  if (!gate.ok) {
    return bad(429, 'That’s a few too many tries. Give it a few minutes.', {
      'Retry-After': String(gate.retryAfter),
    })
  }

  const checked = resendKey()
  if (!checked.ok) {
    // Never the address: logs are kept by Vercel and read by more people than the list is.
    console.error(`[waitlist] ${checked.detail}, so a signup was not delivered`)
    return bad(503, 'The waitlist isn’t accepting signups just yet. Try again shortly.')
  }
  const key = checked.key

  if (SEGMENT) {
    try {
      const res = await fetch('https://api.resend.com/contacts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, unsubscribed: false, segments: [{ id: SEGMENT }] }),
      })
      if (res.ok) return NextResponse.json({ ok: true })
      // Fall through to the email, so a sign-up is never lost to a contact error.
      console.error('[waitlist] Resend did not add the contact:', res.status, await errorName(res))
    } catch (err) {
      console.error('[waitlist] adding the contact failed:', fetchFailure(err))
    }
  }

  const when = new Date().toISOString()
  const country = req.headers.get('x-vercel-ip-country') || '—'

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: [TO],
        reply_to: [email],
        subject: `Oria waitlist — ${email}`,
        text: [
          'New waitlist signup',
          '',
          `Email:   ${email}`,
          `When:    ${when}`,
          `Country: ${country}`,
          '',
          'Reply to this message to reach them directly.',
        ].join('\n'),
        html: `<div style="font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;background:#1B1713;color:#FAF7F0;padding:28px;border-radius:16px">
  <p style="margin:0 0 18px;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#F0D07B">Oria &middot; waitlist</p>
  <p style="margin:0 0 14px;font-size:18px;font-weight:600">${escapeHtml(email)}</p>
  <p style="margin:0;font-size:13px;line-height:20px;color:#D0C4AB">${when}<br>Country: ${escapeHtml(country)}</p>
  <p style="margin:18px 0 0;font-size:13px;color:#8A7C67">Reply to this message to reach them directly.</p>
</div>`,
      }),
    })

    if (!res.ok) {
      console.error('[waitlist] Resend rejected the send:', res.status, await errorName(res))
      return bad(502, 'We couldn’t add you just then. Try again in a moment.')
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[waitlist] send failed:', fetchFailure(err))
    return bad(502, 'We couldn’t add you just then. Try again in a moment.')
  }
}

// Resend's error name only (such as `validation_error`): its message can repeat
// the address it was given, and no address belongs in the logs.
async function errorName(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { name?: unknown }
    return typeof body.name === 'string' ? body.name.slice(0, 60) : 'no error name'
  } catch {
    return 'unreadable error'
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
