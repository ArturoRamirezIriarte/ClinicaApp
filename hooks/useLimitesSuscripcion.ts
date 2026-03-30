'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { EMPRESA_ID } from '@/lib/config'

// Planes válidos del sistema
export type PlanSuscripcion = 'estandar' | 'profesional' | 'enterprise'

interface LimitesEmpresa {
  plan: PlanSuscripcion
  max_sucursales: number
  max_usuarios: number
}

interface UseLimitesReturn {
  plan: PlanSuscripcion | null
  sucursalesActuales: number
  maxSucursales: number
  usuariosActuales: number
  maxUsuarios: number
  puedeAgregarSucursal: () => boolean
  puedeAgregarUsuario: () => boolean
  loading: boolean
}

const LIMITE_FALLBACK: LimitesEmpresa = {
  plan:           'estandar',
  max_sucursales: 1,
  max_usuarios:   5,
}

export function useLimitesSuscripcion(empresaId: string = EMPRESA_ID): UseLimitesReturn {
  const [limites, setLimites]                 = useState<LimitesEmpresa | null>(null)
  const [sucursalesActuales, setSucursalesActuales] = useState(0)
  const [usuariosActuales, setUsuariosActuales]     = useState(0)
  const [loading, setLoading]                 = useState(true)

  useEffect(() => {
    if (!empresaId) { setLoading(false); return }

    async function cargar() {
      setLoading(true)
      try {
        const [resEmpresa, resSucursales, resUsuarios] = await Promise.all([
          supabase
            .from('empresas')
            .select('plan, max_sucursales, max_usuarios')
            .eq('id', empresaId)
            .single(),
          supabase
            .from('sucursales')
            .select('id', { count: 'exact', head: true })
            .eq('empresa_id', empresaId)
            .eq('activa', true),
          supabase
            .from('usuarios')
            .select('id', { count: 'exact', head: true })
            .eq('empresa_id', empresaId)
            .eq('activo', true),
        ])

        if (resEmpresa.data) {
          setLimites(resEmpresa.data as LimitesEmpresa)
        } else {
          setLimites(LIMITE_FALLBACK)
        }

        setSucursalesActuales(resSucursales.count ?? 0)
        setUsuariosActuales(resUsuarios.count ?? 0)
      } catch (e) {
        console.error('Error al cargar límites de suscripción:', e)
        setLimites(LIMITE_FALLBACK)
      } finally {
        setLoading(false)
      }
    }

    cargar()
  }, [empresaId])

  const maxSucursales = limites?.max_sucursales ?? LIMITE_FALLBACK.max_sucursales
  const maxUsuarios   = limites?.max_usuarios   ?? LIMITE_FALLBACK.max_usuarios

  return {
    plan:               limites?.plan ?? null,
    sucursalesActuales,
    maxSucursales,
    usuariosActuales,
    maxUsuarios,
    puedeAgregarSucursal: () => sucursalesActuales < maxSucursales,
    puedeAgregarUsuario:  () => usuariosActuales < maxUsuarios,
    loading,
  }
}
