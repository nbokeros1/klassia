import { redirect } from 'next/navigation'

// Legacy admin terminal — replaced by the Founder Operating Center
export default function EcolePage() {
  redirect('/founder')
}
