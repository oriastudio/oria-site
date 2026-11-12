import Link from 'next/link'

export default function SiteFooter() {
  return (
    <footer className="foot">
      <span>&copy; Oria Studio</span>
      <nav className="foot__links" aria-label="Legal and contact">
        <Link href="/privacy">Privacy</Link>
        <a href="mailto:hello@oriastudio.ai">Contact</a>
      </nav>
    </footer>
  )
}
