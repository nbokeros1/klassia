import { ScorgiaLogo } from '@/components/branding/scorgia-logo'

export default function LoadingScreen() {
  return (
    <div className="loading-screen">
      <ScorgiaLogo variant="icon" width={64} height={64} />
      <p style={{ color: 'var(--text-3)' }}>Chargement...</p>
    </div>
  )
}
