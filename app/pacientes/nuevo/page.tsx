import Link from 'next/link'
import FormularioPaciente from '@/components/FormularioPaciente'

export const metadata = {
  title: 'Nuevo Paciente — ClinicaApp',
}

export default function PaginaNuevoPaciente() {
  return (
    <div>
      {/* Breadcrumb */}
      <nav style={{ fontSize: 13, color: '#5a8ab0', marginBottom: 16 }}>
        <Link href="/pacientes" style={{ color: '#1a6bbd', textDecoration: 'none' }}>
          Pacientes
        </Link>
        <span style={{ margin: '0 6px' }}>›</span>
        <span style={{ color: '#0d3d6e', fontWeight: 500 }}>Nuevo Paciente</span>
      </nav>

      {/* Encabezado */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: '#0d3d6e', margin: 0 }}>
          Registrar Nuevo Paciente
        </h1>
        <p style={{ fontSize: 14, color: '#5a8ab0', marginTop: 6 }}>
          Complete los datos del paciente. Los campos marcados con{' '}
          <span style={{ color: '#e84040' }}>*</span> son requeridos.
        </p>
      </div>

      {/* Formulario */}
      <FormularioPaciente />
    </div>
  )
}
