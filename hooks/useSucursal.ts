'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { EMPRESA_ID } from '@/lib/config'

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface Sucursal {
  id: string
  nombre: string
  es_principal: boolean
}

export interface UseSucursalReturn {
  sucursales: Sucursal[]
  selectedSucursalId: string | null
  setSelectedSucursalId: (id: string | null) => void
  isMultiSucursal: boolean
  loading: boolean
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useSucursal(): UseSucursalReturn {
  const [sucursales, setSucursales]               = useState<Sucursal[]>([])
  const [selectedSucursalId, setSelectedSucursalId] = useState<string | null>(null)
  const [isMultiSucursal, setIsMultiSucursal]     = useState(false)
  const [loading, setLoading]                     = useState(true)

  useEffect(() => {
    async function init() {
      setLoading(true)
      try {
        const [{ data: empData }, { data: sucData }] = await Promise.all([
          supabase
            .from('empresas')
            .select('plan')
            .eq('id', EMPRESA_ID)
            .single(),
          supabase
            .from('sucursales')
            .select('id, nombre, es_principal')
            .eq('empresa_id', EMPRESA_ID)
            .eq('activa', true)
            .order('es_principal', { ascending: false })
            .order('nombre'),
        ])

        const plan = (empData as { plan: string } | null)?.plan ?? 'estandar'
        const lista = (sucData as Sucursal[]) ?? []
        setSucursales(lista)

        if (plan === 'estandar') {
          // Plan estándar: usar la sucursal principal automáticamente
          const principal = lista.find((s) => s.es_principal) ?? lista[0] ?? null
          setSelectedSucursalId(principal?.id ?? null)
          setIsMultiSucursal(false)
        } else {
          // Plan pro / enterprise: mostrar todas, por defecto "todas"
          setSelectedSucursalId(null)
          setIsMultiSucursal(true)
        }
      } catch (e) {
        console.error('Error al cargar sucursales:', e)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  return { sucursales, selectedSucursalId, setSelectedSucursalId, isMultiSucursal, loading }
}
