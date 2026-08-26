'use client'

import { useRef, useState } from 'react'

type Status = 'idle' | 'sending' | 'done' | 'error'

// The line under the field is reserved space, empty at rest: it holds its
// height so an error never shifts the layout, and says nothing until there
// is something to say.
const REST_NOTE = ''

export default function Waitlist() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [note, setNote] = useState(REST_NOTE)
  const mountedAt = useRef(Date.now())
  const trap = useRef<HTMLInputElement>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (status === 'sending') return

    const value = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
      setStatus('error')
      setNote('That address doesn’t look complete — mind checking it?')
      return
    }

    setStatus('sending')
    setNote('Adding you…')

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: value,
          company: trap.current?.value ?? '',
          elapsed: Date.now() - mountedAt.current,
        }),
      })

      if (res.ok) {
        setStatus('done')
        return
      }

      const data = (await res.json().catch(() => ({}))) as { error?: string }
      setStatus('error')
      setNote(data.error || 'Something went wrong on our side. Try again in a moment.')
    } catch {
      setStatus('error')
      setNote('We couldn’t reach the server. Try again in a moment.')
    }
  }

  if (status === 'done') {
    return (
      <div className="done" role="status">
        <svg
          className="done__mark"
          width="26"
          height="26"
          viewBox="0 0 26 26"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="13" cy="13" r="12" stroke="currentColor" strokeOpacity="0.35" />
          <path
            d="M8 13.4 11.4 16.8 18 10.2"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <p className="done__title">You&rsquo;re on the list.</p>
        <p className="done__body">{email}</p>
      </div>
    )
  }

  return (
    <form className="waitlist" onSubmit={onSubmit} noValidate>
      <div className="waitlist__row">
        <label className="sr-only" htmlFor="email">
          Email address
        </label>
        <input
          id="email"
          className="field"
          type="email"
          name="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (status === 'error') {
              setStatus('idle')
              setNote(REST_NOTE)
            }
          }}
          placeholder="you@example.com"
          autoComplete="email"
          inputMode="email"
          spellCheck={false}
          required
          disabled={status === 'sending'}
          aria-invalid={status === 'error'}
          aria-describedby="waitlist-note"
        />

        {/* honeypot: hidden from people, irresistible to bots */}
        <input
          ref={trap}
          className="trap"
          type="text"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
        />

        <button className="submit" type="submit" disabled={status === 'sending'}>
          {status === 'sending' ? 'Adding…' : 'Request an invite'}
        </button>
      </div>

      <p
        className="note"
        id="waitlist-note"
        data-state={status === 'error' ? 'error' : 'idle'}
        role={status === 'error' ? 'alert' : undefined}
      >
        {note}
      </p>
    </form>
  )
}
