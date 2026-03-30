'use client'

import { usePermisosContext } from '@/context/PermisosContext'

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface PermisoGuardProps {
  modulo: string
  accion: string
  children: React.ReactNode
}

// ── Componente ────────────────────────────────────────────────────────────────

/**
 * Oculta su contenido si el usuario no tiene el permiso requerido.
 * No redirige — simplemente no renderiza nada.
 *
 * Uso:
 *   <PermisoGuard modulo="cobros" accion="anular">
 *     <Button>Anular Cobro</Button>
 *   </PermisoGuard>
 */
export default function PermisoGuard({ modulo, accion, children }: PermisoGuardProps) {
  const { puede, loading } = usePermisosContext()

  // Mientras carga, no mostrar nada (evita flash de elementos no autorizados)
  if (loading) return null

  if (!puede(modulo, accion)) return null

  return <>{children}</>
}
