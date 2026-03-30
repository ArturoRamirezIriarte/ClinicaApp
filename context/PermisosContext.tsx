'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react'
import { supabase } from '@/lib/supabase'
import { EMPRESA_ID, ROL_USUARIO } from '@/lib/config'
import type { RolUsuario } from '@/hooks/usePermisos'

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface PermisosContextValue {
  puede: (modulo: string, accion: string) => boolean
  puedever: (modulo: string) => boolean
  loading: boolean
  rol: RolUsuario | null
  empresaId: string
}

// ── Contexto ──────────────────────────────────────────────────────────────────

const PermisosContext = createContext<PermisosContextValue | null>(null)

// ── Provider ──────────────────────────────────────────────────────────────────

export function PermisosProvider({ children }: { children: ReactNode }) {
  const [mapa, setMapa]       = useState<Map<string, boolean>>(new Map())
  const [loading, setLoading] = useState(true)
  const [empresaId]           = useState<string>(EMPRESA_ID)
  const [rol]                 = useState<RolUsuario | null>(
    (ROL_USUARIO as RolUsuario) || null
  )

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
          console.error('Error al cargar permisos del contexto:', error)
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

  return (
    <PermisosContext.Provider value={{ puede, puedever, loading, rol, empresaId }}>
      {children}
    </PermisosContext.Provider>
  )
}

// ── Hook de consumo ───────────────────────────────────────────────────────────

export function usePermisosContext(): PermisosContextValue {
  const ctx = useContext(PermisosContext)
  if (!ctx) {
    throw new Error('usePermisosContext debe usarse dentro de <PermisosProvider>')
  }
  return ctx
}
