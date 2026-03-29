'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { EMPRESA_ID } from '@/lib/config'

// ── Tipos ────────────────────────────────────────────────────────────────────

interface Props {
  sucursalId: string
  onGuardado: () => void
  onClose: () => void
}

const CATEGORIAS = [
  { value: 'material_dental', label: 'Material Dental' },
  { value: 'medicamento',     label: 'Medicamento'     },
  { value: 'instrumental',    label: 'Instrumental'    },
  { value: 'descartable',     label: 'Descartable'     },
  { value: 'limpieza',        label: 'Limpieza'        },
  { value: 'otro',            label: 'Otro'            },
]

const inputStyle: React.CSSProperties = {
  width: '100%', height: 40, padding: '0 12px', fontSize: 14,
  border: '0.5px solid #c5ddf5', borderRadius: 8, background: '#ffffff',
  color: '#0d3d6e', outline: 'none', boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 500, color: '#5a8ab0', marginBottom: 4,
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function ModalNuevoItemInventario({ sucursalId, onGuardado, onClose }: Props) {
  const [nombre, setNombre]           = useState('')
  const [categoria, setCategoria]     = useState('material_dental')
  const [unidad, setUnidad]           = useState('unidad')
  const [codigo, setCodigo]           = useState('')
  const [stockActual, setStockActual] = useState(0)
  const [stockMinimo, setStockMinimo] = useState(0)
  const [stockMaximo, setStockMaximo] = useState<number | ''>('')
  const [precioCosto, setPrecioCosto] = useState<number | ''>('')
  const [guardando, setGuardando]     = useState(false)
  const [error, setError]             = useState<string | null>(null)

  async function guardar() {
    if (!nombre.trim()) { setError('El nombre es requerido.'); return }
    setError(null)
    setGuardando(true)
    try {
      const { error: err } = await supabase.from('inventario_items').insert({
        empresa_id:    EMPRESA_ID,
        sucursal_id:   sucursalId,
        nombre:        nombre.trim(),
        categoria,
        unidad_medida: unidad.trim() || 'unidad',
        codigo:        codigo.trim() || null,
        stock_actual:  stockActual,
        stock_minimo:  stockMinimo,
        stock_maximo:  stockMaximo !== '' ? stockMaximo : null,
        precio_costo:  precioCosto !== '' ? precioCosto : null,
        activo:        true,
      })
      if (err) throw err
      onGuardado()
    } catch (e) {
      console.error('Error al guardar ítem:', e)
      setError('Ocurrió un error al guardar. Por favor intente de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

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
        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 520,
        border: '0.5px solid #c5ddf5', maxHeight: '90vh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px', borderBottom: '0.5px solid #e0eef8',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, color: '#0d3d6e', margin: 0 }}>
            Nuevo Ítem de Inventario
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#5a8ab0' }}>×</button>
        </div>

        <div style={{ padding: '20px 24px' }}>
          {error && (
            <div style={{
              background: '#fff0f0', border: '0.5px solid #e84040', borderRadius: 8,
              padding: '10px 14px', color: '#e84040', fontSize: 13, marginBottom: 16,
            }}>{error}</div>
          )}

          {/* Nombre + Categoría */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Nombre <span style={{ color: '#e84040' }}>*</span></label>
              <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Guantes de látex" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Categoría</label>
              <select value={categoria} onChange={(e) => setCategoria(e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}>
                {CATEGORIAS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>

          {/* Unidad + Código */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Unidad de medida</label>
              <input type="text" value={unidad} onChange={(e) => setUnidad(e.target.value)}
                placeholder="unidad, caja, litro..." style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Código interno</label>
              <input type="text" value={codigo} onChange={(e) => setCodigo(e.target.value)}
                placeholder="Ej: MAT-001" style={inputStyle} />
            </div>
          </div>

          {/* Stocks */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Stock actual</label>
              <input type="number" min={0} value={stockActual}
                onChange={(e) => setStockActual(Math.max(0, Number(e.target.value)))}
                style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Stock mínimo</label>
              <input type="number" min={0} value={stockMinimo}
                onChange={(e) => setStockMinimo(Math.max(0, Number(e.target.value)))}
                style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Stock máximo</label>
              <input type="number" min={0} value={stockMaximo}
                onChange={(e) => setStockMaximo(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                placeholder="Opcional" style={inputStyle} />
            </div>
          </div>

          {/* Precio costo */}
          <div style={{ marginBottom: 24, maxWidth: 180 }}>
            <label style={labelStyle}>Precio de costo (Q)</label>
            <input type="number" min={0} step="0.01" value={precioCosto}
              onChange={(e) => setPrecioCosto(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
              placeholder="Opcional" style={inputStyle} />
          </div>

          {/* Botones */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onClose} className="ct-btn ct-btn-secondary">Cancelar</button>
            <button onClick={guardar} disabled={guardando} className="ct-btn ct-btn-primary"
              style={{ opacity: guardando ? 0.6 : 1 }}>
              {guardando ? 'Guardando...' : 'Guardar Ítem'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
