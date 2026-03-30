'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { usePermisosContext } from '@/context/PermisosContext'

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface ProtectedRouteProps {
  modulo: string
  accion?: string
  children: React.ReactNode
  fallback?: React.ReactNode
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function ProtectedRoute({
  modulo,
  accion = 'ver',
  children,
  fallback,
}: ProtectedRouteProps) {
  const { puede, loading } = usePermisosContext()
  const router             = useRouter()
  const redirigido         = useRef(false)

  const tienePermiso = puede(modulo, accion)

  useEffect(() => {
    if (!loading && !tienePermiso && !redirigido.current) {
      redirigido.current = true
      sessionStorage.setItem(
        'clinica_sin_permiso',
        'No tenés permisos para acceder a esta sección.'
      )
      router.replace('/inicio')
    }
  }, [loading, tienePermiso, router])

  // Spinner mientras cargan los permisos
  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: 200, color: '#5a8ab0', fontSize: 14,
      }}>
        <svg
          style={{ width: 20, height: 20, marginRight: 8, animation: 'spin 1s linear infinite' }}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
        >
          <circle cx="12" cy="12" r="10" strokeOpacity={0.25} />
          <path d="M12 2a10 10 0 0 1 10 10" />
        </svg>
        Cargando...
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // Sin permiso — muestra fallback o pantalla de acceso denegado mientras redirige
  if (!tienePermiso) {
    if (fallback) return <>{fallback}</>

    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: 300, gap: 16,
      }}>
        <div style={{
          background: '#fff0f0', border: '0.5px solid #e84040', borderRadius: 12,
          padding: '24px 32px', textAlign: 'center', maxWidth: 400,
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
          <p style={{ color: '#7a1a1a', fontSize: 14, margin: 0 }}>
            No tenés permisos para acceder a esta sección.
          </p>
        </div>
        <button
          onClick={() => router.replace('/inicio')}
          style={{
            background: '#1a6bbd', color: '#fff', border: 'none',
            borderRadius: 8, height: 40, padding: '0 20px',
            fontSize: 14, cursor: 'pointer',
          }}
        >
          Ir al inicio
        </button>
      </div>
    )
  }

  return <>{children}</>
}
