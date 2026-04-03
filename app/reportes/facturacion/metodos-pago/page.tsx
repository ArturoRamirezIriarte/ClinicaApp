'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { EMPRESA_ID } from '@/lib/config'
import ReporteHeader from '@/components/reportes/ReporteHeader'
import ReporteExport from '@/components/reportes/ReporteExport'

// ── Tipos ──────────────────────────────────────────────────────────────────

interface FilaReporte {
  metodo_pago:     string
  total_cobros:    number
  total_facturado: number
  porcentaje:      number
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

function formatPct(n: number | null | undefined): string {
  if (n === null || n === undefined) return '0.0%'
  return `${Number(n).toFixed(1)}%`
}

function sumar(filas: FilaReporte[], campo: keyof FilaReporte): number {
  return filas.reduce((acc, f) => acc + (Number(f[campo]) || 0), 0)
}

// Etiquetas legibles para métodos de pago
function etiquetaMetodo(metodo: string): string {
  const mapa: Record<string, string> = {
    efectivo:      'Efectivo',
    tarjeta:       'Tarjeta',
    transferencia: 'Transferencia',
    cheque:        'Cheque',
    cuotas:        'Plan de Cuotas',
  }
  return mapa[metodo] ?? metodo.charAt(0).toUpperCase() + metodo.slice(1)
}

const CSV_COLUMNAS = [
  'Método de Pago',
  'Cobros',
  'Total (Q)',
  'Porcentaje',
]

function filaACSV(f: FilaReporte): Record<string, unknown> {
  return {
    'Método de Pago': etiquetaMetodo(f.metodo_pago),
    'Cobros':         f.total_cobros,
    'Total (Q)':      Number(f.total_facturado).toFixed(2),
    'Porcentaje':     formatPct(f.porcentaje),
  }
}

// ── Página ─────────────────────────────────────────────────────────────────

export default function PaginaMetodosPago() {
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
        'clinica_rpt_metodos_pago',
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
        Reportes › Facturación › Métodos de Pago
      </div>

      <h1 style={{ fontSize: 24, fontWeight: 600, color: '#0d3d6e', marginBottom: 20, marginTop: 0 }}>
        Métodos de Pago
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
              filename={`metodos-pago-${fechaInicio}-${fechaFin}`}
              columns={CSV_COLUMNAS}
              rows={filasCSV}
            />
          </div>

          <div ref={reporteRef}>
            <ReporteHeader
              titulo="Métodos de Pago"
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
                      <th style={{ textAlign: 'left' }}>Método de Pago</th>
                      <th style={{ textAlign: 'right' }}>Cobros</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                      <th style={{ textAlign: 'right' }}>Porcentaje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((f, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 500, color: '#0d3d6e' }}>
                          {etiquetaMetodo(f.metodo_pago)}
                        </td>
                        <td style={{ textAlign: 'right' }}>{f.total_cobros}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: '#0d3d6e' }}>
                          {formatQ(f.total_facturado)}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {/* Barra visual de porcentaje */}
                          <div style={{
                            display: 'flex', alignItems: 'center',
                            justifyContent: 'flex-end', gap: 8,
                          }}>
                            <div style={{
                              width: 80, height: 6, background: '#e0eef8',
                              borderRadius: 3, overflow: 'hidden', flexShrink: 0,
                            }}>
                              <div style={{
                                width: `${Math.min(Number(f.porcentaje), 100)}%`,
                                height: '100%',
                                background: '#1a6bbd',
                                borderRadius: 3,
                              }} />
                            </div>
                            <span style={{ minWidth: 44, textAlign: 'right', fontWeight: 500 }}>
                              {formatPct(f.porcentaje)}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f0f7ff', borderTop: '1.5px solid #c5ddf5' }}>
                      <td style={{ fontWeight: 600, color: '#0d3d6e', fontSize: 13 }}>Total</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: '#0d3d6e' }}>
                        {sumar(filas, 'total_cobros')}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#1a6bbd', fontSize: 15 }}>
                        {formatQ(sumar(filas, 'total_facturado'))}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: '#0d3d6e' }}>
                        100.0%
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
