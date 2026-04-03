'use client'

// ── Tipos ──────────────────────────────────────────────────────────────────

interface ReporteHeaderProps {
  titulo: string
  nombreClinica: string
  logoUrl?: string | null
}

// ── Helpers ────────────────────────────────────────────────────────────────

function obtenerIniciales(nombre: string): string {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

// ── Componente ─────────────────────────────────────────────────────────────

export default function ReporteHeader({ titulo, nombreClinica, logoUrl }: ReporteHeaderProps) {
  const hoy = new Date()
  const fechaGenerado = hoy.toLocaleDateString('es-GT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        padding: '16px 24px',
        background: '#ffffff',
        border: '0.5px solid #c5ddf5',
        borderRadius: 12,
        marginBottom: 20,
      }}
    >
      {/* Izquierda: logo + nombre de clínica */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
        {logoUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={logoUrl}
            alt={nombreClinica}
            style={{ maxHeight: 56, maxWidth: 110, objectFit: 'contain' }}
          />
        ) : (
          <div
            style={{
              width: 56, height: 56, background: '#1a6bbd', borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#ffffff', fontSize: 20, fontWeight: 700, flexShrink: 0,
            }}
          >
            {obtenerIniciales(nombreClinica)}
          </div>
        )}
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#0d3d6e', lineHeight: 1.3 }}>
            {nombreClinica}
          </div>
          <div style={{ fontSize: 12, color: '#5a8ab0', marginTop: 3 }}>
            {titulo}
          </div>
        </div>
      </div>

      {/* Derecha: fecha de generación */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 12, color: '#5a8ab0' }}>Generado el</div>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#0d3d6e', marginTop: 2 }}>
          {fechaGenerado}
        </div>
      </div>
    </div>
  )
}
