'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { EMPRESA_ID } from '@/lib/config'

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface MedicoFila {
  id: string
  nombre: string
  apellido: string | null
  email: string
  activo: boolean
  sucursal_id: string | null
  sucursales: { nombre: string } | null
}

interface Medico {
  id: string
  nombre: string
  apellido: string | null
  email: string
  activo: boolean
  sucursal_nombre: string | null
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function ListaMedicos({ registrado }: { registrado?: boolean }) {
  const router = useRouter()
  const [inputBusqueda, setInputBusqueda] = useState('')
  const [busqueda, setBusqueda]           = useState('')
  const [medicos, setMedicos]             = useState<Medico[]>([])
  const [cargando, setCargando]           = useState(true)
  const [error, setError]                 = useState<string | null>(null)
  const [mostrarExito, setMostrarExito]   = useState(registrado ?? false)
  const fetchId                           = useRef(0)

  // Debounce 350 ms
  useEffect(() => {
    const t = setTimeout(() => setBusqueda(inputBusqueda), inputBusqueda ? 350 : 0)
    return () => clearTimeout(t)
  }, [inputBusqueda])

  // Cargar médicos
  useEffect(() => {
    const id = ++fetchId.current

    async function cargar() {
      setCargando(true)
      setError(null)
      try {
        let query = supabase
          .from('usuarios')
          .select('id, nombre, apellido, email, activo, sucursal_id, sucursales(nombre)')
          .eq('empresa_id', EMPRESA_ID)
          .eq('rol', 'dentista')
          .order('nombre', { ascending: true })

        const termino = busqueda.trim()
        if (termino) {
          query = query.or(
            `nombre.ilike.%${termino}%,apellido.ilike.%${termino}%,email.ilike.%${termino}%`
          )
        }

        const { data, error: err } = await query
        if (id !== fetchId.current) return
        if (err) throw err

        const lista: Medico[] = ((data ?? []) as MedicoFila[]).map((u) => ({
          id:             u.id,
          nombre:         u.nombre,
          apellido:       u.apellido,
          email:          u.email,
          activo:         u.activo,
          sucursal_nombre: u.sucursales?.nombre ?? null,
        }))
        setMedicos(lista)
      } catch (e) {
        if (id !== fetchId.current) return
        console.error('Error al cargar médicos:', e)
        setError('Ocurrió un error al cargar los médicos. Por favor intente de nuevo.')
      } finally {
        if (id === fetchId.current) setCargando(false)
      }
    }

    cargar()
  }, [busqueda])

  // Auto-ocultar toast de éxito
  useEffect(() => {
    if (!mostrarExito) return
    const t = setTimeout(() => setMostrarExito(false), 5000)
    return () => clearTimeout(t)
  }, [mostrarExito])

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>

      {/* Toast de éxito */}
      {mostrarExito && (
        <div style={{
          background: '#e8fff5', border: '0.5px solid #2ecc8a', borderRadius: 8,
          padding: '12px 16px', color: '#0a5535', marginBottom: 20, fontSize: 14,
        }}>
          ✓ Médico registrado correctamente.
        </div>
      )}

      {/* Barra de búsqueda */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
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
            placeholder="Buscar por nombre o correo..."
            className="ct-input"
            style={{ paddingLeft: 38 }}
          />
        </div>
        <span style={{ color: '#5a8ab0', fontSize: 13, whiteSpace: 'nowrap' }}>
          {cargando
            ? 'Cargando...'
            : `${medicos.length} médico${medicos.length !== 1 ? 's' : ''}`}
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
                <th>Correo electrónico</th>
                <th>Sucursal asignada</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {cargando && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: 40, color: '#5a8ab0' }}>
                    Cargando...
                  </td>
                </tr>
              )}

              {!cargando && medicos.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: 40, color: '#5a8ab0' }}>
                    {busqueda.trim()
                      ? `No se encontraron resultados para "${busqueda.trim()}"`
                      : 'No hay médicos registrados'}
                  </td>
                </tr>
              )}

              {!cargando && medicos.map((m) => (
                <tr
                  key={m.id}
                  onClick={() => router.push(`/medicos/${m.id}`)}
                  style={{ cursor: 'pointer' }}
                  title="Ver perfil del médico"
                >
                  <td style={{ fontWeight: 500 }}>
                    {m.nombre}{m.apellido ? ` ${m.apellido}` : ''}
                  </td>
                  <td style={{ color: '#5a8ab0' }}>{m.email}</td>
                  <td>
                    {m.sucursal_nombre ?? (
                      <span style={{ color: '#5a8ab0' }}>—</span>
                    )}
                  </td>
                  <td>
                    {m.activo ? (
                      <span className="ct-badge ct-badge-activo">Activo</span>
                    ) : (
                      <span style={{
                        display: 'inline-block', padding: '2px 10px', borderRadius: 20,
                        fontSize: 12, fontWeight: 500,
                        background: '#f0f0f5', color: '#6b7280',
                      }}>
                        Inactivo
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
