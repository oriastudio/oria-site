import type { Metadata } from 'next'
import LegalDocument from '@/components/LegalDocument'

export const metadata: Metadata = {
  title: 'Terms of Service',
  alternates: { canonical: '/terms' },
}

export default function TermsPage() {
  return <LegalDocument policy="terms" />
}
