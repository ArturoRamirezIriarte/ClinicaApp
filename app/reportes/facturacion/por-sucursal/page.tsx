'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { EMPRESA_ID } from '@/lib/config'
import ReporteHeader from '@/components/reportes/ReporteHeader'
import ReporteExport from '@/components/reportes/ReporteExport'

// ── Tipos ──────────────────────────────────────────────────────────────────

interface FilaReporte {
  sucursal_nombre: string
  total_cobros:    number
  subtotal:        number
  iva_total:       number
  total_facturado: number
  efectivo:        number
  tarjeta:         number
  transferencia:   number
}

interface EmpresaHeader {
  nombre:           string
  nombre_comercial: string | null
  logo_url:         string | null
  plan:             string
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
  'Sucursal',
  'Cobros',
  'Subtotal (Q)',
  'IVA (Q)',
  'Total Facturado (Q)',
  'Efectivo (Q)',
  'Tarjeta (Q)',
  'Transferencia (Q)',
]

function filaACSV(f: FilaReporte): Record<string, unknown> {
  return {
    'Sucursal':            f.sucursal_nombre,
    'Cobros':              f.total_cobros,
    'Subtotal (Q)':        Number(f.subtotal).toFixed(2),
    'IVA (Q)':             Number(f.iva_total).toFixed(2),
    'Total Facturado (Q)': Number(f.total_facturado).toFixed(2),
    'Efectivo (Q)':        Number(f.efectivo).toFixed(2),
    'Tarjeta (Q)':         Number(f.tarjeta).toFixed(2),
    'Transferencia (Q)':   Number(f.transferencia).toFixed(2),
  }
}

// ── Página ─────────────────────────────────────────────────────────────────

export default function PaginaFacturadoPorSucursal() {
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin,    setFechaFin]    = useState('')

  const [empresa,    setEmpresa]    = useState<EmpresaHeader | null>(null)
  const [filas,      setFilas]      = useState<FilaReporte[] | null>(null)
  const [cargando,   setCargando]   = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [iniciando,  setIniciando]  = useState(true)

  const reporteRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase
      .from('empresas')
      .select('nombre, nombre_comercial, logo_url, plan')
      .eq('id', EMPRESA_ID)
      .single()
      .then(({ data }) => {
        if (data) setEmpresa(data as EmpresaHeader)
        setIniciando(false)
      })
  }, [])

  // ── Guard: plan estándar ───────────────────────────────────────────────

  if (!iniciando && empresa?.plan === 'estandar') {
    return (
      <div>
        <div style={{ fontSize: 12, color: '#5a8ab0', marginBottom: 12 }}>
          Reportes › Facturación › Por Sucursal
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: '#0d3d6e', marginBottom: 24 }}>
          Facturación por Sucursal
        </h1>
        <div style={{
          background: '#fff8e8', border: '0.5px solid #f0c040',
          borderRadius: 12, padding: '32px 24px', textAlign: 'center',
          color: '#7a5500',
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
            Función no disponible en su plan
          </div>
          <div style={{ fontSize: 14 }}>
            Esta función está disponible en el plan Pro o Enterprise.
          </div>
        </div>
      </div>
    )
  }

  // ── Generar reporte ──────────────────────────────────────────────────────

  async function generarReporte() {
    if (!fechaInicio || !fechaFin) return
    setCargando(true)
    setError(null)
    setFilas(null)
    try {
      const { data, error: rpcErr } = await supabase.rpc(
        'clinica_rpt_facturado_por_sucursal',
        {
          p_empresa_id:   EMPRESA_ID,
          p_fecha_inicio: fechaInicio,
          p_fecha_fin:    fechaFin,
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

  const puedeGenerar    = fechaInicio !== '' && fechaFin !== ''
  const nombreClinica   = empresa ? (empresa.nombre_comercial ?? empresa.nombre) : 'Clínica'
  const filasCSV        = (filas ?? []).map(filaACSV)

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ fontSize: 12, color: '#5a8ab0', marginBottom: 12 }}>
        Reportes › Facturación › Por Sucursal
      </div>

      <h1 style={{ fontSize: 24, fontWeight: 600, color: '#0d3d6e', marginBottom: 20, marginTop: 0 }}>
        Facturación por Sucursal
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
              filename={`facturacion-por-sucursal-${fechaInicio}-${fechaFin}`}
              columns={CSV_COLUMNAS}
              rows={filasCSV}
            />
          </div>

          <div ref={reporteRef}>
            <ReporteHeader
              titulo="Facturación por Sucursal"
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
                      <th style={{ textAlign: 'left' }}>Sucursal</th>
                      <th style={{ textAlign: 'right' }}>Cobros</th>
                      <th style={{ textAlign: 'right' }}>Subtotal</th>
                      <th style={{ textAlign: 'right' }}>IVA</th>
                      <th style={{ textAlign: 'right' }}>Total Facturado</th>
                      <th style={{ textAlign: 'right' }}>Efectivo</th>
                      <th style={{ textAlign: 'right' }}>Tarjeta</th>
                      <th style={{ textAlign: 'right' }}>Transferencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((f, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 500, color: '#0d3d6e' }}>{f.sucursal_nombre}</td>
                        <td style={{ textAlign: 'right' }}>{f.total_cobros}</td>
                        <td style={{ textAlign: 'right' }}>{formatQ(f.subtotal)}</td>
                        <td style={{ textAlign: 'right' }}>{formatQ(f.iva_total)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: '#0d3d6e' }}>
                          {formatQ(f.total_facturado)}
                        </td>
                        <td style={{ textAlign: 'right' }}>{formatQ(f.efectivo)}</td>
                        <td style={{ textAlign: 'right' }}>{formatQ(f.tarjeta)}</td>
                        <td style={{ textAlign: 'right' }}>{formatQ(f.transferencia)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f0f7ff', borderTop: '1.5px solid #c5ddf5' }}>
                      <td style={{ fontWeight: 600, color: '#0d3d6e', fontSize: 13 }}>Total</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: '#0d3d6e' }}>
                        {sumar(filas, 'total_cobros')}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: '#0d3d6e' }}>
                        {formatQ(sumar(filas, 'subtotal'))}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: '#0d3d6e' }}>
                        {formatQ(sumar(filas, 'iva_total'))}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#1a6bbd', fontSize: 15 }}>
                        {formatQ(sumar(filas, 'total_facturado'))}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: '#0d3d6e' }}>
                        {formatQ(sumar(filas, 'efectivo'))}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: '#0d3d6e' }}>
                        {formatQ(sumar(filas, 'tarjeta'))}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: '#0d3d6e' }}>
                        {formatQ(sumar(filas, 'transferencia'))}
                      </td>
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
