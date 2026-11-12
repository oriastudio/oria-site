// Run with `npm test`; `npm run build` runs it first, so Vercel will not
// deploy a site whose key handling is broken.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fetchFailure, resendKey } from '../lib/resend.ts'

const GOOD = 're_AbCdEf12_3456789xyz'

test('a well-formed key is used as is', () => {
  assert.deepEqual(resendKey(GOOD), { ok: true, key: GOOD })
})

test('a key pasted with a line break or spaces still works', () => {
  for (const pasted of [`${GOOD}\n`, ` ${GOOD} `, `re_AbCdEf12\n_3456789xyz`, `re_AbCdEf12\r\n_3456789xyz`]) {
    assert.deepEqual(resendKey(pasted), { ok: true, key: GOOD }, JSON.stringify(pasted))
  }
})

test('a cleaned key is a valid Authorization header', () => {
  const checked = resendKey(`re_AbCdEf12\n_3456789xyz`)
  assert.ok(checked.ok)
  assert.doesNotThrow(() => new Headers({ Authorization: `Bearer ${checked.key}` }))
})

// Explicit values only: `resendKey(undefined)` reads RESEND_API_KEY, which is
// set when Vercel runs this before a production build.
test('a missing key is named, not thrown', () => {
  for (const empty of ['', ' \n ']) {
    assert.equal((resendKey(empty) as { problem: string }).problem, 'missing')
  }
})

test('a malformed key is described without repeating it', () => {
  for (const bad of ['RESEND_API_KEY=re_AbCdEf12_3456789xyz', 're_AbCdEf12’3456789xyz', 'sk_AbCdEf123456789']) {
    const checked = resendKey(bad)
    assert.equal(checked.ok, false, bad)
    const detail = (checked as { detail: string }).detail
    assert.match(detail, /not a Resend key/)
    assert.ok(!detail.includes('AbCdEf'), `detail leaks the key: ${detail}`)
  }
})

test('an invalid-header failure is named without its message', () => {
  let thrown: unknown
  try {
    new Headers({ Authorization: 'Bearer re_secret\nvalue' })
  } catch (err) {
    thrown = err
  }
  const named = fetchFailure(thrown)
  assert.equal(named, 'TypeError: invalid header value')
  assert.ok(!named.includes('secret'))
})

test('a network failure keeps its cause code', () => {
  const err = new TypeError('fetch failed', { cause: Object.assign(new Error('x'), { code: 'ENOTFOUND' }) })
  assert.equal(fetchFailure(err), 'TypeError: ENOTFOUND')
})
