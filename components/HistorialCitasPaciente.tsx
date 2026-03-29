'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { EMPRESA_ID } from '@/lib/config'

// ── Tipos ──────────────────────────────────────────────────────────────────

interface CitaHistorial {
  id: string
  fecha_hora: string
  duracion_min: number
  estado: string
  precio_acordado: number | null
  notas_previas: string | null
  tratamiento: { nombre: string; color: string | null } | null
  dentista: { nombre: string; apellido: string | null; numero_colegiado?: string | null } | null
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatearFechaHora(iso: string): string {
  const d = new Date(iso)
  const fecha = d.toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const hora  = d.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', hour12: true })
  return `${fecha}  ${hora}`
}

const CONFIG_ESTADO: Record<string, { etiqueta: string; bg: string; color: string }> = {
  agendada:    { etiqueta: 'Agendada',    bg: '#fff8e8', color: '#7a5500' },
  confirmada:  { etiqueta: 'Confirmada',  bg: '#e8f4ff', color: '#0d3d6e' },
  en_curso:    { etiqueta: 'En curso',    bg: '#e8f4ff', color: '#1a6bbd' },
  completada:  { etiqueta: 'Completada',  bg: '#e8fff5', color: '#0a5535' },
  cancelada:   { etiqueta: 'Cancelada',   bg: '#fff0f0', color: '#7a1a1a' },
  no_asistio:  { etiqueta: 'No asistió',  bg: '#fff0f0', color: '#7a1a1a' },
  reprogramada:{ etiqueta: 'Reprogramada',bg: '#f5e8ff', color: '#5a1a8a' },
}

// ── Componente ─────────────────────────────────────────────────────────────

export default function HistorialCitasPaciente({ pacienteId }: { pacienteId: string }) {
  const router = useRouter()
  const [citas, setCitas]                   = useState<CitaHistorial[]>([])
  const [cargando, setCargando]             = useState(true)
  const [error, setError]                   = useState<string | null>(null)
  const [conteoArchivos, setConteoArchivos] = useState<Record<string, number>>({})

  useEffect(() => {
    async function cargar() {
      setCargando(true)
      setError(null)
      try {
        const { data, error: err } = await supabase
          .from('citas')
          .select(`
            id, fecha_hora, duracion_min, estado, precio_acordado, notas_previas,
            tratamiento:tratamiento_tipos!tratamiento_id(nombre, color),
            dentista:usuarios!dentista_id(nombre, apellido)
          `)
          .eq('empresa_id', EMPRESA_ID)
          .eq('paciente_id', pacienteId)
          .order('fecha_hora', { ascending: false })

        if (err) throw err
        const listaCitas = (data as unknown as CitaHistorial[]) ?? []
        setCitas(listaCitas)

        // Cargar conteo de archivos por cita (una sola consulta)
        if (listaCitas.length > 0) {
          const ids = listaCitas.map((c) => c.id)
          const { data: imgData } = await supabase
            .from('expediente_imagenes')
            .select('cita_id')
            .in('cita_id', ids)
            .eq('empresa_id', EMPRESA_ID)

          const conteo: Record<string, number> = {}
          for (const row of (imgData ?? []) as { cita_id: string }[]) {
            conteo[row.cita_id] = (conteo[row.cita_id] ?? 0) + 1
          }
          setConteoArchivos(conteo)
        }
      } catch (e) {
        console.error('Error al cargar historial de citas:', e)
        setError('Ocurrió un error al cargar el historial.')
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [pacienteId])

  if (cargando) {
    return (
      <div style={{ textAlign: 'center', padding: '24px 0', color: '#5a8ab0', fontSize: 14 }}>
        Cargando...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        background: '#fff0f0', border: '0.5px solid #e84040', borderRadius: 8,
        padding: '12px 16px', color: '#e84040', fontSize: 13,
      }}>
        {error}
      </div>
    )
  }

  if (citas.length === 0) {
    return (
      <div style={{
        textAlign: 'center', padding: '32px 20px',
        border: '0.5px dashed #c5ddf5', borderRadius: 8,
      }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>📅</div>
        <div style={{ fontSize: 14, fontWeight: 500, color: '#0d3d6e', marginBottom: 4 }}>
          Sin citas registradas
        </div>
        <div style={{ fontSize: 13, color: '#5a8ab0' }}>
          Este paciente aún no tiene citas agendadas.
        </div>
      </div>
    )
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="ct-table">
        <thead>
          <tr>
            <th>Fecha y hora</th>
            <th>Tratamiento</th>
            <th>Dentista</th>
            <th>Estado</th>
            <th>Precio</th>
            <th>Archivos</th>
            <th style={{ width: 130 }}></th>
          </tr>
        </thead>
        <tbody>
          {citas.map((cita) => {
            const estadoCfg = CONFIG_ESTADO[cita.estado] ?? { etiqueta: cita.estado, bg: '#f0f7ff', color: '#0d3d6e' }
            const puedeVerExpediente = cita.estado === 'completada' || cita.estado === 'en_curso'
            return (
              <tr key={cita.id} style={{ cursor: 'default' }}>
                <td style={{ fontFamily: 'monospace', fontSize: 13, whiteSpace: 'nowrap' }}>
                  {formatearFechaHora(cita.fecha_hora)}
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {cita.tratamiento?.color && (
                      <span style={{
                        display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
                        background: cita.tratamiento.color, flexShrink: 0,
                      }} />
                    )}
                    <span>{cita.tratamiento?.nombre ?? '—'}</span>
                  </div>
                </td>
                <td style={{ color: '#5a8ab0', fontSize: 13 }}>
                  {cita.dentista
                    ? `Dr(a). ${cita.dentista.nombre} ${cita.dentista.apellido ?? ''}`.trim()
                    : '—'}
                </td>
                <td>
                  <span style={{
                    display: 'inline-block', padding: '3px 10px', borderRadius: 20,
                    background: estadoCfg.bg, color: estadoCfg.color,
                    fontSize: 12, fontWeight: 600,
                  }}>
                    {estadoCfg.etiqueta}
                  </span>
                </td>
                <td style={{ color: '#0d3d6e', fontSize: 13 }}>
                  {cita.precio_acordado != null
                    ? `Q ${Number(cita.precio_acordado).toLocaleString('es-GT', { minimumFractionDigits: 2 })}`
                    : '—'}
                </td>
                <td>
                  {(conteoArchivos[cita.id] ?? 0) > 0 ? (
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: 20,
                      background: '#e8f4ff', color: '#0d3d6e',
                      fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap',
                    }}>
                      📎 {conteoArchivos[cita.id]} {conteoArchivos[cita.id] === 1 ? 'archivo' : 'archivos'}
                    </span>
                  ) : (
                    <span style={{ color: '#5a8ab0', fontSize: 13 }}>—</span>
                  )}
                </td>
                <td>
                  {puedeVerExpediente && (
                    <button
                      className="ct-btn ct-btn-secondary ct-btn-sm"
                      onClick={() => router.push(`/expediente/${cita.id}`)}
                    >
                      Ver expediente
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
