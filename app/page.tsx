import Image from 'next/image'
import ConstellationCrown from '@/components/ConstellationCrown'
import SkyHalo from '@/components/SkyHalo'
import StarField from '@/components/StarField'
import Waitlist from '@/components/Waitlist'

export default function Home() {
  return (
    <>
      <div className="sky" aria-hidden="true">
        {/* dust everywhere; on wide screens the bowl is laid over it at
            window scale, framing the viewport rather than the headline */}
        <StarField className="sky__field" />
        <SkyHalo className="sky__halo" />
      </div>

      <main className="shell">
        <section className="hero">
          {/* the arch crowns the copy on narrow screens; wide screens are
              framed by the window-scale bowl in .sky instead */}
          <ConstellationCrown className="hero__crown" />

          <Image
            className="wordmark"
            src="/oria-wordmark.svg"
            alt="Oria"
            width={127}
            height={35}
            loading="eager"
            unoptimized
          />

          <h1>Become better with people.</h1>

          <p className="lede">
            Work through difficult situations and build practical people skills.
          </p>

          <Waitlist />

          <p className="meta">iOS &middot; Closed beta</p>
        </section>
      </main>

      <footer className="foot">
        <span>&copy; {new Date().getFullYear()} Oria Studio LLC</span>
        <a href="mailto:hello@oriastudio.ai">hello@oriastudio.ai</a>
      </footer>
    </>
  )
}
