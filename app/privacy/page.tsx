import type { Metadata } from 'next'
import LegalDocument from '@/components/LegalDocument'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  alternates: { canonical: '/privacy' },
}

export default function PrivacyPage() {
  return <LegalDocument policy="privacy" />
}
