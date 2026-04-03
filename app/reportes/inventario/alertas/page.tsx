'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { EMPRESA_ID } from '@/lib/config'
import ReporteHeader from '@/components/reportes/ReporteHeader'
import ReporteExport from '@/components/reportes/ReporteExport'

// ── Tipos ──────────────────────────────────────────────────────────────────

interface FilaAlerta {
  id:               string
  nombre:           string
  categoria:        string | null
  stock_actual:     number
  stock_minimo:     number
  porcentaje_stock: number
  estado_stock:     string
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

function formatPct(n: number | null | undefined): string {
  if (n === null || n === undefined) return '0.0%'
  return `${Number(n).toFixed(1)}%`
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
  'Stock Actual',
  'Stock Mínimo',
  '% Stock',
  'Estado',
]

function filaACSV(f: FilaAlerta): Record<string, unknown> {
  return {
    'Artículo':    f.nombre,
    'Categoría':   f.categoria ?? '—',
    'Stock Actual': formatNum(f.stock_actual),
    'Stock Mínimo': formatNum(f.stock_minimo),
    '% Stock':     formatPct(f.porcentaje_stock),
    'Estado':      f.estado_stock,
  }
}

// ── Página ─────────────────────────────────────────────────────────────────

export default function PaginaAlertasInventario() {
  const [sucursalId,  setSucursalId]  = useState<string>('')

  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [empresa,    setEmpresa]    = useState<EmpresaHeader | null>(null)
  const [filas,      setFilas]      = useState<FilaAlerta[] | null>(null)
  const [cargando,   setCargando]   = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  const reporteRef = useRef<HTMLDivElement>(null)

  // ── Carga de catálogos ──────────────────────────────────────────────────

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

  // ── Carga automática al montar y al cambiar sucursal ────────────────────

  useEffect(() => {
    cargarAlertas(sucursalId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sucursalId])

  async function cargarAlertas(pSucursalId: string) {
    setCargando(true)
    setError(null)
    try {
      let query = supabase
        .from('v_alertas_inventario')
        .select('id, nombre, categoria, stock_actual, stock_minimo, porcentaje_stock, estado_stock')
        .eq('empresa_id', EMPRESA_ID)
        .order('porcentaje_stock', { ascending: true })

      if (pSucursalId) {
        query = query.eq('sucursal_id', pSucursalId)
      }

      const { data, error: qErr } = await query
      if (qErr) throw qErr
      setFilas((data as FilaAlerta[]) ?? [])
    } catch (e: unknown) {
      console.error('Error al cargar alertas de inventario:', e)
      setError('Ocurrió un error al cargar las alertas. Por favor intente de nuevo.')
    } finally {
      setCargando(false)
    }
  }

  function handleSucursalChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSucursalId(e.target.value)
  }

  const nombreClinica = empresa ? (empresa.nombre_comercial ?? empresa.nombre) : 'Clínica'
  const filasCSV      = (filas ?? []).map(filaACSV)

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ fontSize: 12, color: '#5a8ab0', marginBottom: 12 }}>
        Reportes › Inventario › Alertas de Inventario
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20, flexWrap: 'wrap', gap: 8,
      }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: '#0d3d6e', margin: 0 }}>
          Alertas de Inventario
        </h1>
        {filas !== null && !cargando && (
          <ReporteExport
            tableRef={reporteRef}
            filename="alertas-inventario"
            columns={CSV_COLUMNAS}
            rows={filasCSV}
          />
        )}
      </div>

      {/* ── Filtro de sucursal ── */}
      <div className="ct-card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 200px', maxWidth: 280 }}>
            <label className="ct-label">Sucursal</label>
            <select
              className="ct-select"
              value={sucursalId}
              onChange={handleSucursalChange}
            >
              <option value="">Todas las sucursales</option>
              {sucursales.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </div>
          <div style={{ fontSize: 12, color: '#5a8ab0', paddingBottom: 10 }}>
            Vista en tiempo real — se actualiza al cambiar sucursal
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
        <div ref={reporteRef}>
          <ReporteHeader
            titulo="Alertas de Inventario"
            nombreClinica={nombreClinica}
            logoUrl={empresa?.logo_url}
          />

          {filas.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '48px 0', color: '#5a8ab0', fontSize: 14,
              background: '#ffffff', border: '0.5px solid #c5ddf5', borderRadius: 12,
            }}>
              No se encontraron artículos con alertas de stock
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="ct-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Artículo</th>
                    <th style={{ textAlign: 'left' }}>Categoría</th>
                    <th style={{ textAlign: 'right' }}>Stock Actual</th>
                    <th style={{ textAlign: 'right' }}>Stock Mínimo</th>
                    <th style={{ textAlign: 'right' }}>% Stock</th>
                    <th style={{ textAlign: 'center' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((f) => (
                    <tr key={f.id}>
                      <td style={{ fontWeight: 500, color: '#0d3d6e' }}>{f.nombre}</td>
                      <td style={{ color: '#5a8ab0' }}>{f.categoria ?? '—'}</td>
                      <td style={{ textAlign: 'right' }}>{formatNum(f.stock_actual)}</td>
                      <td style={{ textAlign: 'right' }}>{formatNum(f.stock_minimo)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{
                          display: 'flex', alignItems: 'center',
                          justifyContent: 'flex-end', gap: 8,
                        }}>
                          <div style={{
                            width: 60, height: 6, background: '#e0eef8',
                            borderRadius: 3, overflow: 'hidden', flexShrink: 0,
                          }}>
                            <div style={{
                              width: `${Math.min(Number(f.porcentaje_stock), 100)}%`,
                              height: '100%',
                              background: f.estado_stock.toLowerCase() === 'agotado'
                                ? '#e84040'
                                : (f.estado_stock.toLowerCase() === 'critico' || f.estado_stock.toLowerCase() === 'crítico')
                                  ? '#f0c040'
                                  : '#2ecc8a',
                              borderRadius: 3,
                            }} />
                          </div>
                          <span style={{ minWidth: 42, textAlign: 'right', fontSize: 13 }}>
                            {formatPct(f.porcentaje_stock)}
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <BadgeEstado estado={f.estado_stock} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
