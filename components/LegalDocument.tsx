import Link from 'next/link'
import { legalPolicies } from '@/lib/legal'
import SiteFooter from '@/components/SiteFooter'

export default function LegalDocument({ policy }: { policy: keyof typeof legalPolicies }) {
  const document = legalPolicies[policy]
  return (
    <>
      <header className="legal__header">
        <Link href="/" aria-label="Oria home">Oria</Link>
      </header>
      <main className="legal">
        <h1>{document.title}</h1>
        <p className="legal__date">Last updated {document.updated}</p>
        {document.sections.map(section => (
          <section key={section.title}>
            <h2>{section.title}</h2>
            {section.paragraphs.map(paragraph => (
              <p key={paragraph}>
                {policy === 'terms' && paragraph.startsWith('The Privacy Policy explains')
                  ? <>The <Link href="/privacy">Privacy Policy</Link>{paragraph.slice('The Privacy Policy'.length)}</>
                  : paragraph}
              </p>
            ))}
            {policy === 'privacy' && section.title === 'Service providers' ? (
              <p className="legal__sources">
                <a href="https://resend.com/legal/privacy-policy">Resend Privacy Policy <ExternalMark /></a>
                <a href="https://vercel.com/legal/privacy-notice">Vercel Privacy Notice <ExternalMark /></a>
              </p>
            ) : null}
          </section>
        ))}
      </main>
      <SiteFooter />
    </>
  )
}

function ExternalMark() {
  return <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true"><path d="M4 12 12 4M5 4h7v7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
