# oriastudio.ai

The Oria teaser site. One page: the wordmark, the line, a sentence, and a
waitlist. No feature list, no screenshots, no mechanics.

Next.js 16 (App Router) · TypeScript · no CSS framework · no database.

---

## Deploying this the first time

### 1. Create the repo and push

```bash
git init && git branch -M main
git add -A && git commit -m "Oria teaser site"
gh repo create Oria-site --private --source=. --remote=origin --push
```

Without the `gh` CLI: create an empty `Oria-site` repo on GitHub (no README,
no .gitignore), then

```bash
git init && git add -A && git commit -m "Oria teaser site"
git branch -M main
git remote add origin https://github.com/<owner>/Oria-site.git
git push -u origin main
```

### 2. Set up Resend so signups can be delivered

Signups arrive as email — there is no database, so this step is what makes
the form work at all.

1. Sign in at <https://resend.com> with the Oria account.
2. **Domains → Add Domain → `oriastudio.ai`.** Resend shows three DNS
   records (an MX and two TXT: SPF and DKIM). Add them wherever
   `oriastudio.ai`'s DNS lives, then click Verify. This is what lets mail be
   sent *from* `waitlist@oriastudio.ai`.
3. **API Keys → Create API Key**, sending permission only. Copy it once —
   Resend won't show it again.

Prefer to skip DNS for now? Change `WAITLIST_FROM` to
`Oria Waitlist <onboarding@resend.dev>`, Resend's shared test sender. It only
delivers to the address that owns the Resend account, so use it to prove the
flow works, then move to the verified domain before launch.

### 3. Import to Vercel

1. <https://vercel.com/new> → import `Oria-site`. Framework detection picks
   Next.js; every default is right.
2. Before the first deploy, open **Environment Variables** and add all three
   for **Production, Preview and Development**:

   | Name             | Value                                       |
   | ---------------- | ------------------------------------------- |
   | `RESEND_API_KEY` | the key from step 2                         |
   | `WAITLIST_TO`    | `hello@oriastudio.ai`                       |
   | `WAITLIST_FROM`  | `Oria Waitlist <waitlist@oriastudio.ai>`   |

3. Deploy.

> If you deploy before adding `RESEND_API_KEY`, the page still works and the
> form returns a polite "not accepting signups just yet" rather than pretending
> to succeed. Add the variable and redeploy to switch it on.

### 4. Point oriastudio.ai at it

Vercel project → **Settings → Domains → Add** → `oriastudio.ai`. Add
`www.oriastudio.ai` too and let Vercel redirect it to the apex.

Vercel then names the DNS records to create at your registrar — usually an
`A` record for the apex at `76.76.21.21` and a `CNAME` for `www` at
`cname.vercel-dns.com`. Follow what the dashboard tells you rather than these
values; they change. Propagation is minutes to a couple of hours, and Vercel
issues the TLS certificate on its own once the records resolve.

### 5. Check it end to end

Sign up with your own address on the live site and confirm the mail lands in
`hello@oriastudio.ai`. Replying to it replies to the person who signed up —
their address is set as `Reply-To`.

---

## How the waitlist works

`app/api/subscribe/route.ts` is a serverless function. It validates the
address, then POSTs to the Resend API, which sends one message to
`WAITLIST_TO`. Nothing is stored anywhere — **the inbox is the list.** Export
it by searching `hello@oriastudio.ai` for subject `Oria waitlist —`.

Three things guard the endpoint:

- a **honeypot** field (`company`) that people never see and bots fill in
- a **timing check** — anything submitted under 400ms after page load
- a **rate limit** of 5 per IP per 10 minutes

The first two return a clean `200` without sending, so a bot learns nothing
from the response. The rate limit is in-memory (`lib/rate-limit.ts`), which
means it only counts within one warm serverless instance — a speed bump, not
a guarantee. If the form is ever seriously targeted, turn on Vercel's WAF or
put a KV store behind it.

### Swapping the email provider

Everything provider-specific is the single `fetch` in
`app/api/subscribe/route.ts`. Point it at Postmark, SES or a form service and
nothing else changes.

---

## The design

Tokens in `app/globals.css` mirror **Oria Design System B** (dark mode):
`sand` for the neutral spine, `gold` "starlight" for guidance and focus,
`clay` for tension — never alarm-red. All type is Instrument Sans, self-hosted
from `app/fonts/` so no visitor request leaves for Google.

The artwork is generated, not hand-drawn, so the geometry stays honest to the
spec:

```bash
node scripts/gen-constellation.mjs   # → components/SkyHalo.tsx + ConstellationCrown.tsx
node scripts/gen-starfield.mjs       # → components/StarField.tsx
```

There are **two treatments, chosen by how much room the window has**:

- **SkyHalo** — the bowl, drawn at *window* scale and cropped by the viewport,
  so the arc sweeps near the screen edges and the copy sits in the open
  middle. Arc 206°→6° at `R = 0.40·min(w,h)`, `cy = 0.52h`. This is the
  desktop treatment.
- **ConstellationCrown** — a deeper arch above the copy, for everything else.

The gate matters. SkyHalo's radius is `max(156vh, 98vw) ÷ 3.08`, and measured
clearance from the headline is roughly that radius minus half the copy block's
diagonal. Wanting ~75px of clearance means a window **at least 802px tall or
at least 1276px wide**, and in both cases at least 760px tall — below that the
page starts to scroll, the meta line drifts into the arc, and clearance
collapses. Smaller windows keep the arch. Shrinking the bowl to fit would just
park it behind the words, which is the thing it exists to avoid.

If you change the copy block's size, re-measure rather than eyeball it: sample
each text element's bounding rect against the circle and take
`min |distance − R|`.

- **StarField** is thin dust only — no arcs, no bright stars — so it never
  competes with the constellation. It sits under both treatments.

The generators deliberately go past a literal reading of the spec, because a
perfectly even ring of identical dots reads as a loading spinner. Angular
spacing is jittered, each star sits slightly off the mean radius, hairlines
vary in length and opacity and some gaps carry none, stars come in three
tiers, and brightness and size **taper away from the focal star** so the sweep
has a light source and a direction. Faint partial arcs at other radii give
depth; dust is banded along the arc as well as scattered, and thinned hard
inside a declared safe box so the words never pick up specks behind them.
Everything is seeded, so the sky is identical on every build.

Four things that look like details but aren't:

- **Glows must stay inside their viewBox.** A clipped radial gradient stops
  mid-falloff and renders as a hard rectangular edge. The generator throws if
  one escapes.
- **A wide, shallow frame can't hold an ellipse glow at all** — it reads as a
  saucer sitting under the stars. The crown has none; its halos and the page's
  own warm lift carry the light.
- **Halo opacity has a ceiling.** Above roughly 0.25 peak on the quiet stars
  they stop being light and become bokeh blobs.
- **Long faint arcs read as scratches at window scale.** The depth arcs are
  kept to 5–7° breaths; at 14° they became the "crisp filaments" the visual
  language rules out.

Page-level illumination is CSS, in `.sky::before`: a vignette so the corners
fall away and the copy keeps its contrast, an overhead source where the focal
star is, a broad warm room light, and a horizon lift from below. Every falloff
is multi-stop — a single stop to `transparent` terminates visibly as a ring.

Motion is restrained: each star breathes on its own 6–12s cycle so the field
never pulses in lockstep, content enters once, and
everything collapses under `prefers-reduced-motion`.

`public/og.png` is captured from the live page so the social card can't drift
from the design. To regenerate it, run the site locally and:

```bash
npm i -D playwright && npx playwright install chromium
node scripts/gen-og.mjs
```

---

## Local development

```bash
npm install
cp .env.example .env.local     # fill in RESEND_API_KEY
npm run dev                    # http://localhost:3000
```

Without a key the page renders fine and the form returns its 503 message.

## Layout

```
app/
  layout.tsx              metadata, self-hosted font
  page.tsx                the one page
  globals.css             design tokens + all styles
  icon.svg                favicon
  robots.ts, sitemap.ts
  api/subscribe/route.ts  waitlist → Resend
  fonts/                  Instrument Sans (OFL, see OFL.txt)
components/
  SkyHalo.tsx             generated — the bowl at window scale
  ConstellationCrown.tsx  generated — the arch, for smaller windows
  StarField.tsx           generated — dust, under both
  Waitlist.tsx            the form and its states
lib/rate-limit.ts
scripts/                  the generators
public/og.png             generated social card
```
