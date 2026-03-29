'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { EMPRESA_ID } from '@/lib/config'
import ModalNuevaCita from '@/components/ModalNuevaCita'

// ── Tipos ──────────────────────────────────────────────────────────────────

interface PacienteResumen {
  id: string
  primer_nombre: string
  segundo_nombre: string | null
  primer_apellido: string
  segundo_apellido: string | null
  dpi: string | null
  telefono: string | null
  fecha_nacimiento: string | null
  activo: boolean
  creado_en: string
}

// ── Helpers ────────────────────────────────────────────────────────────────

function nombreCompleto(p: PacienteResumen): string {
  return [p.primer_nombre, p.segundo_nombre, p.primer_apellido, p.segundo_apellido]
    .filter(Boolean)
    .join(' ')
}

function calcularEdad(fechaNacimiento: string | null): string {
  if (!fechaNacimiento) return '—'
  const hoy = new Date()
  const nac = new Date(fechaNacimiento)
  let edad = hoy.getFullYear() - nac.getFullYear()
  if (
    hoy.getMonth() < nac.getMonth() ||
    (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate())
  ) edad--
  return `${edad} años`
}

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-GT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

const POR_PAGINA = 20

// ── Componente ─────────────────────────────────────────────────────────────

export default function ListaPacientes({ registrado }: { registrado?: boolean }) {
  const router = useRouter()

  // Estado de búsqueda (lo que el usuario escribe)
  const [inputBusqueda, setInputBusqueda] = useState('')
  // Estado de búsqueda ya debounced (dispara el fetch)
  const [busqueda, setBusqueda] = useState('')
  const [pagina, setPagina] = useState(1)

  const [pacientes, setPacientes] = useState<PacienteResumen[]>([])
  const [total, setTotal] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mostrarExito, setMostrarExito] = useState(registrado ?? false)
  const [pacienteParaCita, setPacienteParaCita] = useState<PacienteResumen | null>(null)

  // Ref para cancelar fetches anteriores si el usuario sigue escribiendo
  const fetchId = useRef(0)

  // Debounce: actualizar `busqueda` 350ms después del último keypress
  useEffect(() => {
    const t = setTimeout(() => {
      setBusqueda(inputBusqueda)
      setPagina(1) // siempre volver a pág 1 al buscar
    }, inputBusqueda ? 350 : 0)
    return () => clearTimeout(t)
  }, [inputBusqueda])

  // Fetch cada vez que cambia busqueda o pagina
  useEffect(() => {
    const id = ++fetchId.current

    async function cargar() {
      setCargando(true)
      setError(null)

      try {
        const desde = (pagina - 1) * POR_PAGINA
        const hasta = desde + POR_PAGINA - 1

        let query = supabase
          .from('pacientes')
          .select(
            'id, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, dpi, telefono, fecha_nacimiento, activo, creado_en',
            { count: 'exact' }
          )
          .eq('empresa_id', EMPRESA_ID)
          .order('primer_apellido', { ascending: true })
          .order('primer_nombre',   { ascending: true })
          .range(desde, hasta)

        const termino = busqueda.trim()
        if (termino) {
          query = query.or(
            `primer_nombre.ilike.%${termino}%,` +
            `segundo_nombre.ilike.%${termino}%,` +
            `primer_apellido.ilike.%${termino}%,` +
            `segundo_apellido.ilike.%${termino}%,` +
            `dpi.ilike.%${termino}%`
          )
        }

        const { data, error: supabaseError, count } = await query

        // Ignorar respuestas de fetches anteriores
        if (id !== fetchId.current) return

        if (supabaseError) throw supabaseError

        setPacientes(data ?? [])
        setTotal(count ?? 0)
      } catch (err) {
        if (id !== fetchId.current) return
        console.error('Error al cargar pacientes:', err)
        setError('Ocurrió un error al cargar los pacientes. Por favor intente de nuevo.')
      } finally {
        if (id === fetchId.current) setCargando(false)
      }
    }

    cargar()
  }, [busqueda, pagina])

  // Ocultar mensaje de éxito tras 5 s
  useEffect(() => {
    if (!mostrarExito) return
    const t = setTimeout(() => setMostrarExito(false), 5000)
    return () => clearTimeout(t)
  }, [mostrarExito])

  const totalPaginas = Math.ceil(total / POR_PAGINA)

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div>

      {/* Éxito */}
      {mostrarExito && (
        <div style={{
          background: '#e8fff5', border: '0.5px solid #2ecc8a', borderRadius: 8,
          padding: '12px 16px', color: '#0a5535', marginBottom: 20, fontSize: 14,
        }}>
          Paciente registrado correctamente.
        </div>
      )}

      {/* Barra superior: búsqueda + contador */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        marginBottom: 20, flexWrap: 'wrap',
      }}>
        {/* Input búsqueda */}
        <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: 440 }}>
          <span style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            color: '#5a8ab0', fontSize: 15, pointerEvents: 'none', userSelect: 'none',
          }}>
            🔍
          </span>
          <input
            type="text"
            value={inputBusqueda}
            onChange={(e) => setInputBusqueda(e.target.value)}
            placeholder="Buscar por nombre o DPI..."
            className="ct-input"
            style={{ paddingLeft: 38 }}
          />
        </div>

        {/* Contador */}
        <span style={{ color: '#5a8ab0', fontSize: 13, whiteSpace: 'nowrap' }}>
          {cargando
            ? 'Cargando...'
            : `${total} paciente${total !== 1 ? 's' : ''}`}
        </span>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: '#fff0f0', border: '0.5px solid #e84040', borderRadius: 8,
          padding: '12px 16px', color: '#e84040', marginBottom: 20, fontSize: 14,
        }}>
          {error}
        </div>
      )}

      {/* Tabla */}
      <div className="ct-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="ct-table">
            <thead>
              <tr>
                <th>Nombre completo</th>
                <th>DPI</th>
                <th>Teléfono</th>
                <th>Edad</th>
                <th>Registrado</th>
                <th>Estado</th>
                <th style={{ width: 44 }}></th>
              </tr>
            </thead>
            <tbody>
              {cargando && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#5a8ab0' }}>
                    Cargando...
                  </td>
                </tr>
              )}

              {!cargando && pacientes.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#5a8ab0' }}>
                    {busqueda.trim()
                      ? `No se encontraron resultados para "${busqueda.trim()}"`
                      : 'No hay pacientes registrados aún'}
                  </td>
                </tr>
              )}

              {!cargando && pacientes.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => router.push(`/pacientes/${p.id}`)}
                  title="Ver expediente del paciente"
                >
                  <td style={{ fontWeight: 500 }}>{nombreCompleto(p)}</td>
                  <td style={{ fontFamily: 'monospace', color: '#5a8ab0', letterSpacing: '0.05em' }}>
                    {p.dpi ?? '—'}
                  </td>
                  <td>{p.telefono ?? '—'}</td>
                  <td>{calcularEdad(p.fecha_nacimiento)}</td>
                  <td style={{ color: '#5a8ab0', fontSize: 13 }}>
                    {formatearFecha(p.creado_en)}
                  </td>
                  <td>
                    <span className={`ct-badge ${p.activo ? 'ct-badge-activo' : 'ct-badge-cancelado'}`}>
                      {p.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td onClick={(e) => e.stopPropagation()} style={{ padding: '0 8px' }}>
                    <button
                      className="ct-btn ct-btn-secondary ct-btn-sm"
                      onClick={() => setPacienteParaCita(p)}
                      title={`Agendar cita para ${nombreCompleto(p)}`}
                      style={{ padding: '0 8px', fontSize: 15 }}
                    >
                      📅
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {!cargando && totalPaginas > 1 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', borderTop: '0.5px solid #e0eef8', background: '#f7faff',
          }}>
            <span style={{ fontSize: 13, color: '#5a8ab0' }}>
              Página {pagina} de {totalPaginas}
              {' '}·{' '}
              {total} registro{total !== 1 ? 's' : ''}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="ct-btn ct-btn-secondary ct-btn-sm"
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                disabled={pagina === 1}
              >
                ← Anterior
              </button>
              <button
                className="ct-btn ct-btn-secondary ct-btn-sm"
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                disabled={pagina === totalPaginas}
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal para agendar cita desde la lista */}
      {pacienteParaCita && (
        <ModalNuevaCita
          pacientePrefijado={{
            id: pacienteParaCita.id,
            nombre: nombreCompleto(pacienteParaCita),
          }}
          onClose={() => setPacienteParaCita(null)}
          onSuccess={() => {
            setPacienteParaCita(null)
            router.push('/citas')
          }}
        />
      )}
    </div>
  )
}
