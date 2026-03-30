'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import PermisoGuard from '@/components/PermisoGuard'
import { usePermisosContext } from '@/context/PermisosContext'

interface ItemNav {
  href: string
  etiqueta: string
  icono: string
  modulo: string | null  // null = siempre visible (inicio/dashboard)
}

const itemsNav: ItemNav[] = [
  { href: '/inicio',       icono: '⊞', etiqueta: 'Inicio',        modulo: null           },
  { href: '/pacientes',    icono: '👤', etiqueta: 'Pacientes',     modulo: 'pacientes'    },
  { href: '/medicos',      icono: '🩺', etiqueta: 'Médicos',       modulo: 'medicos'      },
  { href: '/citas',        icono: '📅', etiqueta: 'Citas',         modulo: 'agenda'       },
  { href: '/expedientes',  icono: '📋', etiqueta: 'Expedientes',   modulo: 'expediente'   },
  { href: '/cobros',       icono: '💳', etiqueta: 'Cobros',        modulo: 'cobros'       },
  { href: '/contabilidad', icono: '🧮', etiqueta: 'Contabilidad',  modulo: 'contabilidad' },
  { href: '/inventario',   icono: '📦', etiqueta: 'Inventario',    modulo: 'inventario'   },
  { href: '/configuracion',icono: '⚙',  etiqueta: 'Configuración', modulo: 'configuracion'},
]

export default function Sidebar() {
  const pathname  = usePathname()
  const { rol }   = usePermisosContext()
  const esAdmin   = rol === 'admin'

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
        {itemsNav.map((item) => {
          const esActivo = pathname === item.href || (
            item.href !== '/configuracion' && pathname.startsWith(item.href)
          ) || (
            item.href === '/configuracion' && pathname.startsWith('/configuracion') && !pathname.startsWith('/configuracion/')
          )
          const enlace = (
            <Link
              key={item.href}
              href={item.href}
              className={`ct-sidebar-item${esActivo ? ' activo' : ''}`}
            >
              <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{item.icono}</span>
              <span>{item.etiqueta}</span>
            </Link>
          )
          if (item.modulo === null) return enlace
          return (
            <PermisoGuard key={item.href} modulo={item.modulo} accion="ver">
              {enlace}
            </PermisoGuard>
          )
        })}

        {/* Sub-ítems de Configuración — solo visibles cuando se está en /configuracion */}
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
            {esAdmin && (
              <Link
                href="/configuracion/permisos"
                className={`ct-sidebar-item${pathname.startsWith('/configuracion/permisos') ? ' activo' : ''}`}
                style={{ paddingLeft: 44, fontSize: 13 }}
              >
                <span style={{ fontSize: 13, width: 20, textAlign: 'center' }}>🔑</span>
                <span>Permisos</span>
              </Link>
            )}
          </>
        )}
      </nav>

      {/* Footer */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '0.5px solid rgba(255,255,255,0.08)',
          color: '#5a8ab0',
          fontSize: 12,
        }}
      >
        Plan Trial · 30 días restantes
      </div>
    </aside>
  )
}
