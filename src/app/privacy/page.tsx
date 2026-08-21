import type { Metadata } from 'next'
import LegalPageLayout from '@/components/legal/LegalPageLayout'
import { privacySections, privacyMeta } from '@/content/legal/privacy-fr'

export const metadata: Metadata = {
  title: 'Politique de confidentialité — ScorgIA',
  description: 'Comment ScorgIA (Bodingo AI Tech Inc.) collecte, utilise et protège vos renseignements personnels.',
  robots: { index: true, follow: true },
}

export default function PrivacyPage() {
  return (
    <LegalPageLayout
      title="Politique de confidentialité"
      subtitle="Comment ScorgIA collecte, utilise et protège vos renseignements personnels."
      version={privacyMeta.version}
      date={privacyMeta.date}
      sections={privacySections}
    />
  )
}
