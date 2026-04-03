'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { EMPRESA_ID } from '@/lib/config'

// ── Tipos ──────────────────────────────────────────────────────────────────

interface FilaPermiso {
  id: string
  rol: string
  modulo: string
  permitido: boolean
}

type EstadoCelda = 'guardando' | 'ok'

// ── Constantes ─────────────────────────────────────────────────────────────

const MODULOS: { modulo: string; nombre: string }[] = [
  { modulo: 'dashboard',     nombre: 'Inicio'        },
  { modulo: 'pacientes',     nombre: 'Pacientes'     },
  { modulo: 'agenda',        nombre: 'Citas'         },
  { modulo: 'expediente',    nombre: 'Expedientes'   },
  { modulo: 'cobros',        nombre: 'Cobros'        },
  { modulo: 'contabilidad',  nombre: 'Contabilidad'  },
  { modulo: 'inventario',    nombre: 'Inventario'    },
  { modulo: 'medicos',       nombre: 'Médicos'       },
  { modulo: 'reportes',      nombre: 'Reportes'      },
  { modulo: 'configuracion', nombre: 'Configuración' },
]

const ROLES: { rol: string; nombre: string; bloqueado: boolean }[] = [
  { rol: 'admin',         nombre: 'Admin',         bloqueado: true  },
  { rol: 'dentista',      nombre: 'Dentista',      bloqueado: false },
  { rol: 'recepcionista', nombre: 'Recepcionista', bloqueado: false },
  { rol: 'asistente',     nombre: 'Asistente',     bloqueado: false },
]

// ── Sub-componente: Toggle ─────────────────────────────────────────────────

function TogglePermiso({
  activo,
  bloqueado,
  guardando,
  onCambio,
}: {
  activo: boolean
  bloqueado: boolean
  guardando: boolean
  onCambio: () => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      disabled={bloqueado || guardando}
      onClick={onCambio}
      style={{
        width: 40,
        height: 22,
        borderRadius: 11,
        border: 'none',
        background: activo ? '#2ecc8a' : '#c5ddf5',
        cursor: bloqueado || guardando ? 'not-allowed' : 'pointer',
        position: 'relative',
        opacity: bloqueado ? 0.65 : 1,
        transition: 'background 0.2s',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: activo ? 21 : 3,
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: '#ffffff',
          transition: 'left 0.15s',
        }}
      />
    </button>
  )
}

// ── Página ─────────────────────────────────────────────────────────────────

export default function PaginaPermisos() {
  const [permisos, setPermisos]         = useState<FilaPermiso[]>([])
  const [cargando, setCargando]         = useState(true)
  const [celdas, setCeldas]             = useState<Record<string, EstadoCelda>>({})
  const [toastError, setToastError]     = useState<string | null>(null)

  // ── Carga inicial ──────────────────────────────────────────────────────

  useEffect(() => {
    supabase
      .from('rol_permisos')
      .select('id, rol, modulo, permitido')
      .eq('empresa_id', EMPRESA_ID)
      .eq('accion', 'ver')
      .then(({ data, error }) => {
        if (error) {
          console.error('Error al cargar permisos:', error)
        } else {
          setPermisos((data ?? []) as FilaPermiso[])
        }
        setCargando(false)
      })
  }, [])

  // ── Helper: obtener fila ───────────────────────────────────────────────

  function getPermiso(modulo: string, rol: string): FilaPermiso | undefined {
    return permisos.find((p) => p.modulo === modulo && p.rol === rol)
  }

  // ── Cambiar permiso ────────────────────────────────────────────────────

  async function cambiarPermiso(id: string, nuevoValor: boolean) {
    const valorAnterior = permisos.find((p) => p.id === id)?.permitido

    // Actualización optimista
    setPermisos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, permitido: nuevoValor } : p))
    )
    setCeldas((prev) => ({ ...prev, [id]: 'guardando' }))
    setToastError(null)

    const { error } = await supabase
      .from('rol_permisos')
      .update({ permitido: nuevoValor })
      .eq('id', id)

    if (error) {
      console.error('Error al actualizar permiso:', error)
      // Revertir cambio optimista
      setPermisos((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, permitido: valorAnterior ?? !nuevoValor } : p
        )
      )
      setCeldas((prev) => {
        const n = { ...prev }
        delete n[id]
        return n
      })
      setToastError('Ocurrió un error al guardar. Por favor intente de nuevo.')
    } else {
      setCeldas((prev) => ({ ...prev, [id]: 'ok' }))
      setTimeout(() => {
        setCeldas((prev) => {
          const n = { ...prev }
          delete n[id]
          return n
        })
      }, 2000)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  if (cargando) {
    return (
      <div style={{ padding: 32, color: '#5a8ab0', fontSize: 14 }}>
        Cargando permisos...
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 860 }}>

      {/* Breadcrumb */}
      <p style={{ fontSize: 13, color: '#5a8ab0', marginBottom: 8 }}>
        Configuración › Permisos
      </p>

      {/* Título */}
      <h1 style={{ fontSize: 24, fontWeight: 600, color: '#0d3d6e', margin: '0 0 4px' }}>
        Permisos por Rol
      </h1>
      <p style={{ fontSize: 14, color: '#5a8ab0', margin: '0 0 20px' }}>
        Configure qué módulos puede ver cada rol en su clínica.
      </p>

      {/* Banner de advertencia */}
      <div style={{
        background: '#fff8e8',
        border: '0.5px solid #f0c040',
        borderRadius: 8,
        padding: '10px 16px',
        color: '#7a5500',
        fontSize: 13,
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span style={{ fontSize: 15 }}>⚠</span>
        Los cambios de permisos aplican la próxima vez que cada usuario inicie sesión.
      </div>

      {/* Toast de error */}
      {toastError && (
        <div style={{
          background: '#fff0f0',
          border: '0.5px solid #e84040',
          borderRadius: 8,
          padding: '10px 16px',
          color: '#e84040',
          fontSize: 13,
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          {toastError}
          <button
            onClick={() => setToastError(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e84040', fontSize: 16, lineHeight: 1 }}
          >×</button>
        </div>
      )}

      {/* Tabla de permisos */}
      <div style={{
        background: '#ffffff',
        border: '0.5px solid #c5ddf5',
        borderRadius: 12,
        overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>

          {/* Encabezado */}
          <thead>
            <tr style={{ background: '#f0f7ff' }}>
              <th style={{
                width: '34%',
                padding: '12px 20px',
                textAlign: 'left',
                fontSize: 13,
                fontWeight: 600,
                color: '#0d3d6e',
                borderBottom: '0.5px solid #e0eef8',
              }}>
                Módulo
              </th>
              {ROLES.map((r) => (
                <th
                  key={r.rol}
                  style={{
                    width: `${66 / ROLES.length}%`,
                    padding: '12px 16px',
                    textAlign: 'center',
                    fontSize: 13,
                    fontWeight: 600,
                    color: r.bloqueado ? '#5a8ab0' : '#0d3d6e',
                    borderBottom: '0.5px solid #e0eef8',
                    borderLeft: '0.5px solid #e0eef8',
                  }}
                >
                  {r.nombre}
                  {r.bloqueado && (
                    <span style={{
                      display: 'block',
                      fontSize: 10,
                      fontWeight: 400,
                      color: '#5a8ab0',
                      marginTop: 2,
                    }}>
                      acceso total
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>

          {/* Filas */}
          <tbody>
            {MODULOS.map(({ modulo, nombre }, idx) => (
              <tr
                key={modulo}
                style={{ background: idx % 2 === 0 ? '#ffffff' : '#f7faff' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#e8f4ff' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = idx % 2 === 0 ? '#ffffff' : '#f7faff' }}
              >
                {/* Nombre del módulo */}
                <td style={{
                  padding: '12px 20px',
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#0d3d6e',
                  borderBottom: '0.5px solid #e0eef8',
                }}>
                  {nombre}
                </td>

                {/* Toggle por rol */}
                {ROLES.map((r) => {
                  const fila = getPermiso(modulo, r.rol)
                  if (!fila) return (
                    <td
                      key={r.rol}
                      style={{
                        padding: '12px 16px',
                        textAlign: 'center',
                        borderBottom: '0.5px solid #e0eef8',
                        borderLeft: '0.5px solid #e0eef8',
                      }}
                    />
                  )

                  const estadoCelda = celdas[fila.id]

                  return (
                    <td
                      key={r.rol}
                      style={{
                        padding: '12px 16px',
                        textAlign: 'center',
                        borderBottom: '0.5px solid #e0eef8',
                        borderLeft: '0.5px solid #e0eef8',
                      }}
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <TogglePermiso
                          activo={r.bloqueado ? true : fila.permitido}
                          bloqueado={r.bloqueado}
                          guardando={estadoCelda === 'guardando'}
                          onCambio={() => cambiarPermiso(fila.id, !fila.permitido)}
                        />
                        {/* Indicador de guardado */}
                        {estadoCelda === 'guardando' && (
                          <span style={{ fontSize: 11, color: '#5a8ab0' }}>...</span>
                        )}
                        {estadoCelda === 'ok' && (
                          <span style={{ fontSize: 13, color: '#2ecc8a' }}>✓</span>
                        )}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  )
}
