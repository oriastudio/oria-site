import { NextResponse } from 'next/server'
import { allow } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TO = process.env.WAITLIST_TO || 'hello@oriastudio.ai'
const FROM = process.env.WAITLIST_FROM || 'Oria Waitlist <waitlist@oriastudio.com>'

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

  const key = process.env.RESEND_API_KEY
  if (!key) {
    console.error('[waitlist] RESEND_API_KEY is not set — signup was not delivered:', email)
    return bad(503, 'The waitlist isn’t accepting signups just yet. Try again shortly.')
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
      const detail = await res.text().catch(() => '')
      console.error('[waitlist] Resend rejected the send:', res.status, detail.slice(0, 500))
      return bad(502, 'We couldn’t add you just then. Try again in a moment.')
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[waitlist] send failed:', err)
    return bad(502, 'We couldn’t add you just then. Try again in a moment.')
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
