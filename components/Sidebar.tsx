'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { leerPermisos, type Modulo } from '@/lib/permisos'
import { supabase } from '@/lib/supabase'

// ── Tipos ──────────────────────────────────────────────────────────────────

interface ItemNav {
  href: string
  etiqueta: string
  icono: string
  modulo: Modulo
}

// ── Items de navegación ────────────────────────────────────────────────────

const itemsNav: ItemNav[] = [
  { href: '/inicio',       icono: '⊞', etiqueta: 'Inicio',        modulo: 'dashboard'     },
  { href: '/pacientes',    icono: '👤', etiqueta: 'Pacientes',     modulo: 'pacientes'     },
  { href: '/medicos',      icono: '🩺', etiqueta: 'Médicos',       modulo: 'medicos'       },
  { href: '/citas',        icono: '📅', etiqueta: 'Citas',         modulo: 'agenda'        },
  { href: '/expedientes',  icono: '📋', etiqueta: 'Expedientes',   modulo: 'expediente'    },
  { href: '/cobros',       icono: '💳', etiqueta: 'Cobros',        modulo: 'cobros'        },
  { href: '/contabilidad', icono: '🧮', etiqueta: 'Contabilidad',  modulo: 'contabilidad'  },
  { href: '/inventario',   icono: '📦', etiqueta: 'Inventario',    modulo: 'inventario'    },
  { href: '/reportes',     icono: '📊', etiqueta: 'Reportes',      modulo: 'reportes'      },
  { href: '/configuracion',icono: '⚙',  etiqueta: 'Configuración', modulo: 'configuracion' },
]

// ── Componente ─────────────────────────────────────────────────────────────

export default function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()

  // Leer permisos de localStorage de forma síncrona — sin useEffect, sin loading
  const permisos = leerPermisos()
  const itemsVisibles = itemsNav.filter((item) => permisos.modulos[item.modulo])

  // ── Cerrar sesión ────────────────────────────────────────────────────────
  async function cerrarSesion() {
    localStorage.removeItem('clinica_permisos')
    localStorage.removeItem('clinica_usuario')
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <aside className="ct-sidebar flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[rgba(255,255,255,0.08)]">
        <div className="flex items-center gap-3">
          <div
            style={{
              width: 32,
              height: 32,
              background: '#1a6bbd',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
            }}
          >
            🏥
          </div>
          <div>
            <div style={{ color: '#ffffff', fontWeight: 600, fontSize: 15 }}>ClinicaApp</div>
            <div style={{ color: '#5a8ab0', fontSize: 11 }}>Strategic Solutions GT</div>
          </div>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 py-4">
        {itemsVisibles.map((item) => {
          const esActivo = pathname === item.href || (
            item.href !== '/configuracion' && pathname.startsWith(item.href)
          ) || (
            item.href === '/configuracion' && pathname.startsWith('/configuracion') && !pathname.startsWith('/configuracion/')
          )
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`ct-sidebar-item${esActivo ? ' activo' : ''}`}
            >
              <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{item.icono}</span>
              <span>{item.etiqueta}</span>
            </Link>
          )
        })}

        {/* Sub-ítems de Configuración */}
        {pathname.startsWith('/configuracion') && (
          <>
            <Link
              href="/configuracion/sucursales"
              className={`ct-sidebar-item${pathname.startsWith('/configuracion/sucursales') ? ' activo' : ''}`}
              style={{ paddingLeft: 44, fontSize: 13 }}
            >
              <span style={{ fontSize: 13, width: 20, textAlign: 'center' }}>📍</span>
              <span>Sucursales</span>
            </Link>
            <Link
              href="/configuracion/usuarios"
              className={`ct-sidebar-item${pathname.startsWith('/configuracion/usuarios') ? ' activo' : ''}`}
              style={{ paddingLeft: 44, fontSize: 13 }}
            >
              <span style={{ fontSize: 13, width: 20, textAlign: 'center' }}>👥</span>
              <span>Usuarios y Roles</span>
            </Link>
            <Link
              href="/configuracion/notificaciones"
              className={`ct-sidebar-item${pathname.startsWith('/configuracion/notificaciones') ? ' activo' : ''}`}
              style={{ paddingLeft: 44, fontSize: 13 }}
            >
              <span style={{ fontSize: 13, width: 20, textAlign: 'center' }}>🔔</span>
              <span>Notificaciones</span>
            </Link>
            <Link
              href="/configuracion/permisos"
              className={`ct-sidebar-item${pathname.startsWith('/configuracion/permisos') ? ' activo' : ''}`}
              style={{ paddingLeft: 44, fontSize: 13 }}
            >
              <span style={{ fontSize: 13, width: 20, textAlign: 'center' }}>🔐</span>
              <span>Permisos</span>
            </Link>
          </>
        )}
      </nav>

      {/* Footer */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '0.5px solid rgba(255,255,255,0.08)',
        }}
      >
        <div style={{ color: '#5a8ab0', fontSize: 12, marginBottom: 8 }}>
          Plan Trial · 30 días restantes
        </div>
        <button
          onClick={cerrarSesion}
          style={{
            width: '100%',
            height: 32,
            background: 'transparent',
            border: '0.5px solid rgba(255,255,255,0.15)',
            borderRadius: 8,
            color: '#a8c8e8',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
            e.currentTarget.style.color = '#ffffff'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = '#a8c8e8'
          }}
        >
          <span style={{ fontSize: 13 }}>⎋</span>
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
