'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { EMPRESA_ID } from '@/lib/config'

// ── Tipos ────────────────────────────────────────────────────────────────────

interface MovimientoRow {
  id: string
  tipo: string
  cantidad: number
  stock_anterior: number
  stock_nuevo: number
  motivo: string | null
  referencia: string | null
  creado_en: string
}

interface Props {
  itemId: string
  itemNombre: string
  unidadMedida: string
  onClose: () => void
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatFechaHora(iso: string): string {
  return new Date(iso).toLocaleString('es-GT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

const CONFIG_TIPO: Record<string, { bg: string; color: string; label: string; signo: string }> = {
  entrada:    { bg: '#e8fff5', color: '#0a5535', label: 'Entrada',    signo: '+' },
  salida:     { bg: '#fff0f0', color: '#7a1a1a', label: 'Salida',     signo: '−' },
  consumo:    { bg: '#e8f4ff', color: '#0d3d6e', label: 'Consumo',    signo: '−' },
  ajuste:     { bg: '#fff8e8', color: '#7a5500', label: 'Ajuste',     signo: '~' },
  vencimiento:{ bg: '#f5e8ff', color: '#5a1a8a', label: 'Vencimiento',signo: '−' },
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function ModalHistorialMovimientos({
  itemId, itemNombre, unidadMedida, onClose,
}: Props) {
  const [movimientos, setMovimientos] = useState<MovimientoRow[]>([])
  const [cargando, setCargando]       = useState(true)

  useEffect(() => {
    async function cargar() {
      setCargando(true)
      const { data } = await supabase
        .from('inventario_movimientos')
        .select('id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, referencia, creado_en')
        .eq('empresa_id', EMPRESA_ID)
        .eq('item_id', itemId)
        .order('creado_en', { ascending: false })
        .limit(100)
      setMovimientos((data as MovimientoRow[]) ?? [])
      setCargando(false)
    }
    cargar()
  }, [itemId])

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
        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 680,
        border: '0.5px solid #c5ddf5', maxHeight: '88vh', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px', borderBottom: '0.5px solid #e0eef8',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          flexShrink: 0,
        }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 600, color: '#0d3d6e', margin: '0 0 2px' }}>
              Historial de Movimientos
            </h2>
            <div style={{ fontSize: 13, color: '#5a8ab0' }}>{itemNombre}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#5a8ab0', flexShrink: 0, padding: 4 }}>×</button>
        </div>

        {/* Contenido */}
        <div style={{ padding: '16px 24px 24px', overflowY: 'auto', flex: 1 }}>
          {cargando ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#5a8ab0', fontSize: 14 }}>
              Cargando historial...
            </div>
          ) : movimientos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#5a8ab0', fontSize: 14 }}>
              No hay movimientos registrados para este ítem.
            </div>
          ) : (
            <table className="ct-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Cantidad</th>
                  <th>Stock anterior → nuevo</th>
                  <th>Motivo / Referencia</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.map((mov) => {
                  const cfg = CONFIG_TIPO[mov.tipo] ?? { bg: '#f0f7ff', color: '#5a8ab0', label: mov.tipo, signo: '' }
                  return (
                    <tr key={mov.id}>
                      <td style={{ whiteSpace: 'nowrap', color: '#5a8ab0', fontSize: 12 }}>
                        {formatFechaHora(mov.creado_en)}
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-block', padding: '2px 8px', borderRadius: 20,
                          background: cfg.bg, color: cfg.color, fontSize: 12, fontWeight: 600,
                        }}>
                          {cfg.label}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, color: mov.tipo === 'entrada' ? '#0a5535' : '#e84040', whiteSpace: 'nowrap' }}>
                        {cfg.signo}{Math.abs(mov.cantidad)} {unidadMedida}
                      </td>
                      <td style={{ fontSize: 13, whiteSpace: 'nowrap', color: '#5a8ab0' }}>
                        <span style={{ color: '#0d3d6e', fontWeight: 500 }}>{mov.stock_anterior}</span>
                        {' → '}
                        <span style={{ color: '#1a6bbd', fontWeight: 600 }}>{mov.stock_nuevo}</span>
                      </td>
                      <td style={{ fontSize: 12, color: '#5a8ab0' }}>
                        {mov.motivo && <div>{mov.motivo}</div>}
                        {mov.referencia && <div style={{ color: '#c5ddf5' }}>{mov.referencia}</div>}
                        {!mov.motivo && !mov.referencia && '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
