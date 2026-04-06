import type { Metadata } from 'next'
import LandingPage from './LandingPage'

export const metadata: Metadata = {
  title: 'ClinicaApp — Gestión inteligente para clínicas dentales',
  description:
    'Software SaaS para clínicas dentales en Guatemala. Agenda, expedientes, facturación electrónica, cobros y más. 30 días gratis.',
}

export default function Page() {
  return <LandingPage />
}
