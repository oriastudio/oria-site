import Image from 'next/image'
import Waitlist from '@/components/Waitlist'
import SiteFooter from '@/components/SiteFooter'

export default function Home() {
  return (
    <div className="landing">
      <header className="landing__header">
        <Image src="/oria-wordmark.svg" alt="Oria" width={127} height={35} loading="eager" unoptimized />
      </header>
      <main className="landing__main">
        <section className="landing__intro" aria-labelledby="landing-title">
          <h1 id="landing-title">Clarity when people<br className="landing__break" /> get complicated.</h1>
          <p className="lede">Oria gives you a private space to make sense of what’s going on with the people in your life.</p>
        </section>
        <div className="landing__scene" aria-hidden="true">
          <Image className="landing__art" src="/oria-panoramic-night.png" alt="" width={2172} height={724} sizes="100vw" preload unoptimized />
        </div>
        <div className="landing__invite"><Waitlist /></div>
      </main>
      <SiteFooter />
    </div>
  )
}
