'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { EMPRESA_ID } from '@/lib/config'

// ── Tipos ────────────────────────────────────────────────────────────────────

interface FilaExpediente {
  paciente_id: string
  nombre_completo: string
  dpi: string | null
  ultima_nota_fecha: string
  ultima_cita_fecha: string
  ultimo_diagnostico: string | null
  dentista_nombre: string | null
  total_notas: number
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-GT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function formatFechaHora(iso: string): string {
  return new Date(iso).toLocaleDateString('es-GT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function PaginaExpedientes() {
  const router = useRouter()
  const [filas, setFilas]         = useState<FilaExpediente[]>([])
  const [cargando, setCargando]   = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [busqueda, setBusqueda]   = useState('')

  // ── Carga de datos ───────────────────────────────────────────────────

  useEffect(() => {
    async function cargar() {
      setCargando(true)
      setError(null)
      try {
        // Obtener todas las notas con sus citas y pacientes,
        // ordenadas por fecha desc para que la más reciente quede primero
        const { data, error: err } = await supabase
          .from('expediente_notas')
          .select(`
            creado_en,
            diagnosticos,
            paciente_id,
            cita:citas!cita_id(
              fecha_hora,
              dentista:usuarios!dentista_id(nombre, apellido)
            ),
            paciente:pacientes!paciente_id(
              primer_nombre, segundo_nombre,
              primer_apellido, segundo_apellido,
              dpi
            )
          `)
          .eq('empresa_id', EMPRESA_ID)
          .order('creado_en', { ascending: false })

        if (err) throw err

        // Agrupar por paciente_id — conservar solo la fila más reciente por paciente
        const mapa = new Map<string, FilaExpediente>()

        for (const nota of (data ?? [])) {
          if (mapa.has(nota.paciente_id)) {
            // Ya tenemos una fila para este paciente (la más reciente); solo sumar nota
            const existente = mapa.get(nota.paciente_id)!
            existente.total_notas += 1
            continue
          }

          const pac = nota.paciente as unknown as {
            primer_nombre: string; segundo_nombre: string | null
            primer_apellido: string; segundo_apellido: string | null
            dpi: string | null
          } | null

          const cita = nota.cita as unknown as {
            fecha_hora: string
            dentista: { nombre: string; apellido: string | null } | null
          } | null

          const diagnosticosArr = Array.isArray(nota.diagnosticos)
            ? (nota.diagnosticos as { descripcion?: string; nombre?: string }[])
            : []
          const primerDiag = diagnosticosArr[0]
            ? (diagnosticosArr[0].descripcion ?? diagnosticosArr[0].nombre ?? null)
            : null

          const nombreCompleto = pac
            ? [pac.primer_nombre, pac.segundo_nombre, pac.primer_apellido, pac.segundo_apellido]
                .filter(Boolean).join(' ')
            : '—'

          const dentistaNombre = cita?.dentista
            ? `Dr(a). ${cita.dentista.nombre}${cita.dentista.apellido ? ' ' + cita.dentista.apellido : ''}`
            : null

          mapa.set(nota.paciente_id, {
            paciente_id:        nota.paciente_id,
            nombre_completo:    nombreCompleto,
            dpi:                pac?.dpi ?? null,
            ultima_nota_fecha:  nota.creado_en,
            ultima_cita_fecha:  cita?.fecha_hora ?? nota.creado_en,
            ultimo_diagnostico: primerDiag,
            dentista_nombre:    dentistaNombre,
            total_notas:        1,
          })
        }

        setFilas(Array.from(mapa.values()))
      } catch (e) {
        console.error('Error al cargar expedientes:', e)
        setError('Ocurrió un error al cargar los expedientes. Por favor intente de nuevo.')
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [])

  // ── Filtrado por búsqueda ────────────────────────────────────────────

  const filasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return filas
    return filas.filter(
      (f) =>
        f.nombre_completo.toLowerCase().includes(q) ||
        (f.dpi && f.dpi.includes(q))
    )
  }, [filas, busqueda])

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <div>
      {/* Encabezado */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: '#0d3d6e', margin: '0 0 4px' }}>
          Expedientes Clínicos
        </h1>
        <div style={{ fontSize: 13, color: '#5a8ab0' }}>
          Pacientes con historial clínico registrado
        </div>
      </div>

      {/* Barra de búsqueda */}
      <div style={{ marginBottom: 20, maxWidth: 440 }}>
        <div style={{ position: 'relative' }}>
          <span style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            fontSize: 16, color: '#5a8ab0', pointerEvents: 'none',
          }}>
            🔍
          </span>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o DPI..."
            style={{
              width: '100%', height: 40, padding: '0 12px 0 38px', fontSize: 14,
              border: '0.5px solid #c5ddf5', borderRadius: 8, background: '#ffffff',
              color: '#0d3d6e', outline: 'none', boxSizing: 'border-box',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#1a6bbd'
              e.target.style.boxShadow = '0 0 0 3px rgba(26,107,189,0.15)'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#c5ddf5'
              e.target.style.boxShadow = 'none'
            }}
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda('')}
              style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 16, color: '#5a8ab0', lineHeight: 1, padding: 2,
              }}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Estado de carga */}
      {cargando && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#5a8ab0', fontSize: 14 }}>
          Cargando expedientes...
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          background: '#fff0f0', border: '0.5px solid #e84040', borderRadius: 8,
          padding: '12px 16px', color: '#e84040', fontSize: 13,
        }}>
          {error}
        </div>
      )}

      {/* Contenido */}
      {!cargando && !error && (
        filasFiltradas.length === 0 ? (
          <div style={{
            background: '#ffffff', border: '0.5px solid #e0eef8', borderRadius: 12,
            padding: '56px 24px', textAlign: 'center',
          }}>
            {busqueda ? (
              <>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#0d3d6e', marginBottom: 6 }}>
                  Sin resultados
                </div>
                <div style={{ fontSize: 14, color: '#5a8ab0' }}>
                  No se encontraron expedientes para{' '}
                  <strong>&quot;{busqueda}&quot;</strong>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#0d3d6e', marginBottom: 8 }}>
                  Aún no hay expedientes registrados
                </div>
                <div style={{ fontSize: 14, color: '#5a8ab0', maxWidth: 420, margin: '0 auto' }}>
                  Los expedientes se generan desde el perfil del paciente o al completar una cita.
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Contador */}
            <div style={{ fontSize: 13, color: '#5a8ab0', marginBottom: 10 }}>
              {filasFiltradas.length}{' '}
              {filasFiltradas.length === 1 ? 'paciente con expediente' : 'pacientes con expediente'}
              {busqueda && ` · filtrado por "${busqueda}"`}
            </div>

            {/* Tabla */}
            <div style={{ overflowX: 'auto' }}>
              <table className="ct-table">
                <thead>
                  <tr>
                    <th>Paciente</th>
                    <th>DPI</th>
                    <th>Última cita</th>
                    <th>Último diagnóstico</th>
                    <th>Dentista</th>
                    <th>Notas</th>
                    <th>Última actualización</th>
                  </tr>
                </thead>
                <tbody>
                  {filasFiltradas.map((fila) => (
                    <tr
                      key={fila.paciente_id}
                      onClick={() => router.push(`/pacientes/${fila.paciente_id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <span style={{ fontWeight: 600, color: '#0d3d6e' }}>
                          {fila.nombre_completo}
                        </span>
                      </td>
                      <td style={{ color: '#5a8ab0', fontSize: 13 }}>
                        {fila.dpi ?? '—'}
                      </td>
                      <td style={{ color: '#5a8ab0', fontSize: 13, whiteSpace: 'nowrap' }}>
                        {formatFechaHora(fila.ultima_cita_fecha)}
                      </td>
                      <td style={{ fontSize: 13, color: '#0d3d6e', maxWidth: 220 }}>
                        {fila.ultimo_diagnostico ? (
                          <span style={{
                            display: 'inline-block', padding: '2px 8px', borderRadius: 10,
                            background: '#e8f4ff', color: '#0d3d6e', fontSize: 12,
                          }}>
                            {fila.ultimo_diagnostico}
                          </span>
                        ) : (
                          <span style={{ color: '#c5ddf5' }}>—</span>
                        )}
                      </td>
                      <td style={{ fontSize: 13, color: '#5a8ab0', whiteSpace: 'nowrap' }}>
                        {fila.dentista_nombre ?? '—'}
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-block', padding: '2px 10px', borderRadius: 20,
                          background: '#f0f7ff', color: '#1a6bbd',
                          fontSize: 12, fontWeight: 600,
                        }}>
                          {fila.total_notas}
                        </span>
                      </td>
                      <td style={{ color: '#5a8ab0', fontSize: 13, whiteSpace: 'nowrap' }}>
                        {formatFecha(fila.ultima_nota_fecha)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )
      )}
    </div>
  )
}
