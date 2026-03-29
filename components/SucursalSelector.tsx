'use client'

import { useEffect } from 'react'
import { useSucursal } from '@/hooks/useSucursal'

// ── Props ─────────────────────────────────────────────────────────────────────

interface SucursalSelectorProps {
  /**
   * Se llama cuando cambia la sucursal seleccionada.
   * id === null significa "todas las sucursales".
   * nombre === null cuando es "todas" o plan estándar sin nombre disponible.
   */
  onSucursalChange: (id: string | null, nombre: string | null) => void
  style?: React.CSSProperties
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function SucursalSelector({ onSucursalChange, style }: SucursalSelectorProps) {
  const { sucursales, selectedSucursalId, setSelectedSucursalId, isMultiSucursal, loading } =
    useSucursal()

  // Notificar al padre en cuanto tengamos la sucursal inicial (post-carga)
  useEffect(() => {
    if (loading) return
    const nombre = selectedSucursalId
      ? (sucursales.find((s) => s.id === selectedSucursalId)?.nombre ?? null)
      : null
    onSucursalChange(selectedSucursalId, nombre)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading])

  // Plan estándar — no renderizar nada visible
  if (!isMultiSucursal) return null

  function handleChange(valor: string) {
    const nuevo = valor === '' ? null : valor
    const nombre = nuevo ? (sucursales.find((s) => s.id === nuevo)?.nombre ?? null) : null
    setSelectedSucursalId(nuevo)
    onSucursalChange(nuevo, nombre)
  }

  return (
    <div style={style}>
      <label style={{
        display: 'block', fontSize: 13, fontWeight: 500,
        color: '#5a8ab0', marginBottom: 4,
      }}>
        Sucursal
      </label>
      <select
        className="ct-input"
        value={selectedSucursalId ?? ''}
        onChange={(e) => handleChange(e.target.value)}
        disabled={loading}
        style={{ cursor: loading ? 'not-allowed' : 'pointer' }}
      >
        <option value="">Todas las sucursales</option>
        {sucursales.map((s) => (
          <option key={s.id} value={s.id}>{s.nombre}</option>
        ))}
      </select>
    </div>
  )
}
