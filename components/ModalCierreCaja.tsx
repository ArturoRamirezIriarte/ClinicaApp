'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { EMPRESA_ID } from '@/lib/config'

// ── Tipos ────────────────────────────────────────────────────────────────────

interface CobroResumen {
  id: string
  total: number
  metodo_pago: string
  estado: string
  fel_estado: string
}

interface ResumenCaja {
  total_efectivo:      number
  total_tarjeta:       number
  total_transferencia: number
  total_cuotas:        number
  total_general:       number
  facturas_emitidas:   number
  facturas_anuladas:   number
}

function formatQ(n: number): string {
  return `Q ${Number(n).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function ModalCierreCaja({
  cobrosHoy,
  onClose,
  onCerrado,
}: {
  cobrosHoy: CobroResumen[]
  onClose: () => void
  onCerrado: () => void
}) {
  const [guardando, setGuardando] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [cerrado, setCerrado]     = useState(false)
  const [notas, setNotas]         = useState('')

  // ── Calcular resumen ──────────────────────────────────────────────────

  const pagados = cobrosHoy.filter((c) => c.estado === 'pagado')

  const resumen: ResumenCaja = {
    total_efectivo:      pagados.filter((c) => c.metodo_pago === 'efectivo').reduce((s, c) => s + Number(c.total), 0),
    total_tarjeta:       pagados.filter((c) => ['tarjeta_credito','tarjeta_debito'].includes(c.metodo_pago)).reduce((s, c) => s + Number(c.total), 0),
    total_transferencia: pagados.filter((c) => c.metodo_pago === 'transferencia').reduce((s, c) => s + Number(c.total), 0),
    total_cuotas:        pagados.filter((c) => c.metodo_pago === 'cuota').reduce((s, c) => s + Number(c.total), 0),
    total_general:       pagados.reduce((s, c) => s + Number(c.total), 0),
    facturas_emitidas:   cobrosHoy.filter((c) => c.fel_estado === 'emitida').length,
    facturas_anuladas:   cobrosHoy.filter((c) => c.estado === 'anulado').length,
  }

  // ── Cerrar caja ───────────────────────────────────────────────────────

  async function cerrarCaja() {
    setError(null)
    setGuardando(true)
    try {
      const hoy = new Date().toISOString().split('T')[0]

      // Obtener sucursal_id
      const { data: suc } = await supabase
        .from('sucursales')
        .select('id')
        .eq('empresa_id', EMPRESA_ID)
        .limit(1)
        .single()

      if (!suc) throw new Error('No se encontró sucursal para esta empresa.')

      // Obtener usuario
      const { data: usr } = await supabase
        .from('usuarios')
        .select('id')
        .eq('empresa_id', EMPRESA_ID)
        .limit(1)
        .single()

      const { error: errCierre } = await supabase
        .from('caja_cierres')
        .upsert({
          empresa_id:          EMPRESA_ID,
          sucursal_id:         suc.id,
          fecha:               hoy,
          total_efectivo:      resumen.total_efectivo,
          total_tarjeta:       resumen.total_tarjeta,
          total_transferencia: resumen.total_transferencia,
          total_cuotas:        resumen.total_cuotas,
          total_general:       resumen.total_general,
          facturas_emitidas:   resumen.facturas_emitidas,
          facturas_anuladas:   resumen.facturas_anuladas,
          cerrado_por:         usr?.id ?? null,
          cerrado_en:          new Date().toISOString(),
          notas:               notas.trim() || null,
        }, { onConflict: 'sucursal_id,fecha' })

      if (errCierre) throw errCierre

      setCerrado(true)
    } catch (e) {
      console.error('Error al cerrar caja:', e)
      setError('Ocurrió un error al cerrar la caja. Por favor intente de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(13,61,110,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#ffffff', borderRadius: 16,
        width: '100%', maxWidth: 480,
        border: '0.5px solid #c5ddf5',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '0.5px solid #e0eef8',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, color: '#0d3d6e', margin: 0 }}>
            🔒 Cierre de Caja
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 20, color: '#5a8ab0', lineHeight: 1, padding: 4,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: '20px 24px' }}>
          {!cerrado ? (
            <>
              {/* Fecha */}
              <div style={{ fontSize: 13, color: '#5a8ab0', marginBottom: 20 }}>
                {new Date().toLocaleDateString('es-GT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
              </div>

              {/* Resumen por método */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0d3d6e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                  Resumen por forma de pago
                </div>

                {[
                  { label: 'Efectivo',       valor: resumen.total_efectivo      },
                  { label: 'Tarjetas',        valor: resumen.total_tarjeta       },
                  { label: 'Transferencias',  valor: resumen.total_transferencia },
                  { label: 'Cuotas',          valor: resumen.total_cuotas        },
                ].map(({ label, valor }) => (
                  <div key={label} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 0', borderBottom: '0.5px solid #f0f7ff',
                  }}>
                    <span style={{ fontSize: 14, color: '#5a8ab0' }}>{label}</span>
                    <span style={{ fontSize: 14, fontWeight: valor > 0 ? 600 : 400, color: valor > 0 ? '#0d3d6e' : '#c5ddf5' }}>
                      {formatQ(valor)}
                    </span>
                  </div>
                ))}

                {/* Total general */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  paddingTop: 12, marginTop: 4, borderTop: '1.5px solid #1a6bbd',
                }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: '#0d3d6e' }}>Total del día</span>
                  <span style={{ fontSize: 20, fontWeight: 700, color: '#1a6bbd' }}>
                    {formatQ(resumen.total_general)}
                  </span>
                </div>
              </div>

              {/* FEL */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20,
              }}>
                <div style={{
                  background: '#e8fff5', border: '0.5px solid #2ecc8a',
                  borderRadius: 8, padding: '10px 14px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#0a5535' }}>
                    {resumen.facturas_emitidas}
                  </div>
                  <div style={{ fontSize: 12, color: '#0a5535' }}>Facturas FEL emitidas</div>
                </div>
                <div style={{
                  background: resumen.facturas_anuladas > 0 ? '#fff0f0' : '#f7faff',
                  border: `0.5px solid ${resumen.facturas_anuladas > 0 ? '#e84040' : '#e0eef8'}`,
                  borderRadius: 8, padding: '10px 14px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: resumen.facturas_anuladas > 0 ? '#e84040' : '#5a8ab0' }}>
                    {resumen.facturas_anuladas}
                  </div>
                  <div style={{ fontSize: 12, color: '#5a8ab0' }}>Facturas anuladas</div>
                </div>
              </div>

              {/* Notas */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#5a8ab0', marginBottom: 4 }}>
                  Observaciones (opcional)
                </label>
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  rows={2}
                  placeholder="Ej: Diferencia en efectivo de Q5.00..."
                  style={{
                    width: '100%', padding: '8px 12px', fontSize: 13,
                    border: '0.5px solid #c5ddf5', borderRadius: 8,
                    background: '#ffffff', color: '#0d3d6e', outline: 'none',
                    resize: 'vertical', boxSizing: 'border-box',
                  }}
                />
              </div>

              {error && (
                <div style={{
                  background: '#fff0f0', border: '0.5px solid #e84040', borderRadius: 8,
                  padding: '10px 14px', color: '#e84040', fontSize: 13, marginBottom: 16,
                }}>
                  {error}
                </div>
              )}

              {/* Botones */}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={onClose} className="ct-btn ct-btn-secondary">
                  Cancelar
                </button>
                <button
                  onClick={cerrarCaja}
                  disabled={guardando}
                  className="ct-btn ct-btn-primary"
                  style={{ opacity: guardando ? 0.6 : 1 }}
                >
                  {guardando ? 'Cerrando...' : '🔒 Cerrar Caja'}
                </button>
              </div>
            </>
          ) : (
            /* Estado: cierre exitoso */
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: '#0d3d6e', marginBottom: 8 }}>
                Caja cerrada correctamente
              </div>
              <div style={{ fontSize: 14, color: '#5a8ab0', marginBottom: 24 }}>
                Total del día: <strong style={{ color: '#1a6bbd' }}>{formatQ(resumen.total_general)}</strong>
              </div>
              <button onClick={onCerrado} className="ct-btn ct-btn-primary">
                Aceptar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
