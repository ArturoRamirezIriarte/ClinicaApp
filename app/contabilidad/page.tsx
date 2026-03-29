'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { EMPRESA_ID } from '@/lib/config'
import ReporteHeader from '@/components/reportes/ReporteHeader'
import SucursalSelector from '@/components/SucursalSelector'

// ── Constantes ────────────────────────────────────────────────────────────────

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface DatosReporte {
  total_cobros: number
  subtotal: number
  iva_cobrado: number
  total_facturado: number
  iva_a_pagar: number
  isr_a_pagar: number
  efectivo: number
  tarjeta: number
  transferencia: number
  cuotas: number
  total_mes_anterior: number
  variacion_porcentual: number | null
}

interface EmpresaHeader {
  nombre: string
  nombre_comercial: string | null
  logo_url: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatQ(n: number): string {
  return `Q ${n.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatPct(n: number): string {
  return `${n.toFixed(1)}%`
}

function pct(parte: number, total: number): string {
  if (!total) return '0.0%'
  return formatPct((parte / total) * 100)
}

// ── Sub-componentes locales ───────────────────────────────────────────────────

function TarjetaKPI({
  label, valor, subvalor,
}: {
  label: string; valor: string; subvalor?: string
}) {
  return (
    <div style={{
      background: '#f0f7ff', border: '0.5px solid #c5ddf5',
      borderRadius: 8, padding: 16, flex: 1, minWidth: 0,
    }}>
      <p style={{ fontSize: 12, fontWeight: 500, color: '#5a8ab0', margin: '0 0 4px' }}>
        {label}
      </p>
      <p style={{ fontSize: 28, fontWeight: 600, color: '#0d3d6e', margin: 0, lineHeight: 1.2 }}>
        {valor}
      </p>
      {subvalor && (
        <p style={{ fontSize: 12, color: '#5a8ab0', margin: '4px 0 0' }}>{subvalor}</p>
      )}
    </div>
  )
}

function TarjetaImpuesto({
  label, valor, tasa, color,
}: {
  label: string; valor: string; tasa: number; color: string
}) {
  return (
    <div style={{
      flex: 1, border: `0.5px solid ${color}33`, borderRadius: 12,
      padding: '20px 24px', background: '#fff',
    }}>
      <p style={{ fontSize: 13, fontWeight: 500, color: '#5a8ab0', margin: '0 0 8px' }}>
        {label}
      </p>
      <p style={{ fontSize: 32, fontWeight: 600, color, margin: '0 0 6px', lineHeight: 1 }}>
        {valor}
      </p>
      <p style={{ fontSize: 12, color: '#5a8ab0', margin: 0 }}>
        Tasa aplicada: {tasa}%
      </p>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function PaginaContabilidad() {
  const hoyDate   = new Date()
  const mesInicial  = hoyDate.getMonth() + 1
  const anioInicial = hoyDate.getFullYear()

  const [mes, setMes]   = useState(mesInicial)
  const [anio, setAnio] = useState(anioInicial)

  // sucursalIdFiltro: null = todas, string = UUID específico
  // undefined = aún no inicializado (esperando SucursalSelector)
  const [sucursalIdFiltro, setSucursalIdFiltro]     = useState<string | null | undefined>(undefined)
  const [sucursalNombreFiltro, setSucursalNombreFiltro] = useState<string | null>(null)

  const [empresa, setEmpresa] = useState<EmpresaHeader | null>(null)
  const [datos, setDatos]     = useState<DatosReporte | null>(null)
  const [tasas, setTasas]     = useState({ iva: 5, isr: 5 })
  const [cargando, setCargando]       = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [generandoPDF, setGenerandoPDF] = useState(false)
  const reporteRef    = useRef<HTMLDivElement>(null)
  const yaAutoGenerado = useRef(false)

  // ── Cargar datos de la empresa (solo para el encabezado del reporte) ─────────

  useEffect(() => {
    supabase
      .from('empresas')
      .select('nombre, nombre_comercial, logo_url, tasa_iva_declaracion, tasa_isr')
      .eq('id', EMPRESA_ID)
      .single()
      .then(({ data }) => {
        if (!data) return
        const emp = data as {
          nombre: string; nombre_comercial: string | null; logo_url: string | null
          tasa_iva_declaracion: number; tasa_isr: number
        }
        setEmpresa({ nombre: emp.nombre, nombre_comercial: emp.nombre_comercial, logo_url: emp.logo_url })
        setTasas({ iva: emp.tasa_iva_declaracion ?? 5, isr: emp.tasa_isr ?? 5 })
      })
  }, [])

  // ── Recibir sucursal del SucursalSelector ────────────────────────────────────

  function handleSucursalChange(id: string | null, nombre: string | null) {
    setSucursalIdFiltro(id)
    setSucursalNombreFiltro(nombre)
    // Auto-generar la primera vez que el selector reporta su valor inicial
    if (!yaAutoGenerado.current) {
      yaAutoGenerado.current = true
      generarReporte(mesInicial, anioInicial, id)
    }
  }

  // ── Generar reporte ──────────────────────────────────────────────────────────

  async function generarReporte(
    pMes = mes,
    pAnio = anio,
    pSucursal: string | null | undefined = sucursalIdFiltro,
  ) {
    setCargando(true)
    setError(null)
    try {
      const { data, error: err } = await supabase.rpc(
        'clinica_rpt_contabilidad_mensual',
        {
          p_empresa_id:  EMPRESA_ID,
          p_mes:         pMes,
          p_anio:        pAnio,
          p_sucursal_id: pSucursal ?? null,
        },
      )
      if (err) throw err
      const fila = Array.isArray(data) ? data[0] : data
      if (!fila || typeof fila !== 'object' || !('total_facturado' in fila)) {
        setDatos(null)
        return
      }
      setDatos(fila as DatosReporte)
    } catch (e: unknown) {
      console.error('Error al generar reporte contable:', e)
      setError('Ocurrió un error al generar el reporte. Por favor intente de nuevo.')
    } finally {
      setCargando(false)
    }
  }

  function handleGenerar() {
    generarReporte(mes, anio, sucursalIdFiltro)
  }

  // ── Exportar CSV ─────────────────────────────────────────────────────────────

  function exportarCSV() {
    if (!datos) return
    const mesNombre = MESES[mes - 1]
    const totalMetodos = datos.efectivo + datos.tarjeta + datos.transferencia + datos.cuotas

    const lineas = [
      `"Reporte de Contabilidad - ${mesNombre} ${anio}"`,
      '',
      '"RESUMEN DE VENTAS"',
      '"Concepto","Valor (Q)"',
      `"Total Facturado","${datos.total_facturado}"`,
      `"Subtotal (sin IVA)","${datos.subtotal}"`,
      `"IVA Cobrado","${datos.iva_cobrado}"`,
      `"Total de Cobros","${datos.total_cobros}"`,
      '',
      '"PROYECCIÓN DE IMPUESTOS"',
      '"Impuesto","Tasa (%)","Monto Estimado (Q)"',
      `"IVA","${tasas.iva}","${datos.iva_a_pagar}"`,
      `"ISR","${tasas.isr}","${datos.isr_a_pagar}"`,
      '',
      '"DESGLOSE POR MÉTODO DE PAGO"',
      '"Método","Total (Q)","Porcentaje"',
      `"Efectivo","${datos.efectivo}","${pct(datos.efectivo, totalMetodos)}"`,
      `"Tarjeta","${datos.tarjeta}","${pct(datos.tarjeta, totalMetodos)}"`,
      `"Transferencia","${datos.transferencia}","${pct(datos.transferencia, totalMetodos)}"`,
      `"Cuotas","${datos.cuotas}","${pct(datos.cuotas, totalMetodos)}"`,
      `"TOTAL","${totalMetodos}","100.0%"`,
      '',
      '"COMPARATIVO MES ANTERIOR"',
      '"Concepto","Valor (Q)"',
      `"Mes Anterior","${datos.total_mes_anterior}"`,
      `"Mes Actual","${datos.total_facturado}"`,
      `"Variación","${datos.variacion_porcentual != null ? datos.variacion_porcentual.toFixed(1) + '%' : 'N/D'}"`,
    ]

    const blob = new Blob([lineas.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `contabilidad_${String(mes).padStart(2, '0')}_${anio}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Exportar PDF ─────────────────────────────────────────────────────────────

  async function exportarPDF() {
    const el = reporteRef.current
    if (!el || !datos) return
    setGenerandoPDF(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const { jsPDF }   = await import('jspdf')

      const canvas  = await html2canvas(el, {
        scale: 2, useCORS: true, backgroundColor: '#f7faff', logging: false,
      })
      const imgData = canvas.toDataURL('image/png')
      const pdf     = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
      const pageW   = pdf.internal.pageSize.getWidth()
      const pageH   = pdf.internal.pageSize.getHeight()
      const imgH    = (canvas.height * pageW) / canvas.width

      let y = 0
      while (y < imgH) {
        if (y > 0) pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, -y, pageW, imgH)
        y += pageH
      }
      pdf.save(`contabilidad_${String(mes).padStart(2, '0')}_${anio}.pdf`)
    } catch (e) {
      console.error('Error al generar PDF:', e)
    } finally {
      setGenerandoPDF(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  const variacion      = datos?.variacion_porcentual ?? null
  const variacionColor = variacion == null ? '#5a8ab0' : variacion > 0 ? '#2ecc8a' : variacion < 0 ? '#e84040' : '#5a8ab0'
  const variacionIcono = variacion == null ? '→' : variacion > 0 ? '▲' : variacion < 0 ? '▼' : '→'

  const totalMetodos = datos
    ? datos.efectivo + datos.tarjeta + datos.transferencia + datos.cuotas
    : 0

  const filasMétodo = datos
    ? [
        { label: 'Efectivo',      valor: datos.efectivo      },
        { label: 'Tarjeta',       valor: datos.tarjeta       },
        { label: 'Transferencia', valor: datos.transferencia },
        { label: 'Cuotas',        valor: datos.cuotas        },
      ]
    : []

  return (
    <div>
      {/* Breadcrumb */}
      <nav style={{ fontSize: 13, color: '#5a8ab0', marginBottom: 16 }}>
        <span>Inicio</span>
        <span style={{ margin: '0 6px' }}>›</span>
        <span style={{ color: '#0d3d6e', fontWeight: 500 }}>Contabilidad</span>
      </nav>

      {/* Encabezado */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 24, flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: '#0d3d6e', margin: 0 }}>
            Contabilidad
          </h1>
          <p style={{ fontSize: 13, color: '#5a8ab0', margin: '4px 0 0' }}>
            Resumen mensual de ventas, impuestos y métodos de pago
          </p>
        </div>

        {/* Botones de exportación */}
        {datos && !cargando && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={exportarCSV} className="ct-btn ct-btn-secondary" style={{ fontSize: 13 }}>
              ↓ Exportar CSV
            </button>
            <button
              onClick={exportarPDF}
              disabled={generandoPDF}
              className="ct-btn ct-btn-secondary"
              style={{ fontSize: 13, opacity: generandoPDF ? 0.6 : 1 }}
            >
              {generandoPDF ? 'Generando…' : '🖨 Exportar PDF'}
            </button>
          </div>
        )}
      </div>

      {/* ── Controles ── */}
      <div className="ct-card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>

          {/* Mes */}
          <div style={{ flex: '1 1 160px', minWidth: 140 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#5a8ab0', marginBottom: 4 }}>
              Mes
            </label>
            <select
              className="ct-input"
              value={mes}
              onChange={(e) => setMes(Number(e.target.value))}
              style={{ cursor: 'pointer' }}
            >
              {MESES.map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>

          {/* Año */}
          <div style={{ flex: '1 1 110px', minWidth: 100 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#5a8ab0', marginBottom: 4 }}>
              Año
            </label>
            <input
              type="number"
              className="ct-input"
              value={anio}
              min={2020}
              max={2099}
              onChange={(e) => setAnio(Number(e.target.value))}
            />
          </div>

          {/* Sucursal — SucursalSelector se oculta automáticamente para plan estándar */}
          <SucursalSelector
            onSucursalChange={handleSucursalChange}
            style={{ flex: '1 1 220px', minWidth: 200 }}
          />

          {/* Botón Generar */}
          <button
            onClick={handleGenerar}
            disabled={cargando || sucursalIdFiltro === undefined}
            className="ct-btn ct-btn-primary"
            style={{ opacity: (cargando || sucursalIdFiltro === undefined) ? 0.6 : 1, whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            {cargando ? 'Generando…' : 'Generar reporte'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: '#fff0f0', border: '0.5px solid #e84040', borderRadius: 8,
          padding: '12px 16px', color: '#e84040', fontSize: 14, marginBottom: 20,
        }}>
          {error}
        </div>
      )}

      {/* Estado de carga inicial */}
      {cargando && !datos && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#5a8ab0', fontSize: 14 }}>
          Generando reporte…
        </div>
      )}

      {/* ── Contenido del reporte ── */}
      {datos && (
        <div ref={reporteRef}>

          {/* Encabezado de clínica (aparece en PDF) */}
          {empresa && (
            <ReporteHeader
              titulo="Reporte de Contabilidad Mensual"
              nombreClinica={empresa.nombre_comercial ?? empresa.nombre}
              logoUrl={empresa.logo_url}
            />
          )}

          {/* Título del período */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 20, flexWrap: 'wrap', gap: 8,
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#0d3d6e', margin: 0 }}>
              {MESES[mes - 1]} {anio}
              {sucursalNombreFiltro && (
                <span style={{ fontSize: 14, fontWeight: 400, color: '#5a8ab0', marginLeft: 8 }}>
                  · {sucursalNombreFiltro}
                </span>
              )}
            </h2>
            {cargando && (
              <span style={{ fontSize: 13, color: '#5a8ab0' }}>Actualizando…</span>
            )}
          </div>

          {/* ════════════════════════════════════════════════════════════════
              SECCIÓN 1 — Resumen de Ventas
          ════════════════════════════════════════════════════════════════ */}
          <div className="ct-card" style={{ marginBottom: 20 }}>
            <h3 style={{
              fontSize: 14, fontWeight: 600, color: '#0d3d6e',
              margin: '0 0 16px', paddingBottom: 10, borderBottom: '0.5px solid #e0eef8',
              textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>
              Resumen de Ventas
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              <TarjetaKPI label="Total Facturado"    valor={formatQ(datos.total_facturado)} />
              <TarjetaKPI label="Subtotal (sin IVA)" valor={formatQ(datos.subtotal)} />
              <TarjetaKPI label="IVA Cobrado"        valor={formatQ(datos.iva_cobrado)} />
              <TarjetaKPI
                label="Total de Cobros"
                valor={String(datos.total_cobros)}
                subvalor="transacciones pagadas"
              />
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════════
              SECCIÓN 2 — Proyección de Impuestos
          ════════════════════════════════════════════════════════════════ */}
          <div className="ct-card" style={{ marginBottom: 20 }}>
            <h3 style={{
              fontSize: 14, fontWeight: 600, color: '#0d3d6e',
              margin: '0 0 16px', paddingBottom: 10, borderBottom: '0.5px solid #e0eef8',
              textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>
              Proyección de Impuestos a Pagar
            </h3>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <TarjetaImpuesto
                label="IVA Estimado a Pagar"
                valor={formatQ(datos.iva_a_pagar)}
                tasa={tasas.iva}
                color="#1a6bbd"
              />
              <TarjetaImpuesto
                label="ISR Estimado a Pagar"
                valor={formatQ(datos.isr_a_pagar)}
                tasa={tasas.isr}
                color="#0d3d6e"
              />
            </div>
            <p style={{ fontSize: 12, color: '#5a8ab0', margin: '14px 0 0', fontStyle: 'italic' }}>
              * Valores estimados basados en las tasas configuradas.
              Consulte a su contador para la declaración oficial.
            </p>
          </div>

          {/* ════════════════════════════════════════════════════════════════
              SECCIÓN 3 — Desglose por Método de Pago
          ════════════════════════════════════════════════════════════════ */}
          <div className="ct-card" style={{ marginBottom: 20, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px 0' }}>
              <h3 style={{
                fontSize: 14, fontWeight: 600, color: '#0d3d6e',
                margin: '0 0 16px', paddingBottom: 10, borderBottom: '0.5px solid #e0eef8',
                textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>
                Desglose por Método de Pago
              </h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="ct-table">
                <thead>
                  <tr>
                    <th>Método de Pago</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                    <th style={{ textAlign: 'right' }}>Porcentaje</th>
                  </tr>
                </thead>
                <tbody>
                  {filasMétodo.map((fila) => (
                    <tr key={fila.label}>
                      <td style={{ fontWeight: 500 }}>{fila.label}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                        {formatQ(fila.valor)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                          <div style={{
                            width: 80, height: 6, background: '#e0eef8',
                            borderRadius: 3, overflow: 'hidden',
                          }}>
                            <div style={{
                              height: '100%', background: '#1a6bbd', borderRadius: 3,
                              width: totalMetodos ? `${(fila.valor / totalMetodos) * 100}%` : '0%',
                            }} />
                          </div>
                          <span style={{ color: '#0d3d6e', fontSize: 13, minWidth: 46, textAlign: 'right' }}>
                            {pct(fila.valor, totalMetodos)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#f0f7ff' }}>
                    <td style={{ fontWeight: 600, color: '#0d3d6e' }}>Total</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, fontFamily: 'monospace', color: '#0d3d6e' }}>
                      {formatQ(totalMetodos)}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#0d3d6e' }}>100.0%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════════
              SECCIÓN 4 — Comparativo Mes Anterior
          ════════════════════════════════════════════════════════════════ */}
          <div className="ct-card">
            <h3 style={{
              fontSize: 14, fontWeight: 600, color: '#0d3d6e',
              margin: '0 0 20px', paddingBottom: 10, borderBottom: '0.5px solid #e0eef8',
              textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>
              Comparativo con Mes Anterior
            </h3>

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {/* Mes anterior */}
              <div style={{
                flex: 1, minWidth: 140, background: '#f0f7ff',
                border: '0.5px solid #c5ddf5', borderRadius: 8, padding: 16,
              }}>
                <p style={{ fontSize: 12, fontWeight: 500, color: '#5a8ab0', margin: '0 0 4px' }}>
                  {mes === 1 ? `${MESES[11]} ${anio - 1}` : `${MESES[mes - 2]} ${anio}`}
                </p>
                <p style={{ fontSize: 24, fontWeight: 600, color: '#0d3d6e', margin: 0 }}>
                  {formatQ(datos.total_mes_anterior)}
                </p>
              </div>

              {/* Variación */}
              <div style={{
                flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', gap: 4, padding: '0 8px',
              }}>
                <span style={{ fontSize: 28, color: variacionColor }}>{variacionIcono}</span>
                <span style={{ fontSize: 16, fontWeight: 600, color: variacionColor }}>
                  {variacion == null
                    ? 'N/D'
                    : `${variacion > 0 ? '+' : ''}${variacion.toFixed(1)}%`}
                </span>
                <span style={{ fontSize: 11, color: '#5a8ab0' }}>variación</span>
              </div>

              {/* Mes actual */}
              <div style={{
                flex: 1, minWidth: 140, background: '#f0f7ff',
                border: `0.5px solid ${variacionColor}44`, borderRadius: 8, padding: 16,
              }}>
                <p style={{ fontSize: 12, fontWeight: 500, color: '#5a8ab0', margin: '0 0 4px' }}>
                  {MESES[mes - 1]} {anio} <span style={{ color: variacionColor }}>(actual)</span>
                </p>
                <p style={{ fontSize: 24, fontWeight: 600, color: '#0d3d6e', margin: 0 }}>
                  {formatQ(datos.total_facturado)}
                </p>
              </div>
            </div>

            {variacion == null && datos.total_mes_anterior === 0 && (
              <p style={{ fontSize: 12, color: '#5a8ab0', margin: '12px 0 0', fontStyle: 'italic' }}>
                * No hay cobros registrados en el mes anterior para comparar.
              </p>
            )}
          </div>

        </div>
      )}

      {/* Estado vacío */}
      {!datos && !cargando && !error && (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          border: '0.5px dashed #c5ddf5', borderRadius: 12,
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🧮</div>
          <div style={{ fontSize: 16, fontWeight: 500, color: '#0d3d6e', marginBottom: 6 }}>
            Seleccione un período
          </div>
          <div style={{ fontSize: 13, color: '#5a8ab0' }}>
            Elija el mes y año y presione "Generar reporte".
          </div>
        </div>
      )}
    </div>
  )
}
