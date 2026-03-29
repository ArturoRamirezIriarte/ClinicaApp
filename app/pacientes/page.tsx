import Link from 'next/link'
import ListaPacientes from '@/components/ListaPacientes'

interface Props {
  searchParams: Promise<{ registrado?: string }>
}

export const metadata = {
  title: 'Pacientes — ClinicaApp',
}

export default async function PaginaPacientes({ searchParams }: Props) {
  const params = await searchParams
  const recienRegistrado = params.registrado === '1'

  return (
    <div>
      {/* Breadcrumb */}
      <nav style={{ fontSize: 13, color: '#5a8ab0', marginBottom: 16 }}>
        <span>Inicio</span>
        <span style={{ margin: '0 6px' }}>›</span>
        <span style={{ color: '#0d3d6e', fontWeight: 500 }}>Pacientes</span>
      </nav>

      {/* Encabezado de página */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 600, color: '#0d3d6e', margin: 0 }}>
          Pacientes
        </h1>
        <Link href="/pacientes/nuevo">
          <button className="ct-btn ct-btn-primary">+ Nuevo Paciente</button>
        </Link>
      </div>

      {/* Lista */}
      <ListaPacientes registrado={recienRegistrado} />
    </div>
  )
}
