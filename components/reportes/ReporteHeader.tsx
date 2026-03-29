'use client'

interface ReporteHeaderProps {
  titulo: string
  nombreClinica: string
  logoUrl?: string | null
}

function obtenerIniciales(nombre: string): string {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

export default function ReporteHeader({ titulo, nombreClinica, logoUrl }: ReporteHeaderProps) {
  const hoy = new Date()
  const fechaGenerado = hoy.toLocaleDateString('es-GT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 24px',
      background: '#fff',
      border: '0.5px solid #c5ddf5',
      borderRadius: 12,
      marginBottom: 20,
    }}>
      {/* Logo o iniciales */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={nombreClinica}
            style={{ maxHeight: 60, maxWidth: 120, objectFit: 'contain' }}
          />
        ) : (
          <div style={{
            width: 60, height: 60, background: '#1a6bbd', borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 22, fontWeight: 700, flexShrink: 0,
          }}>
            {obtenerIniciales(nombreClinica)}
          </div>
        )}
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#0d3d6e' }}>
            {nombreClinica}
          </div>
          <div style={{ fontSize: 12, color: '#5a8ab0', marginTop: 2 }}>
            {titulo}
          </div>
        </div>
      </div>

      {/* Fecha de generación */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 12, color: '#5a8ab0' }}>Generado el</div>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#0d3d6e' }}>
          {fechaGenerado}
        </div>
      </div>
    </div>
  )
}
