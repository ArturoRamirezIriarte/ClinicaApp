'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { EMPRESA_ID, ROL_USUARIO } from '@/lib/config'
import ReporteHeader from '@/components/reportes/ReporteHeader'
import ReporteExport from '@/components/reportes/ReporteExport'

// ── Tipos ──────────────────────────────────────────────────────────────────

interface FilaReporte {
  doctor_nombre:     string
  sucursal_nombre:   string
  total_cobros:      number
  subtotal:          number
  iva_monto:         number
  total_facturado:   number
  promedio_por_cita: number
}

interface Sucursal {
  id: string
  nombre: string
}

interface Dentista {
  id: string
  nombre: string
  apellido: string | null
}

interface EmpresaHeader {
  nombre: string
  nombre_comercial: string | null
  logo_url: string | null
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatQ(n: number | null | undefined): string {
  if (n === null || n === undefined) return 'Q 0.00'
  return `Q ${Number(n).toLocaleString('es-GT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function sumar(filas: FilaReporte[], campo: keyof FilaReporte): number {
  return filas.reduce((acc, f) => acc + (Number(f[campo]) || 0), 0)
}

// Columnas y transformación para CSV
const CSV_COLUMNAS = [
  'Doctor',
  'Sucursal',
  'Cobros',
  'Subtotal (Q)',
  'IVA (Q)',
  'Total Facturado (Q)',
  'Promedio/Cita (Q)',
]

function filaACSV(f: FilaReporte): Record<string, unknown> {
  return {
    'Doctor':               f.doctor_nombre,
    'Sucursal':             f.sucursal_nombre,
    'Cobros':               f.total_cobros,
    'Subtotal (Q)':         Number(f.subtotal).toFixed(2),
    'IVA (Q)':              Number(f.iva_monto).toFixed(2),
    'Total Facturado (Q)':  Number(f.total_facturado).toFixed(2),
    'Promedio/Cita (Q)':    Number(f.promedio_por_cita).toFixed(2),
  }
}

// ── Página ─────────────────────────────────────────────────────────────────

export default function PaginaFacturadoPorDoctor() {
  // ── Filtros ──────────────────────────────────────────────────────────────
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin,    setFechaFin]    = useState('')
  const [sucursalId,  setSucursalId]  = useState<string>('')   // '' = todas
  const [dentistaId,  setDentistaId]  = useState<string>('')   // '' = todos

  // ── Catálogos ────────────────────────────────────────────────────────────
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [dentistas,  setDentistas]  = useState<Dentista[]>([])
  const [empresa,    setEmpresa]    = useState<EmpresaHeader | null>(null)

  // ── Usuario actual ───────────────────────────────────────────────────────
  const [rolActual,      setRolActual]      = useState<string>(ROL_USUARIO)
  const [usuarioIdPropio, setUsuarioIdPropio] = useState<string | null>(null)

  // ── Estado de reporte ────────────────────────────────────────────────────
  const [filas,    setFilas]    = useState<FilaReporte[] | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const reporteRef = useRef<HTMLDivElement>(null)

  // ── Carga inicial ────────────────────────────────────────────────────────

  useEffect(() => {
    // Empresa (para encabezado del reporte)
    supabase
      .from('empresas')
      .select('nombre, nombre_comercial, logo_url')
      .eq('id', EMPRESA_ID)
      .single()
      .then(({ data }) => {
        if (data) setEmpresa(data as EmpresaHeader)
      })

    // Sucursales
    supabase
      .from('sucursales')
      .select('id, nombre')
      .eq('empresa_id', EMPRESA_ID)
      .eq('activa', true)
      .order('nombre')
      .then(({ data }) => {
        if (data) setSucursales(data as Sucursal[])
      })

    // Usuario actual y su rol real desde la BD
    supabase.auth.getUser().then(({ data: authData }) => {
      if (!authData.user) return
      supabase
        .from('usuarios')
        .select('id, rol')
        .eq('supabase_uid', authData.user.id)
        .eq('empresa_id', EMPRESA_ID)
        .single()
        .then(({ data: usuData }) => {
          if (!usuData) return
          const u = usuData as { id: string; rol: string }
          setRolActual(u.rol)
          if (u.rol === 'dentista') {
            setUsuarioIdPropio(u.id)
          }
        })
    })
  }, [])

  // Cargar dentistas solo si el rol permite el selector
  useEffect(() => {
    if (rolActual === 'dentista') return
    supabase
      .from('usuarios')
      .select('id, nombre, apellido')
      .eq('empresa_id', EMPRESA_ID)
      .eq('rol', 'dentista')
      .eq('activo', true)
      .order('nombre')
      .then(({ data }) => {
        if (data) setDentistas(data as Dentista[])
      })
  }, [rolActual])

  // ── Generar reporte ──────────────────────────────────────────────────────

  async function generarReporte() {
    if (!fechaInicio || !fechaFin) return
    setCargando(true)
    setError(null)
    setFilas(null)
    try {
      // Dentista: si es dentista usa su propio ID; si no, el del selector (null = todos)
      const pDentistaId = rolActual === 'dentista'
        ? (usuarioIdPropio ?? null)
        : (dentistaId || null)

      const { data, error: rpcErr } = await supabase.rpc(
        'clinica_rpt_facturado_por_doctor',
        {
          p_empresa_id:   EMPRESA_ID,
          p_fecha_inicio: fechaInicio,
          p_fecha_fin:    fechaFin,
          p_sucursal_id:  sucursalId || null,
          p_dentista_id:  pDentistaId,
        },
      )
      if (rpcErr) throw rpcErr
      setFilas((data as FilaReporte[]) ?? [])
    } catch (e: unknown) {
      console.error('Error al generar reporte:', e)
      setError('Ocurrió un error al generar el reporte. Por favor intente de nuevo.')
    } finally {
      setCargando(false)
    }
  }

  // ── Derivados ────────────────────────────────────────────────────────────

  const puedeGenerar = fechaInicio !== '' && fechaFin !== ''
  const nombreClinica = empresa
    ? (empresa.nombre_comercial ?? empresa.nombre)
    : 'Clínica'

  const filasCSV = (filas ?? []).map(filaACSV)

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ fontSize: 12, color: '#5a8ab0', marginBottom: 12 }}>
        Reportes › Facturación › Por Doctor
      </div>

      {/* Título de página */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20, flexWrap: 'wrap', gap: 8,
      }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: '#0d3d6e', margin: 0 }}>
          Facturación por Doctor
        </h1>
      </div>

      {/* ── Barra de filtros ── */}
      <div className="ct-card" style={{ marginBottom: 20 }}>
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end',
        }}>
          {/* Fecha inicio */}
          <div style={{ flex: '1 1 140px', minWidth: 140 }}>
            <label className="ct-label">
              Fecha inicio <span style={{ color: '#e84040' }}>*</span>
            </label>
            <input
              type="date"
              className="ct-input"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
            />
          </div>

          {/* Fecha fin */}
          <div style={{ flex: '1 1 140px', minWidth: 140 }}>
            <label className="ct-label">
              Fecha fin <span style={{ color: '#e84040' }}>*</span>
            </label>
            <input
              type="date"
              className="ct-input"
              value={fechaFin}
              min={fechaInicio || undefined}
              onChange={(e) => setFechaFin(e.target.value)}
            />
          </div>

          {/* Selector de sucursal */}
          <div style={{ flex: '1 1 180px', minWidth: 160 }}>
            <label className="ct-label">Sucursal</label>
            <select
              className="ct-select"
              value={sucursalId}
              onChange={(e) => setSucursalId(e.target.value)}
            >
              <option value="">Todas las sucursales</option>
              {sucursales.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </div>

          {/* Selector de doctor (solo para admin / gerente / recepcionista) */}
          {rolActual !== 'dentista' && (
            <div style={{ flex: '1 1 200px', minWidth: 180 }}>
              <label className="ct-label">Doctor</label>
              <select
                className="ct-select"
                value={dentistaId}
                onChange={(e) => setDentistaId(e.target.value)}
              >
                <option value="">Todos los doctores</option>
                {dentistas.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nombre} {d.apellido ?? ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Botón generar */}
          <div style={{ flexShrink: 0 }}>
            <button
              className="ct-btn ct-btn-primary"
              disabled={!puedeGenerar || cargando}
              onClick={generarReporte}
            >
              {cargando ? 'Generando...' : 'Generar Reporte'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{
          background: '#fff0f0', border: '0.5px solid #e84040',
          borderRadius: 8, padding: '12px 16px', marginBottom: 16,
          color: '#7a1a1a', fontSize: 14,
        }}>
          {error}
        </div>
      )}

      {/* ── Loading ── */}
      {cargando && (
        <div style={{
          textAlign: 'center', padding: '48px 0',
          color: '#5a8ab0', fontSize: 14,
        }}>
          Cargando...
        </div>
      )}

      {/* ── Resultados ── */}
      {!cargando && filas !== null && (
        <>
          {/* Exportar */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <ReporteExport
              tableRef={reporteRef}
              filename={`facturacion-por-doctor-${fechaInicio}-${fechaFin}`}
              columns={CSV_COLUMNAS}
              rows={filasCSV}
            />
          </div>

          {/* Contenido capturable para PDF */}
          <div ref={reporteRef}>
            {/* Encabezado del reporte */}
            <ReporteHeader
              titulo="Facturación por Doctor"
              nombreClinica={nombreClinica}
              logoUrl={empresa?.logo_url}
            />

            {/* Período */}
            <div style={{
              fontSize: 13, color: '#5a8ab0', marginBottom: 16,
            }}>
              Período:{' '}
              <span style={{ fontWeight: 500, color: '#0d3d6e' }}>
                {new Date(fechaInicio + 'T12:00:00').toLocaleDateString('es-GT', {
                  day: '2-digit', month: '2-digit', year: 'numeric',
                })}
                {' — '}
                {new Date(fechaFin + 'T12:00:00').toLocaleDateString('es-GT', {
                  day: '2-digit', month: '2-digit', year: 'numeric',
                })}
              </span>
            </div>

            {/* Estado vacío */}
            {filas.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '48px 0',
                color: '#5a8ab0', fontSize: 14,
                background: '#ffffff', border: '0.5px solid #c5ddf5',
                borderRadius: 12,
              }}>
                No hay cobros registrados para el período seleccionado
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="ct-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Doctor</th>
                      <th style={{ textAlign: 'left' }}>Sucursal</th>
                      <th style={{ textAlign: 'right' }}>Cobros</th>
                      <th style={{ textAlign: 'right' }}>Subtotal</th>
                      <th style={{ textAlign: 'right' }}>IVA</th>
                      <th style={{ textAlign: 'right' }}>Total Facturado</th>
                      <th style={{ textAlign: 'right' }}>Promedio/Cita</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((f, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 500, color: '#0d3d6e' }}>
                          {f.doctor_nombre}
                        </td>
                        <td style={{ color: '#5a8ab0' }}>{f.sucursal_nombre}</td>
                        <td style={{ textAlign: 'right' }}>{f.total_cobros}</td>
                        <td style={{ textAlign: 'right' }}>{formatQ(f.subtotal)}</td>
                        <td style={{ textAlign: 'right' }}>{formatQ(f.iva_monto)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: '#0d3d6e' }}>
                          {formatQ(f.total_facturado)}
                        </td>
                        <td style={{ textAlign: 'right', color: '#5a8ab0' }}>
                          {formatQ(f.promedio_por_cita)}
                        </td>
                      </tr>
                    ))}
                  </tbody>

                  {/* Fila de totales */}
                  <tfoot>
                    <tr style={{
                      background: '#f0f7ff',
                      borderTop: '1.5px solid #c5ddf5',
                    }}>
                      <td
                        colSpan={2}
                        style={{ fontWeight: 600, color: '#0d3d6e', fontSize: 13 }}
                      >
                        Total
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: '#0d3d6e' }}>
                        {sumar(filas, 'total_cobros')}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: '#0d3d6e' }}>
                        {formatQ(sumar(filas, 'subtotal'))}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: '#0d3d6e' }}>
                        {formatQ(sumar(filas, 'iva_monto'))}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#1a6bbd', fontSize: 15 }}>
                        {formatQ(sumar(filas, 'total_facturado'))}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
