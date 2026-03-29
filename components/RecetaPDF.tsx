'use client'

import { forwardRef } from 'react'

// ── Tipos ──────────────────────────────────────────────────────────────────

export interface Medicamento {
  nombre: string
  dosis: string
  frecuencia: string
  duracion: string
}

export interface RecetaPDFProps {
  empresa: {
    nombre: string
    nombre_comercial: string | null
    telefono: string | null
    direccion: string | null
    logo_url: string | null
  }
  paciente: {
    nombre_completo: string
    fecha_nacimiento: string | null
    dpi: string | null
  }
  dentista: {
    nombre: string
    apellido: string | null
    numero_colegiado?: string | null
  } | null
  receta: {
    numero_receta: number
    fecha_emision: string
    fecha_vencimiento: string
    medicamentos: Medicamento[]
    indicaciones_generales: string | null
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatearFecha(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-GT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function calcularEdad(fechaNacimiento: string | null): string {
  if (!fechaNacimiento) return '—'
  const hoy = new Date()
  const nac = new Date(fechaNacimiento + 'T12:00:00')
  let edad = hoy.getFullYear() - nac.getFullYear()
  if (
    hoy.getMonth() < nac.getMonth() ||
    (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate())
  ) edad--
  return `${edad} años`
}

// ── Fila de datos ──────────────────────────────────────────────────────────

function FilaPDF({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 5, fontSize: 12 }}>
      <span style={{ color: '#5a8ab0', fontWeight: 600, width: 96, flexShrink: 0 }}>
        {etiqueta}:
      </span>
      <span style={{ color: '#0d3d6e' }}>{valor}</span>
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────────────

const RecetaPDF = forwardRef<HTMLDivElement, RecetaPDFProps>(
  function RecetaPDF({ empresa, paciente, dentista, receta }, ref) {
    const nombreClinica = empresa.nombre_comercial ?? empresa.nombre

    return (
      <div
        ref={ref}
        style={{
          width: 700,
          background: '#ffffff',
          fontFamily: '"Arial", "Helvetica", sans-serif',
          color: '#1a1a2e',
          padding: '44px 52px',
          boxSizing: 'border-box',
        }}
      >
        {/* ─── ENCABEZADO ─────────────────────────────────────────── */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          paddingBottom: 20,
          marginBottom: 20,
          borderBottom: '2.5px solid #1a6bbd',
        }}>
          {/* Clínica */}
          <div>
            {empresa.logo_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={empresa.logo_url}
                alt={nombreClinica}
                style={{ height: 44, objectFit: 'contain', marginBottom: 8 }}
              />
            ) : (
              <div style={{ fontSize: 20, fontWeight: 700, color: '#0d3d6e', marginBottom: 6 }}>
                🦷 {nombreClinica}
              </div>
            )}
            <div style={{ fontSize: 12, color: '#5a8ab0', lineHeight: 1.7 }}>
              {empresa.direccion && <div>{empresa.direccion}</div>}
              {empresa.telefono && <div>Tel.: {empresa.telefono}</div>}
            </div>
          </div>

          {/* Título + metadata receta */}
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontSize: 20, fontWeight: 700, color: '#1a6bbd',
              letterSpacing: '0.07em', textTransform: 'uppercase',
              marginBottom: 8,
            }}>
              Receta Médica
            </div>
            <div style={{ fontSize: 11, color: '#5a8ab0', lineHeight: 1.9 }}>
              <div>
                <span style={{ fontWeight: 600 }}>N.°</span>{' '}
                {String(receta.numero_receta).padStart(4, '0')}
              </div>
              <div>
                <span style={{ fontWeight: 600 }}>Emisión:</span>{' '}
                {formatearFecha(receta.fecha_emision)}
              </div>
              <div>
                <span style={{ fontWeight: 600 }}>Vence:</span>{' '}
                {formatearFecha(receta.fecha_vencimiento)}
              </div>
            </div>
          </div>
        </div>

        {/* ─── PACIENTE Y PROFESIONAL ──────────────────────────────── */}
        <div style={{ display: 'flex', gap: 24, marginBottom: 28 }}>
          {/* Paciente */}
          <div style={{
            flex: 1,
            background: '#f0f7ff',
            borderRadius: 8,
            padding: '14px 18px',
            border: '0.5px solid #c5ddf5',
          }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: '#1a6bbd',
              textTransform: 'uppercase', letterSpacing: '0.07em',
              marginBottom: 10,
            }}>
              Datos del Paciente
            </div>
            <FilaPDF etiqueta="Nombre" valor={paciente.nombre_completo} />
            {paciente.fecha_nacimiento && (
              <FilaPDF etiqueta="Fecha nac." valor={formatearFecha(paciente.fecha_nacimiento)} />
            )}
            <FilaPDF etiqueta="Edad" valor={calcularEdad(paciente.fecha_nacimiento)} />
            {paciente.dpi && (
              <FilaPDF etiqueta="DPI" valor={paciente.dpi} />
            )}
          </div>

          {/* Profesional */}
          <div style={{
            flex: 1,
            background: '#f0f7ff',
            borderRadius: 8,
            padding: '14px 18px',
            border: '0.5px solid #c5ddf5',
          }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: '#1a6bbd',
              textTransform: 'uppercase', letterSpacing: '0.07em',
              marginBottom: 10,
            }}>
              Prescrito por
            </div>
            <FilaPDF
              etiqueta="Profesional"
              valor={dentista
                ? `Dr(a). ${dentista.nombre} ${dentista.apellido ?? ''}`.trim()
                : '—'}
            />
            <FilaPDF
              etiqueta="Colegiado"
              valor={dentista?.numero_colegiado ?? '________________________'}
            />
          </div>
        </div>

        {/* ─── MEDICAMENTOS ────────────────────────────────────────── */}
        <div style={{ marginBottom: 26 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: '#0d3d6e',
            textTransform: 'uppercase', letterSpacing: '0.06em',
            marginBottom: 10, paddingBottom: 6,
            borderBottom: '0.5px solid #c5ddf5',
          }}>
            Medicamentos Prescritos
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#e8f4ff' }}>
                {['Medicamento', 'Dosis', 'Frecuencia', 'Duración'].map((col) => (
                  <th
                    key={col}
                    style={{
                      padding: '8px 12px', textAlign: 'left',
                      fontSize: 10, fontWeight: 700, color: '#0d3d6e',
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {receta.medicamentos.map((med, idx) => (
                <tr key={idx} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f7faff' }}>
                  <td style={{ padding: '9px 12px', borderBottom: '0.5px solid #e0eef8', fontWeight: 500 }}>
                    {med.nombre || '—'}
                  </td>
                  <td style={{ padding: '9px 12px', borderBottom: '0.5px solid #e0eef8', color: '#444' }}>
                    {med.dosis || '—'}
                  </td>
                  <td style={{ padding: '9px 12px', borderBottom: '0.5px solid #e0eef8', color: '#444' }}>
                    {med.frecuencia || '—'}
                  </td>
                  <td style={{ padding: '9px 12px', borderBottom: '0.5px solid #e0eef8', color: '#444' }}>
                    {med.duracion || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ─── INDICACIONES GENERALES ──────────────────────────────── */}
        {receta.indicaciones_generales && (
          <div style={{ marginBottom: 32 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: '#0d3d6e',
              textTransform: 'uppercase', letterSpacing: '0.06em',
              marginBottom: 8, paddingBottom: 6,
              borderBottom: '0.5px solid #c5ddf5',
            }}>
              Indicaciones Generales
            </div>
            <div style={{
              fontSize: 13, color: '#333', lineHeight: 1.75,
              background: '#f7faff', borderRadius: 6, padding: '12px 14px',
              border: '0.5px solid #e0eef8',
            }}>
              {receta.indicaciones_generales}
            </div>
          </div>
        )}

        {/* ─── FIRMA ───────────────────────────────────────────────── */}
        <div style={{ marginTop: 44, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ textAlign: 'center', width: 240 }}>
            <div style={{ paddingBottom: 44, borderBottom: '1.5px solid #0d3d6e' }} />
            <div style={{ fontSize: 12, fontWeight: 600, color: '#0d3d6e', marginTop: 8 }}>
              Firma y Sello del Profesional
            </div>
            <div style={{ fontSize: 11, color: '#5a8ab0', marginTop: 4 }}>
              Válida hasta: {formatearFecha(receta.fecha_vencimiento)}
            </div>
          </div>
        </div>

        {/* ─── PIE DE PÁGINA ───────────────────────────────────────── */}
        <div style={{
          marginTop: 36, paddingTop: 12,
          borderTop: '0.5px solid #e0eef8',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ fontSize: 10, color: '#aaa' }}>
            Documento de uso médico exclusivo · Presentar original en farmacia
          </div>
          <div style={{ fontSize: 10, color: '#c5ddf5', fontWeight: 600, letterSpacing: '0.03em' }}>
            ClinicaApp · Strategic Solutions GT
          </div>
        </div>
      </div>
    )
  }
)

RecetaPDF.displayName = 'RecetaPDF'
export default RecetaPDF
