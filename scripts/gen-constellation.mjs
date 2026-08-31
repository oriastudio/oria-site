/**
 * Generates the constellation artwork for the Oria site.
 *
 *   halo  — the bowl, drawn at WINDOW scale on wide screens. It is sized in
 *           vh/vw and cropped by the viewport, so the arc sweeps near the
 *           screen edges and the copy sits in the open middle. A small ring
 *           hugging the headline wastes the room a desktop has.
 *   crown — a deeper, shallower arch for narrow screens, where there is no
 *           room for anything but a crown above the copy.
 *
 * The language is Design System B (pass 9–10): stars sitting on a circular
 * arc, curved hairlines following that same circle, one bright star with a
 * sparkle cross, quieter stars with halos, diffuse glow and dust. No straight
 * connecting lines, no flat hard-edged rings.
 *
 * Where this goes beyond a literal reading of the spec — deliberately, because
 * a perfectly even ring of identical dots reads as a loading spinner:
 *
 *   · angular spacing is jittered, so no two gaps match
 *   · each star sits slightly off the mean radius, so the arc breathes
 *   · hairlines vary in length and opacity, and some gaps carry none
 *   · three tiers of star (one focal, two secondary, the rest quiet)
 *   · faint partial arcs at other radii, for depth behind the main arc
 *   · dust is banded along the arc as well as scattered, for a milky edge
 *   · glow is several offset ellipses, never one symmetric blob
 *
 * Everything is seeded, so the sky is identical on every build.
 *
 *
 * Re-run with: node scripts/gen-constellation.mjs
 */
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// Dark-mode constellation colors (design system B)
const C = {
  line: '#F0D07B', // gold/300
  core: '#F7E4A9', // gold/200
  pale: '#FBF1D4', // gold/100
  gold: '#E6BA4E', // gold/400
  faint: '#8A7C67', // sand/500
  dim: '#6D604E', // sand/600
}

// The star, from two adopted sources rather than one.
//
// SHAPE comes from HorizonStar in the iOS app
// (Oria/Features/Home/HomeHorizonField.swift): three nested elliptical blooms,
// listed outside in as fractions of the star's zone, with the app's own
// opacities. No drawn star, no outline, no filled core — the silhouette is the
// sum of three overlapping gradients, which is what makes it read as light
// instead of as a glyph. This is also what Oria's visual system asks for in so
// many words: diffused low-contrast halos, feathered luminosity, gentle depth,
// and never a crisp filled path or an opaque circular core.
//
// COLOUR comes from the brand mark's constellation halo
// (DesignReferences/Logo-adopted.svg, Figma node 4615:3335): warmer and more
// amber than the page's own gold ramp, and deliberately so — this arc is brand
// artwork, so it glows in the brand's amber rather than the UI's gold.
//
// The app blurs each bloom (18/10/4pt on a 166.5pt zone) because SwiftUI takes
// one endRadius off the WIDTH, so the shorter vertical edge would otherwise
// cut. An SVG radial gradient in objectBoundingBox units fades to zero on both
// axes on its own, so the feathered edge is already there without a filter.
// Radii, not width/height pairs. HorizonStar's blooms are about 1.5:1 wide
// because they sit in a 166.5x164 zone above a Space label, where a horizontal
// smear of light is the point. That eccentricity belongs to the Home field, not
// to a star: the brand mark's own constellation halo is a plain circle (r=19.5
// in DesignReferences/Logo-adopted.svg), and on an arc a 1.5:1 bloom reads as
// squished. Keep the app's three nested layers and its opacities — that is the
// depth — and take the round shape from the mark.
const BLOOMS = [
  { r: 0.84, op: 0.52 },
  { r: 0.52, op: 0.62 },
  { r: 0.22, op: 0.92 },
]
// Warm light on a near-black page needs a little more of itself to read as the
// same light it is on cream. The app's own figure.
const DARK_GAIN = 1.18

// The brand halo's ramp, normalised so its brightest stop is 1. The mark peaks
// this ramp at 0.55; here the bloom's own opacity is what sets each layer's
// alpha, exactly as HorizonStar does it. Keeping both would attenuate twice and
// the outer layers would all but vanish — the hues and their positions are the
// part worth carrying over, not the mark's single-layer alpha.
const STAR = {
  nucleus: '#FFF9E8',
  halo: [
    ['0%', '#FFD487', 1],
    ['35%', '#D69338', 0.33],
    ['100%', '#8B4D14', 0],
  ],
}

const rad = (d) => (d * Math.PI) / 180
const n = (v) => Math.round(v * 100) / 100

function makePrng(seed) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

function build(cfg) {
  const {
    name, W, H, R, CX, CY, a0, a1, count, focal, secondary,
    rJitter, aJitter, glows, arcs, dust, band, brightR, seed, safe,
  } = cfg

  // Where the copy sits, in viewBox units. Dust is thinned hard inside it so
  // the words never pick up specks behind them. Stars sit on the arc, which
  // is outside this box by construction.
  const inSafe = (x, y) =>
    !!safe && x > safe.x0 && x < safe.x1 && y > safe.y0 && y < safe.y1

  const rnd = makePrng(seed)
  const lerp = (a, b, t) => a + (b - a) * t
  const pick = (a, b) => lerp(a, b, rnd())
  const pt = (deg, r) => [CX + r * Math.cos(rad(deg)), CY - r * Math.sin(rad(deg))]

  const out = []
  const push = (s) => out.push(s)
  const id = (part) => `${name}-${part}`

  // ---- stars ----------------------------------------------------------
  // Jittered in angle AND radius so nothing reads as a ring, then tapered
  // away from the focal star: brightness and size fall off with distance
  // along the arc, which gives the sweep a light source and a direction
  // instead of an even necklace of identical dots.
  const step = (a1 - a0) / (count - 1)
  const reach = Math.max(focal, count - 1 - focal)
  const stars = Array.from({ length: count }, (_, i) => {
    // endpoints stay put so the arc still spans its intended sweep
    const edge = i === 0 || i === count - 1
    const a = a0 + step * i + (edge ? 0 : (rnd() * 2 - 1) * step * aJitter)
    const r = R * (1 + (rnd() * 2 - 1) * rJitter)
    const [x, y] = pt(a, r)

    const fade = 0.36 + 0.64 * (1 - Math.abs(i - focal) / reach) ** 0.7
    const tier = i === focal ? 'focal' : secondary.includes(i) ? 'second' : 'quiet'
    const base = tier === 'focal' ? 9 : tier === 'second' ? pick(5.2, 6.2) : pick(2.6, 4.8)

    // a few stars carry a faint companion — real skies come in pairs
    const companion =
      tier === 'quiet' && rnd() < 0.34
        ? { dx: pick(-13, 13), dy: pick(-11, 11), d: pick(0.9, 1.6), op: pick(0.2, 0.42) }
        : null

    return {
      i, a, r, x, y, tier, companion,
      fade: n(tier === 'focal' ? 1 : Math.max(fade, 0.34)),
      d: tier === 'focal' ? base : base * (0.62 + 0.38 * fade),
      op: tier === 'quiet' ? pick(0.5, 0.9) : 1,
      // each star breathes on its own clock — lockstep twinkling looks mechanical
      dur: n(pick(6.4, 11.5)),
    }
  })

  // ---- defs ----------------------------------------------------------
  push(`  <defs>`)
  glows.forEach((g, i) => {
    push(`    <radialGradient id="${id('g' + i)}" cx="50%" cy="50%" r="50%">`)
    push(`      <stop offset="0%" stopColor="${g.color}" stopOpacity="${g.peak}" />`)
    push(`      <stop offset="48%" stopColor="${g.color}" stopOpacity="${n(g.peak * 0.34)}" />`)
    push(`      <stop offset="100%" stopColor="${g.color}" stopOpacity="0" />`)
    push(`    </radialGradient>`)
  })
  // The adopted halo, one gradient shared by every star exactly as the brand
  // artwork shares it. Amber through the falloff, gone by the edge.
  push(`    <radialGradient id="${id('halo')}" cx="50%" cy="50%" r="50%">`)
  for (const [offset, color, op] of STAR.halo) {
    push(`      <stop offset="${offset}" stopColor="${color}" stopOpacity="${op}" />`)
  }
  push(`    </radialGradient>`)
  // The nucleus. The person-star contract wants a perceptible ivory-gold core
  // separated from the quieter field — so it stays, but as its own soft
  // gradient rather than the mark's filled dot.
  push(`    <radialGradient id="${id('nucleus')}" cx="50%" cy="50%" r="50%">`)
  push(`      <stop offset="0%" stopColor="${STAR.nucleus}" stopOpacity="0.9" />`)
  push(`      <stop offset="40%" stopColor="${C.core}" stopOpacity="0.38" />`)
  push(`      <stop offset="100%" stopColor="${C.gold}" stopOpacity="0" />`)
  push(`    </radialGradient>`)
  push(`  </defs>`)

  // ---- glow: several offset ellipses, never one symmetric blob --------
  // each is checked to sit inside the viewBox; a clipped radial gradient
  // stops mid-falloff and reads as a hard rectangular edge.
  push(``)
  push(`  <g className="oc-glow">`)
  glows.forEach((g, i) => {
    const fits =
      g.cx - g.rx >= -0.5 && g.cx + g.rx <= W + 0.5 && g.cy - g.ry >= -0.5 && g.cy + g.ry <= H + 0.5
    if (!fits) throw new Error(`${name}: glow ${i} escapes the ${W}×${H} viewBox`)
    push(
      `    <ellipse cx="${n(g.cx)}" cy="${n(g.cy)}" rx="${n(g.rx)}" ry="${n(g.ry)}" fill="url(#${id(
        'g' + i,
      )})" />`,
    )
  })
  push(`  </g>`)

  // ---- depth: faint partial arcs at other radii -----------------------
  push(``)
  push(`  <g className="oc-depth" fill="none" strokeLinecap="round">`)
  for (const arc of arcs) {
    const r = R * arc.r
    const [x1, y1] = pt(arc.from, r)
    const [x2, y2] = pt(arc.to, r)
    push(
      `    <path d="M ${n(x1)} ${n(y1)} A ${n(r)} ${n(r)} 0 0 1 ${n(x2)} ${n(y2)}" stroke="${
        arc.color || C.line
      }" strokeWidth="${arc.w}" opacity="${arc.op}" />`,
    )
  }
  push(`  </g>`)

  // ---- dust: a band hugging the arc, plus a scattered field -----------
  push(``)
  push(`  <g className="oc-dust">`)
  for (let i = 0; i < band; i++) {
    // sit in a shell around the arc, denser close to it, spread over a wider
    // sweep than the stars so the arc fades out rather than stopping
    const a = lerp(a0 + 16, a1 - 16, rnd()) + (rnd() * 2 - 1) * 10
    const off = (rnd() * 2 - 1) ** 3 * R * 0.23 // cubed → clusters near the arc
    const [x, y] = pt(a, R + off)
    if (x < 8 || x > W - 8 || y < 8 || y > H - 8) continue
    if (inSafe(x, y)) continue
    const d = pick(0.9, 2.1)
    push(
      `    <circle cx="${n(x)}" cy="${n(y)}" r="${n(d / 2)}" fill="${
        rnd() > 0.45 ? C.gold : C.faint
      }" opacity="${n(pick(0.12, 0.4))}" />`,
    )
  }
  for (let i = 0; i < dust; i++) {
    const x = pick(14, W - 14)
    const y = pick(12, H - 12)
    if (Math.abs(Math.hypot(x - CX, y - CY) - R) < 12) continue
    if (inSafe(x, y) && rnd() < 0.85) continue
    const far = rnd() > 0.62
    const d = far ? pick(0.7, 1.2) : pick(1.3, 2.3)
    const t = rnd()
    push(
      `    <circle cx="${n(x)}" cy="${n(y)}" r="${n(d / 2)}" fill="${
        t > 0.74 ? C.gold : t > 0.4 ? C.faint : C.dim
      }" opacity="${n(far ? pick(0.1, 0.24) : pick(0.16, 0.42))}" />`,
    )
  }
  push(`  </g>`)

  // ---- hairlines: uneven lengths, uneven weight, some gaps left open ---
  push(``)
  push(
    `  <g className="oc-arcs" fill="none" stroke="${C.line}" strokeWidth="0.9" strokeLinecap="round">`,
  )
  for (let i = 0; i < count - 1; i++) {
    if (rnd() < 0.17) continue // an open gap keeps it from reading as a dotted ring
    const A = stars[i]
    const B = stars[i + 1]
    const mid = (A.a + B.a) / 2
    const span = Math.abs(B.a - A.a) * pick(0.38, 0.56)
    const r = (A.r + B.r) / 2 // follow the local circle between these two stars
    const [x1, y1] = pt(mid + span / 2, r)
    const [x2, y2] = pt(mid - span / 2, r)
    push(
      `    <path d="M ${n(x1)} ${n(y1)} A ${n(r)} ${n(r)} 0 0 1 ${n(x2)} ${n(
        y2,
      )}" opacity="${n(pick(0.3, 0.52) * Math.min(A.fade, B.fade) ** 1.3)}" />`,
    )
  }
  push(`  </g>`)

  // ---- stars ----------------------------------------------------------
  // Three nested blooms and a nucleus. Nothing here has an edge.
  push(``)
  push(`  <g className="oc-stars">`)
  for (const s of stars) {
    // The star's zone, in viewBox units. The outermost bloom spans 0.84 of it,
    // so a zone is a little wider than the light it holds. Quiet stars scale
    // off their own brightness rather than a floor, so the sweep keeps its
    // hierarchy instead of reading as a necklace of identical smudges.
    const zoneW =
      s.tier === 'focal' ? brightR * 2.05 : s.tier === 'second' ? brightR * 1.12 : s.d * 2.7
    // Round, but not machined: one eccentricity per star, a few percent either
    // side of a circle. A field of perfect circles reads as printed dots, and
    // the system asks for organic asymmetry.
    const ecc = pick(0.95, 1.06)
    // Tier is opacity, not a different construction — one treatment for one
    // concern, so the focal star is the same light, turned up.
    const tierGain = s.tier === 'focal' ? 1 : s.tier === 'second' ? 0.76 : 0.5

    push(
      `    <g className="oc-star oc-star--${s.tier}" style={{ '--oc-i': ${s.i}, '--oc-d': '${s.dur}s' } as CSSProperties}>`,
    )
    push(`      <g opacity="${s.fade}">`)
    BLOOMS.forEach((b, i) => {
      // Each layer drifts a little off the one under it. The app stacks them
      // concentrically; at this scale that reads as a target, and the system
      // asks for organic asymmetry — so the offset comes off the same seeded
      // stream as everything else and no two stars sit the same way.
      const dx = i === 0 ? 0 : (rnd() * 2 - 1) * zoneW * 0.04
      const dy = i === 0 ? 0 : (rnd() * 2 - 1) * zoneW * 0.04
      const rx = (zoneW * b.r) / 2
      push(
        `        <ellipse cx="${n(s.x + dx)}" cy="${n(s.y + dy)}" rx="${n(rx)}" ry="${n(
          rx * ecc,
        )}" fill="url(#${id('halo')})" opacity="${n(
          Math.min(1, b.op * DARK_GAIN * tierGain),
        )}" />`,
      )
    })
    push(
      `        <circle cx="${n(s.x)}" cy="${n(s.y)}" r="${n(s.d * 0.66)}" fill="url(#${id(
        'nucleus',
      )})" opacity="${n(s.op)}" />`,
    )
    if (s.companion) {
      push(
        `        <circle cx="${n(s.x + s.companion.dx)}" cy="${n(s.y + s.companion.dy)}" r="${n(
          s.companion.d / 2,
        )}" fill="${C.line}" opacity="${n(s.companion.op)}" />`,
      )
    }
    push(`      </g>`)
    push(`    </g>`)
  }
  push(`  </g>`)

  return out.map((l) => (l ? '    ' + l : l)).join('\n')
}

function emit({ component, note, W, H, body }) {
  return `// AUTO-GENERATED by scripts/gen-constellation.mjs — do not edit by hand.
// ${note}

import type { CSSProperties } from 'react'

export default function ${component}({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 ${W} ${H}"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
${body}
    </svg>
  )
}
`
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const write = (file, contents) => {
  writeFileSync(join(__dirname, '..', 'components', file), contents)
  console.log('wrote components/' + file)
}

// ---- halo: the bowl, drawn at window scale ---------------------------
// More stars and far more dust than the phone arch: at this size the sweep is
// long enough that a sparse arc reads as scattered debris rather than a
// constellation.
const haloCfg = {
  name: 'oh',
  W: 690,
  H: 560,
  CX: 345,
  CY: 0.52 * 560,
  R: 0.4 * 560,
  a0: 206,
  a1: 6,
  count: 16,
  focal: 5,
  secondary: [1, 9, 13],
  rJitter: 0.038,
  aJitter: 0.3,
  brightR: 26,
  band: 130,
  dust: 110,
  seed: 20260726,
  safe: { x0: 176, x1: 514, y0: 146, y1: 424 },
  glows: [
    { cx: 345, cy: 296, rx: 300, ry: 258, peak: 0.13, color: '#E6BA4E' },
    { cx: 205, cy: 170, rx: 195, ry: 165, peak: 0.105, color: '#F0D07B' },
    { cx: 448, cy: 372, rx: 236, ry: 186, peak: 0.055, color: '#E6BA4E' },
  ],
  arcs: [
    { r: 1.1, from: 176, to: 169, w: 0.6, op: 0.075 },
    { r: 1.1, from: 141, to: 135, w: 0.6, op: 0.06 },
    { r: 1.1, from: 60, to: 55, w: 0.6, op: 0.045 },
    { r: 0.89, from: 158, to: 152, w: 0.55, op: 0.055, color: '#8A7C67' },
    { r: 0.89, from: 108, to: 103, w: 0.55, op: 0.04, color: '#8A7C67' },
  ],
}

// ---- crown: shallow arch, centre below the frame ----------------------
// A deeper curve than the first pass: a nearly flat arch reads as a hairline
// rule, not a constellation. Only ONE glow, and a very faint one — in a frame
// this shallow anything stronger renders as a saucer sitting under the stars
// rather than as diffuse light.
const CROWN_W = 760
const CROWN_H = 340
const CROWN_R = 0.5 * CROWN_W
const crownCfg = {
  name: 'oc',
  W: CROWN_W,
  H: CROWN_H,
  CX: CROWN_W / 2,
  CY: 58 + CROWN_R,
  R: CROWN_R,
  a0: 143,
  a1: 37,
  count: 10,
  focal: 3,
  secondary: [7],
  rJitter: 0.028,
  aJitter: 0.34,
  brightR: 30,
  band: 104,
  dust: 46,
  seed: 5150719,
  // No glow at all here. Even at 0.05 a wide flat ellipse is perceptible as a
  // shape in a 760×340 frame; the star halos and the page's own warm lift
  // carry the luminosity instead.
  glows: [],
  arcs: [
    { r: 1.055, from: 132, to: 120, w: 0.7, op: 0.095 },
    { r: 1.055, from: 62, to: 51, w: 0.7, op: 0.07 },
    { r: 0.945, from: 116, to: 104, w: 0.65, op: 0.08 },
    { r: 0.945, from: 78, to: 68, w: 0.65, op: 0.06 },
  ],
}

write(
  'SkyHalo.tsx',
  emit({
    component: 'SkyHalo',
    note: `The bowl, drawn at window scale on wide screens — arc ${haloCfg.a0}°→${haloCfg.a1}°,\n// R = 0.40·min(w,h), cy = 0.52h, focal star idx ${haloCfg.focal}. Sized in vh/vw and\n// cropped by the viewport, so it frames the window rather than the headline.`,
    W: haloCfg.W,
    H: haloCfg.H,
    body: build(haloCfg),
  }),
)

write(
  'ConstellationCrown.tsx',
  emit({
    component: 'ConstellationCrown',
    note: `Shallow arch for narrow screens — same language, centre below the frame\n// so only the crown of the circle shows. Arc ${crownCfg.a0}°→${crownCfg.a1}°, focal star idx ${crownCfg.focal}.`,
    W: crownCfg.W,
    H: crownCfg.H,
    body: build(crownCfg),
  }),
)
