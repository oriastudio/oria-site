import Link from 'next/link'

export default function SiteFooter() {
  return (
    <footer className="foot">
      <span>&copy; {new Date().getFullYear()} Oria Studio LLC</span>
      <nav className="foot__links" aria-label="Legal and contact">
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <a href="mailto:hello@oriastudio.ai">hello@oriastudio.ai</a>
      </nav>
    </footer>
  )
}
