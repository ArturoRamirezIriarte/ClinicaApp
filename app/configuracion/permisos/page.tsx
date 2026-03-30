'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { EMPRESA_ID } from '@/lib/config'

// ── Tipos ──────────────────────────────────────────────────────────────────────

type RolOpcion = 'admin' | 'dentista' | 'recepcionista' | 'asistente'

interface PermisoFila {
  id: string
  modulo: string
  accion: string
  permitido: boolean
  sobrescrito_por_saas: boolean
}

// ── Constantes ─────────────────────────────────────────────────────────────────

const ROLES: { id: RolOpcion; etiqueta: string }[] = [
  { id: 'admin',         etiqueta: 'Admin'         },
  { id: 'dentista',      etiqueta: 'Dentista'      },
  { id: 'recepcionista', etiqueta: 'Recepcionista' },
  { id: 'asistente',     etiqueta: 'Asistente'     },
]

const NOMBRE_MODULO: Record<string, string> = {
  dashboard:     'Dashboard',
  pacientes:     'Pacientes',
  agenda:        'Agenda',
  expediente:    'Expediente clínico',
  odontograma:   'Odontograma',
  cobros:        'Cobros',
  caja:          'Caja',
  inventario:    'Inventario',
  reportes:      'Reportes',
  contabilidad:  'Contabilidad',
  medicos:       'Médicos',
  configuracion: 'Configuración',
}

const NOMBRE_ACCION: Record<string, string> = {
  ver:            'Ver',
  crear:          'Crear / Registrar',
  editar:         'Editar',
  eliminar:       'Eliminar',
  anular:         'Anular',
  cancelar:       'Cancelar',
  subir_archivos: 'Subir archivos',
}

const ORDEN_MODULOS = [
  'dashboard', 'pacientes', 'agenda', 'expediente', 'odontograma',
  'cobros', 'caja', 'inventario', 'reportes', 'contabilidad', 'medicos', 'configuracion',
]

const ORDEN_ACCIONES = [
  'ver', 'crear', 'editar', 'eliminar', 'anular', 'cancelar', 'subir_archivos',
]

// ── Helpers ────────────────────────────────────────────────────────────────────

function agruparPorModulo(permisos: PermisoFila[]): Map<string, PermisoFila[]> {
  const mapa = new Map<string, PermisoFila[]>()
  for (const p of permisos) {
    if (!mapa.has(p.modulo)) mapa.set(p.modulo, [])
    mapa.get(p.modulo)!.push(p)
  }
  // Ordenar acciones dentro de cada módulo
  for (const [mod, filas] of mapa) {
    mapa.set(
      mod,
      [...filas].sort(
        (a, b) => ORDEN_ACCIONES.indexOf(a.accion) - ORDEN_ACCIONES.indexOf(b.accion)
      )
    )
  }
  return mapa
}

function modulosOrdenados(mapa: Map<string, PermisoFila[]>): string[] {
  return ORDEN_MODULOS.filter((m) => mapa.has(m))
}

// ── Sub-componente: Toggle ─────────────────────────────────────────────────────

function Toggle({
  activo,
  bloqueado,
  guardando,
  onChange,
}: {
  activo: boolean
  bloqueado: boolean
  guardando: boolean
  onChange: (val: boolean) => void
}) {
  return (
    <div
      onClick={() => { if (!bloqueado && !guardando) onChange(!activo) }}
      title={bloqueado ? 'Permiso bloqueado por el administrador del sistema' : undefined}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        background: activo ? '#1a6bbd' : '#c5ddf5',
        position: 'relative',
        cursor: bloqueado || guardando ? 'not-allowed' : 'pointer',
        opacity: guardando ? 0.6 : 1,
        transition: 'background 0.2s',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 3,
          left: activo ? 23 : 3,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: '#fff',
          transition: 'left 0.2s',
        }}
      />
    </div>
  )
}

// ── Página principal ───────────────────────────────────────────────────────────

export default function PaginaPermisos() {
  const [rolSeleccionado, setRolSeleccionado] = useState<RolOpcion>('dentista')
  const [permisos, setPermisos]               = useState<PermisoFila[]>([])
  const [cargando, setCargando]               = useState(false)
  const [errorGeneral, setErrorGeneral]       = useState<string | null>(null)
  const [savingKeys, setSavingKeys]           = useState<Set<string>>(new Set())
  const [exitoKeys, setExitoKeys]             = useState<Set<string>>(new Set())
  const [errorToast, setErrorToast]           = useState<string | null>(null)

  // ── Carga de permisos ──────────────────────────────────────────────────────

  const cargarPermisos = useCallback(async (rol: RolOpcion) => {
    setCargando(true)
    setErrorGeneral(null)
    setExitoKeys(new Set())
    try {
      const { data, error } = await supabase
        .from('rol_permisos')
        .select('id, modulo, accion, permitido, sobrescrito_por_saas')
        .eq('empresa_id', EMPRESA_ID)
        .eq('rol', rol)
        .order('modulo')
        .order('accion')

      if (error) throw error
      setPermisos((data as PermisoFila[]) ?? [])
    } catch (e) {
      console.error('Error al cargar permisos:', e)
      setErrorGeneral('Ocurrió un error al cargar los permisos. Por favor intente de nuevo.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargarPermisos(rolSeleccionado)
  }, [rolSeleccionado, cargarPermisos])

  // ── Auto-ocultar error toast ───────────────────────────────────────────────

  useEffect(() => {
    if (!errorToast) return
    const t = setTimeout(() => setErrorToast(null), 5000)
    return () => clearTimeout(t)
  }, [errorToast])

  // ── Toggle de permiso ──────────────────────────────────────────────────────

  async function togglePermiso(permiso: PermisoFila, nuevoValor: boolean) {
    const clave = `${permiso.modulo}:${permiso.accion}`

    // Actualización optimista
    setPermisos((prev) =>
      prev.map((p) => (p.id === permiso.id ? { ...p, permitido: nuevoValor } : p))
    )
    setSavingKeys((prev) => new Set(prev).add(clave))

    const { error } = await supabase
      .from('rol_permisos')
      .update({ permitido: nuevoValor, actualizado_en: new Date().toISOString() })
      .eq('id', permiso.id)
      .eq('empresa_id', EMPRESA_ID)

    setSavingKeys((prev) => {
      const s = new Set(prev)
      s.delete(clave)
      return s
    })

    if (error) {
      // Revertir
      setPermisos((prev) =>
        prev.map((p) => (p.id === permiso.id ? { ...p, permitido: !nuevoValor } : p))
      )
      setErrorToast('Error al guardar el permiso. Por favor intente de nuevo.')
      return
    }

    // Indicador de éxito breve
    setExitoKeys((prev) => new Set(prev).add(clave))
    setTimeout(() => {
      setExitoKeys((prev) => {
        const s = new Set(prev)
        s.delete(clave)
        return s
      })
    }, 2000)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const mapa         = agruparPorModulo(permisos)
  const modulosActivos = modulosOrdenados(mapa)

  return (
    <div style={{ maxWidth: 860 }}>

      {/* Breadcrumb */}
      <nav style={{ fontSize: 13, color: '#5a8ab0', marginBottom: 16 }}>
        <Link href="/configuracion" style={{ color: '#1a6bbd', textDecoration: 'none' }}>
          Configuración
        </Link>
        <span style={{ margin: '0 6px' }}>›</span>
        <span style={{ color: '#0d3d6e', fontWeight: 500 }}>Permisos</span>
      </nav>

      {/* Encabezado */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: '#0d3d6e', margin: 0 }}>
          Configuración de Permisos
        </h1>
        <p style={{ fontSize: 13, color: '#5a8ab0', marginTop: 6 }}>
          Define qué acciones puede realizar cada rol en tu clínica.
          Los cambios se guardan automáticamente.
        </p>
      </div>

      {/* Error toast */}
      {errorToast && (
        <div style={{
          background: '#fff0f0', border: '0.5px solid #e84040', borderRadius: 8,
          padding: '10px 14px', color: '#e84040', fontSize: 13, marginBottom: 20,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          {errorToast}
          <button
            onClick={() => setErrorToast(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e84040', fontSize: 16, lineHeight: 1 }}
          >
            ×
          </button>
        </div>
      )}

      {/* Tabs de roles */}
      <div style={{
        display: 'flex', gap: 0,
        background: '#ffffff', border: '0.5px solid #c5ddf5', borderRadius: 10,
        overflow: 'hidden', marginBottom: 24,
      }}>
        {ROLES.map((rol, idx) => {
          const esActivo = rolSeleccionado === rol.id
          return (
            <button
              key={rol.id}
              onClick={() => setRolSeleccionado(rol.id)}
              style={{
                flex: 1,
                height: 44,
                fontSize: 14,
                fontWeight: esActivo ? 600 : 400,
                color: esActivo ? '#ffffff' : '#5a8ab0',
                background: esActivo ? '#1a6bbd' : '#ffffff',
                border: 'none',
                borderRight: idx < ROLES.length - 1 ? '0.5px solid #c5ddf5' : 'none',
                cursor: 'pointer',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {rol.etiqueta}
              {rol.id === 'admin' && (
                <span style={{ marginLeft: 6, fontSize: 11 }}>🔒</span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Banner informativo para Admin ── */}
      {rolSeleccionado === 'admin' && !cargando && (
        <div style={{
          background: '#e8f4ff', border: '0.5px solid #c5ddf5', borderRadius: 8,
          padding: '10px 16px', marginBottom: 20, fontSize: 13, color: '#0d3d6e',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          🔒{' '}
          <span>
            El rol <strong>Admin</strong> siempre tiene acceso completo a todos los módulos.
            Estos permisos no pueden modificarse.
          </span>
        </div>
      )}

      {/* ── Estado de carga ── */}
      {cargando && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#5a8ab0', fontSize: 14 }}>
          Cargando permisos...
        </div>
      )}

      {/* ── Error general ── */}
      {errorGeneral && (
        <div style={{
          background: '#fff0f0', border: '0.5px solid #e84040', borderRadius: 8,
          padding: '12px 16px', color: '#e84040', fontSize: 13,
        }}>
          {errorGeneral}
        </div>
      )}

      {/* ── Matriz de permisos ── */}
      {!cargando && !errorGeneral && (
        modulosActivos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#5a8ab0', fontSize: 14 }}>
            No se encontraron permisos configurados para este rol.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {modulosActivos.map((modulo) => (
              <SeccionModulo
                key={modulo}
                modulo={modulo}
                filas={mapa.get(modulo) ?? []}
                esAdmin={rolSeleccionado === 'admin'}
                savingKeys={savingKeys}
                exitoKeys={exitoKeys}
                onToggle={togglePermiso}
              />
            ))}
          </div>
        )
      )}
    </div>
  )
}

// ── Sección de módulo ─────────────────────────────────────────────────────────

function SeccionModulo({
  modulo,
  filas,
  esAdmin,
  savingKeys,
  exitoKeys,
  onToggle,
}: {
  modulo: string
  filas: PermisoFila[]
  esAdmin: boolean
  savingKeys: Set<string>
  exitoKeys: Set<string>
  onToggle: (permiso: PermisoFila, nuevoValor: boolean) => void
}) {
  const totalActivos = esAdmin ? filas.length : filas.filter((f) => f.permitido).length

  return (
    <div style={{
      background: '#ffffff',
      border: '0.5px solid #c5ddf5',
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      {/* Header del módulo */}
      <div style={{
        padding: '12px 20px',
        background: '#f0f7ff',
        borderBottom: '0.5px solid #e0eef8',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: '#0d3d6e' }}>
          {NOMBRE_MODULO[modulo] ?? modulo}
        </span>
        {esAdmin ? (
          <span style={{
            fontSize: 11, background: '#e8fff5', color: '#0a5535',
            padding: '2px 8px', borderRadius: 20, fontWeight: 500,
          }}>
            Acceso completo
          </span>
        ) : (
          <span style={{
            fontSize: 11, background: '#e8f4ff', color: '#1a6bbd',
            padding: '2px 8px', borderRadius: 20, fontWeight: 500,
          }}>
            {totalActivos}/{filas.length} activos
          </span>
        )}
      </div>

      {/* Filas de acciones */}
      {filas.map((fila, idx) => {
        const clave     = `${fila.modulo}:${fila.accion}`
        const bloqueado = esAdmin || fila.sobrescrito_por_saas
        const guardando = savingKeys.has(clave)
        const exito     = exitoKeys.has(clave)
        const activo    = esAdmin ? true : fila.permitido

        return (
          <div
            key={fila.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 20px',
              borderBottom: idx < filas.length - 1 ? '0.5px solid #f0f7ff' : 'none',
              background: idx % 2 === 0 ? '#ffffff' : '#f7faff',
            }}
          >
            {/* Label + lock */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, color: '#0d3d6e' }}>
                {NOMBRE_ACCION[fila.accion] ?? fila.accion}
              </span>
              {bloqueado && (
                <span
                  title="Permiso bloqueado por el administrador del sistema"
                  style={{ fontSize: 13, cursor: 'help' }}
                >
                  🔒
                </span>
              )}
            </div>

            {/* Toggle + indicadores */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {exito && (
                <span style={{
                  fontSize: 11, color: '#0a5535', background: '#e8fff5',
                  border: '0.5px solid #2ecc8a', padding: '2px 8px', borderRadius: 20,
                }}>
                  ✓ Guardado
                </span>
              )}
              {guardando && (
                <span style={{ fontSize: 11, color: '#5a8ab0' }}>Guardando...</span>
              )}
              <Toggle
                activo={activo}
                bloqueado={bloqueado}
                guardando={guardando}
                onChange={(val) => onToggle(fila, val)}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
