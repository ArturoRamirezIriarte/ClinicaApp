'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { EMPRESA_ID } from '@/lib/config'
import ReporteHeader from '@/components/reportes/ReporteHeader'
import ReporteExport from '@/components/reportes/ReporteExport'

// ── Tipos ──────────────────────────────────────────────────────────────────

interface FilaReporte {
  item_nombre:     string
  categoria:       string | null
  sucursal_nombre: string
  total_consumido: number
  unidad_medida:   string | null
  stock_actual:    number
  stock_minimo:    number
  estado_stock:    string
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

function formatNum(n: number | null | undefined): string {
  if (n === null || n === undefined) return '0'
  return Number(n).toLocaleString('es-GT', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

function sumarConsumo(filas: FilaReporte[]): number {
  return filas.reduce((acc, f) => acc + (Number(f.total_consumido) || 0), 0)
}

function BadgeEstado({ estado }: { estado: string }) {
  const e = estado.toLowerCase()
  let bg = '#e8fff5', color = '#0a5535'
  if (e === 'agotado') { bg = '#fff0f0'; color = '#7a1a1a' }
  else if (e === 'critico' || e === 'crítico') { bg = '#fff8e8'; color = '#7a5500' }

  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: 20,
      fontSize: 12,
      fontWeight: 500,
      background: bg,
      color,
    }}>
      {estado.charAt(0).toUpperCase() + estado.slice(1)}
    </span>
  )
}

const CSV_COLUMNAS = [
  'Artículo',
  'Categoría',
  'Sucursal',
  'Total Consumido',
  'Unidad',
  'Stock Actual',
  'Stock Mínimo',
  'Estado',
]

function filaACSV(f: FilaReporte): Record<string, unknown> {
  return {
    'Artículo':       f.item_nombre,
    'Categoría':      f.categoria ?? '—',
    'Sucursal':       f.sucursal_nombre,
    'Total Consumido': formatNum(f.total_consumido),
    'Unidad':         f.unidad_medida ?? '—',
    'Stock Actual':   formatNum(f.stock_actual),
    'Stock Mínimo':   formatNum(f.stock_minimo),
    'Estado':         f.estado_stock,
  }
}

// ── Página ─────────────────────────────────────────────────────────────────

export default function PaginaConsumoInventario() {
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
        'clinica_rpt_consumo_inventario',
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
      console.error('Error al generar reporte de consumo:', e)
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
        Reportes › Inventario › Consumo de Inventario
      </div>

      <h1 style={{ fontSize: 24, fontWeight: 600, color: '#0d3d6e', marginBottom: 20, marginTop: 0 }}>
        Consumo de Inventario
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
              filename={`consumo-inventario-${fechaInicio}-${fechaFin}`}
              columns={CSV_COLUMNAS}
              rows={filasCSV}
            />
          </div>

          <div ref={reporteRef}>
            <ReporteHeader
              titulo="Consumo de Inventario"
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
                No hay movimientos de consumo para el período seleccionado
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="ct-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Artículo</th>
                      <th style={{ textAlign: 'left' }}>Categoría</th>
                      <th style={{ textAlign: 'left' }}>Sucursal</th>
                      <th style={{ textAlign: 'right' }}>Consumido</th>
                      <th style={{ textAlign: 'left' }}>Unidad</th>
                      <th style={{ textAlign: 'right' }}>Stock Actual</th>
                      <th style={{ textAlign: 'right' }}>Stock Mínimo</th>
                      <th style={{ textAlign: 'center' }}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((f, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 500, color: '#0d3d6e' }}>{f.item_nombre}</td>
                        <td style={{ color: '#5a8ab0' }}>{f.categoria ?? '—'}</td>
                        <td style={{ color: '#5a8ab0' }}>{f.sucursal_nombre}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: '#0d3d6e' }}>
                          {formatNum(f.total_consumido)}
                        </td>
                        <td style={{ color: '#5a8ab0', fontSize: 13 }}>
                          {f.unidad_medida ?? '—'}
                        </td>
                        <td style={{ textAlign: 'right' }}>{formatNum(f.stock_actual)}</td>
                        <td style={{ textAlign: 'right' }}>{formatNum(f.stock_minimo)}</td>
                        <td style={{ textAlign: 'center' }}>
                          <BadgeEstado estado={f.estado_stock} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f0f7ff', borderTop: '1.5px solid #c5ddf5' }}>
                      <td
                        colSpan={3}
                        style={{ fontWeight: 600, color: '#0d3d6e', fontSize: 13 }}
                      >
                        Total
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#1a6bbd', fontSize: 15 }}>
                        {formatNum(sumarConsumo(filas))}
                      </td>
                      <td colSpan={4} />
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
