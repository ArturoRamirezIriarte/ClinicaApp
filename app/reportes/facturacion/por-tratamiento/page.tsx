'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { EMPRESA_ID } from '@/lib/config'
import ReporteHeader from '@/components/reportes/ReporteHeader'
import ReporteExport from '@/components/reportes/ReporteExport'

// ── Tipos ──────────────────────────────────────────────────────────────────

interface FilaReporte {
  tratamiento:     string
  cantidad_items:  number
  total_facturado: number
  promedio_precio: number
}

interface Sucursal {
  id:     string
  nombre: string
}

interface EmpresaHeader {
  nombre:           string
  nombre_comercial: string | null
  logo_url:         string | null
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

const CSV_COLUMNAS = [
  'Tratamiento',
  'Cantidad',
  'Total Facturado (Q)',
  'Precio Promedio (Q)',
]

function filaACSV(f: FilaReporte): Record<string, unknown> {
  return {
    'Tratamiento':          f.tratamiento,
    'Cantidad':             f.cantidad_items,
    'Total Facturado (Q)':  Number(f.total_facturado).toFixed(2),
    'Precio Promedio (Q)':  Number(f.promedio_precio).toFixed(2),
  }
}

// ── Página ─────────────────────────────────────────────────────────────────

export default function PaginaFacturadoPorTratamiento() {
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin,    setFechaFin]    = useState('')
  const [sucursalId,  setSucursalId]  = useState<string>('')

  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [empresa,    setEmpresa]    = useState<EmpresaHeader | null>(null)
  const [filas,      setFilas]      = useState<FilaReporte[] | null>(null)
  const [cargando,   setCargando]   = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  const reporteRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase
      .from('empresas')
      .select('nombre, nombre_comercial, logo_url')
      .eq('id', EMPRESA_ID)
      .single()
      .then(({ data }) => { if (data) setEmpresa(data as EmpresaHeader) })

    supabase
      .from('sucursales')
      .select('id, nombre')
      .eq('empresa_id', EMPRESA_ID)
      .eq('activa', true)
      .order('nombre')
      .then(({ data }) => { if (data) setSucursales(data as Sucursal[]) })
  }, [])

  async function generarReporte() {
    if (!fechaInicio || !fechaFin) return
    setCargando(true)
    setError(null)
    setFilas(null)
    try {
      const { data, error: rpcErr } = await supabase.rpc(
        'clinica_rpt_facturado_por_tratamiento',
        {
          p_empresa_id:   EMPRESA_ID,
          p_fecha_inicio: fechaInicio,
          p_fecha_fin:    fechaFin,
          p_sucursal_id:  sucursalId || null,
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

  const puedeGenerar  = fechaInicio !== '' && fechaFin !== ''
  const nombreClinica = empresa ? (empresa.nombre_comercial ?? empresa.nombre) : 'Clínica'
  const filasCSV      = (filas ?? []).map(filaACSV)

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ fontSize: 12, color: '#5a8ab0', marginBottom: 12 }}>
        Reportes › Facturación › Por Tratamiento
      </div>

      <h1 style={{ fontSize: 24, fontWeight: 600, color: '#0d3d6e', marginBottom: 20, marginTop: 0 }}>
        Facturación por Tratamiento
      </h1>

      {/* ── Filtros ── */}
      <div className="ct-card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
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

      {/* Error */}
      {error && (
        <div style={{
          background: '#fff0f0', border: '0.5px solid #e84040',
          borderRadius: 8, padding: '12px 16px', marginBottom: 16,
          color: '#7a1a1a', fontSize: 14,
        }}>
          {error}
        </div>
      )}

      {/* Loading */}
      {cargando && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#5a8ab0', fontSize: 14 }}>
          Cargando...
        </div>
      )}

      {/* Resultados */}
      {!cargando && filas !== null && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <ReporteExport
              tableRef={reporteRef}
              filename={`facturacion-por-tratamiento-${fechaInicio}-${fechaFin}`}
              columns={CSV_COLUMNAS}
              rows={filasCSV}
            />
          </div>

          <div ref={reporteRef}>
            <ReporteHeader
              titulo="Facturación por Tratamiento"
              nombreClinica={nombreClinica}
              logoUrl={empresa?.logo_url}
            />

            <div style={{ fontSize: 13, color: '#5a8ab0', marginBottom: 16 }}>
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

            {filas.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '48px 0', color: '#5a8ab0', fontSize: 14,
                background: '#ffffff', border: '0.5px solid #c5ddf5', borderRadius: 12,
              }}>
                No hay cobros registrados para el período seleccionado
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="ct-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Tratamiento</th>
                      <th style={{ textAlign: 'right' }}>Cantidad</th>
                      <th style={{ textAlign: 'right' }}>Total Facturado</th>
                      <th style={{ textAlign: 'right' }}>Precio Promedio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((f, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 500, color: '#0d3d6e' }}>{f.tratamiento}</td>
                        <td style={{ textAlign: 'right' }}>{f.cantidad_items}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: '#0d3d6e' }}>
                          {formatQ(f.total_facturado)}
                        </td>
                        <td style={{ textAlign: 'right', color: '#5a8ab0' }}>
                          {formatQ(f.promedio_precio)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f0f7ff', borderTop: '1.5px solid #c5ddf5' }}>
                      <td style={{ fontWeight: 600, color: '#0d3d6e', fontSize: 13 }}>Total</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: '#0d3d6e' }}>
                        {sumar(filas, 'cantidad_items')}
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
