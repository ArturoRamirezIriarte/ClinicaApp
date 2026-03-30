'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { EMPRESA_ID } from '@/lib/config'

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type RolUsuario = 'admin' | 'dentista' | 'recepcionista' | 'asistente'

export interface UsePermisosReturn {
  puede: (modulo: string, accion: string) => boolean
  puedever: (modulo: string) => boolean
  loading: boolean
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function usePermisos(
  empresaId: string = EMPRESA_ID,
  rol: RolUsuario | null = null
): UsePermisosReturn {
  const [mapa, setMapa]     = useState<Map<string, boolean>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!empresaId || !rol) {
      setLoading(false)
      return
    }

    async function cargarPermisos() {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('rol_permisos')
          .select('modulo, accion, permitido')
          .eq('empresa_id', empresaId)
          .eq('rol', rol)

        if (error) {
          console.error('Error al cargar permisos:', error)
          return
        }

        const nuevoMapa = new Map<string, boolean>()
        for (const fila of data ?? []) {
          nuevoMapa.set(`${fila.modulo}:${fila.accion}`, fila.permitido)
        }
        setMapa(nuevoMapa)
      } finally {
        setLoading(false)
      }
    }

    cargarPermisos()
  }, [empresaId, rol])

  const puede = useCallback(
    (modulo: string, accion: string): boolean => {
      if (loading) return false
      return mapa.get(`${modulo}:${accion}`) ?? false
    },
    [mapa, loading]
  )

  const puedever = useCallback(
    (modulo: string): boolean => puede(modulo, 'ver'),
    [puede]
  )

  return { puede, puedever, loading }
}
