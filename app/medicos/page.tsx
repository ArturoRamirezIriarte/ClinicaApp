import Link from 'next/link'
import ListaMedicos from '@/components/ListaMedicos'

interface Props {
  searchParams: Promise<{ registrado?: string }>
}

export const metadata = {
  title: 'Médicos — ClinicaApp',
}

export default async function PaginaMedicos({ searchParams }: Props) {
  const params = await searchParams
  const recienRegistrado = params.registrado === '1'

  return (
    <div>
      {/* Breadcrumb */}
      <nav style={{ fontSize: 13, color: '#5a8ab0', marginBottom: 16 }}>
        <span>Inicio</span>
        <span style={{ margin: '0 6px' }}>›</span>
        <span style={{ color: '#0d3d6e', fontWeight: 500 }}>Médicos</span>
      </nav>

      {/* Encabezado */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 24, flexWrap: 'wrap', gap: 12,
      }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: '#0d3d6e', margin: 0 }}>
          Médicos
        </h1>
        <Link href="/medicos/nuevo">
          <button className="ct-btn ct-btn-primary">+ Nuevo Médico</button>
        </Link>
      </div>

      <ListaMedicos registrado={recienRegistrado} />
    </div>
  )
}
