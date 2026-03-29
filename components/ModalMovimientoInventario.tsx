'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { EMPRESA_ID } from '@/lib/config'

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface ItemInventario {
  id: string
  nombre: string
  stock_actual: number
  unidad_medida: string
}

interface Props {
  item: ItemInventario
  tipoInicial: 'entrada' | 'salida'
  usuarioId: string | null
  onGuardado: (nuevoStock: number) => void
  onClose: () => void
}

const inputStyle: React.CSSProperties = {
  width: '100%', height: 40, padding: '0 12px', fontSize: 14,
  border: '0.5px solid #c5ddf5', borderRadius: 8, background: '#ffffff',
  color: '#0d3d6e', outline: 'none', boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 500, color: '#5a8ab0', marginBottom: 4,
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function ModalMovimientoInventario({
  item, tipoInicial, usuarioId, onGuardado, onClose,
}: Props) {
  const [tipo, setTipo]           = useState<'entrada' | 'salida'>(tipoInicial)
  const [cantidad, setCantidad]   = useState<number>(1)
  const [motivo, setMotivo]       = useState('')
  const [referencia, setReferencia] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError]         = useState<string | null>(null)

  async function guardar() {
    if (cantidad <= 0) { setError('La cantidad debe ser mayor a cero.'); return }
    if (tipo === 'salida' && cantidad > item.stock_actual) {
      setError(`Stock insuficiente. Stock actual: ${item.stock_actual} ${item.unidad_medida}.`)
      return
    }
    setError(null)
    setGuardando(true)
    try {
      const { data, error: err } = await supabase.rpc('clinica_mover_inventario', {
        p_empresa_id: EMPRESA_ID,
        p_item_id:    item.id,
        p_tipo:       tipo,
        p_cantidad:   cantidad,
        p_cita_id:    null,
        p_motivo:     motivo.trim() || null,
        p_usuario_id: usuarioId,
      })
      if (err) throw err
      onGuardado(Number(data))
    } catch (e: unknown) {
      console.error('Error al mover inventario:', e)
      const msg = e instanceof Error ? e.message : 'Ocurrió un error. Por favor intente de nuevo.'
      setError(msg)
    } finally {
      setGuardando(false)
    }
  }

  const stockResultado = tipo === 'entrada'
    ? item.stock_actual + cantidad
    : item.stock_actual - cantidad

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(13,61,110,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 440,
        border: '0.5px solid #c5ddf5',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px', borderBottom: '0.5px solid #e0eef8',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, color: '#0d3d6e', margin: 0 }}>
            {tipo === 'entrada' ? '+ Entrada de Inventario' : '− Salida de Inventario'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#5a8ab0' }}>×</button>
        </div>

        <div style={{ padding: '20px 24px' }}>
          {/* Nombre del ítem */}
          <div style={{
            background: '#f0f7ff', borderRadius: 8, padding: '10px 14px',
            marginBottom: 20, border: '0.5px solid #c5ddf5',
          }}>
            <div style={{ fontSize: 12, color: '#5a8ab0', marginBottom: 2 }}>Ítem</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#0d3d6e' }}>{item.nombre}</div>
            <div style={{ fontSize: 12, color: '#5a8ab0', marginTop: 2 }}>
              Stock actual: <strong style={{ color: '#0d3d6e' }}>{item.stock_actual} {item.unidad_medida}</strong>
            </div>
          </div>

          {error && (
            <div style={{
              background: '#fff0f0', border: '0.5px solid #e84040', borderRadius: 8,
              padding: '10px 14px', color: '#e84040', fontSize: 13, marginBottom: 16,
            }}>{error}</div>
          )}

          {/* Tipo de movimiento */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Tipo de movimiento</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['entrada', 'salida'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTipo(t)}
                  style={{
                    flex: 1, height: 40, borderRadius: 8, cursor: 'pointer', fontSize: 14,
                    fontWeight: tipo === t ? 600 : 400,
                    background: tipo === t ? (t === 'entrada' ? '#e8fff5' : '#fff0f0') : '#f7faff',
                    border: `1px solid ${tipo === t ? (t === 'entrada' ? '#2ecc8a' : '#e84040') : '#c5ddf5'}`,
                    color: tipo === t ? (t === 'entrada' ? '#0a5535' : '#e84040') : '#5a8ab0',
                  }}
                >
                  {t === 'entrada' ? '▲ Entrada' : '▼ Salida'}
                </button>
              ))}
            </div>
          </div>

          {/* Cantidad */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Cantidad <span style={{ color: '#e84040' }}>*</span></label>
            <input
              type="number" min={1} step="0.01" value={cantidad}
              onChange={(e) => setCantidad(Math.max(0.01, Number(e.target.value)))}
              style={inputStyle}
            />
          </div>

          {/* Motivo */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Motivo</label>
            <input type="text" value={motivo} onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: Compra proveedora, uso en paciente..." style={inputStyle} />
          </div>

          {/* Referencia */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Referencia (opcional)</label>
            <input type="text" value={referencia} onChange={(e) => setReferencia(e.target.value)}
              placeholder="Ej: Factura #1234" style={inputStyle} />
          </div>

          {/* Vista previa del stock resultante */}
          <div style={{
            background: '#f7faff', borderRadius: 8, padding: '10px 14px',
            marginBottom: 20, border: '0.5px solid #e0eef8',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 13, color: '#5a8ab0' }}>Stock resultante</span>
            <span style={{
              fontSize: 16, fontWeight: 700,
              color: stockResultado < 0 ? '#e84040' : stockResultado === 0 ? '#7a5500' : '#0d3d6e',
            }}>
              {stockResultado} {item.unidad_medida}
            </span>
          </div>

          {/* Botones */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onClose} className="ct-btn ct-btn-secondary">Cancelar</button>
            <button
              onClick={guardar}
              disabled={guardando || cantidad <= 0}
              className="ct-btn ct-btn-primary"
              style={{ opacity: (guardando || cantidad <= 0) ? 0.6 : 1 }}
            >
              {guardando ? 'Registrando...' : `Registrar ${tipo === 'entrada' ? 'entrada' : 'salida'}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
