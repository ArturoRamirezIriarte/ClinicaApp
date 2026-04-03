'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { supabase } from '@/lib/supabase'
import { EMPRESA_ID } from '@/lib/config'

// ── Definición de secciones ────────────────────────────────────────────────

interface ItemReporte {
  href: string
  etiqueta: string
  soloMultiSucursal?: boolean
}

const FACTURACION: ItemReporte[] = [
  { href: '/reportes/facturacion/por-doctor',      etiqueta: 'Por Doctor'      },
  { href: '/reportes/facturacion/por-sucursal',    etiqueta: 'Por Sucursal', soloMultiSucursal: true },
  { href: '/reportes/facturacion/por-tratamiento', etiqueta: 'Por Tratamiento' },
  { href: '/reportes/facturacion/metodos-pago',    etiqueta: 'Métodos de Pago' },
]

const INVENTARIO: ItemReporte[] = [
  { href: '/reportes/inventario/alertas',  etiqueta: 'Alertas de Stock'   },
  { href: '/reportes/inventario/consumo',  etiqueta: 'Consumo de Insumos' },
]

// ── Sub-ítem de navegación ─────────────────────────────────────────────────

function ItemNav({ href, etiqueta, activo }: { href: string; etiqueta: string; activo: boolean }) {
  return (
    <Link
      href={href}
      style={{
        display: 'block',
        padding: '8px 16px 8px 20px',
        fontSize: 13,
        fontWeight: activo ? 500 : 400,
        color: activo ? '#1a6bbd' : '#5a8ab0',
        background: activo ? '#e8f4ff' : 'transparent',
        borderLeft: activo ? '2.5px solid #1a6bbd' : '2.5px solid transparent',
        textDecoration: 'none',
        transition: 'background 0.12s, color 0.12s',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {etiqueta}
    </Link>
  )
}

// ── Layout ─────────────────────────────────────────────────────────────────

export default function LayoutReportes({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [esPlanEstandar, setEsPlanEstandar] = useState(false)

  useEffect(() => {
    supabase
      .from('empresas')
      .select('plan')
      .eq('id', EMPRESA_ID)
      .single()
      .then(({ data }) => {
        const plan = (data as { plan: string } | null)?.plan ?? 'estandar'
        setEsPlanEstandar(plan === 'estandar')
      })
  }, [])

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* ── Topbar ── */}
        <header
          style={{
            height: 60,
            background: '#0d3d6e',
            borderBottom: '0.5px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            flexShrink: 0,
          }}
        >
          <span style={{ color: '#a8c8e8', fontSize: 14 }}>Reportes</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: '#a8c8e8', fontSize: 13 }}>Dr. Administrador</span>
            <div
              style={{
                width: 32, height: 32, background: '#1a6bbd', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#ffffff', fontSize: 13, fontWeight: 600,
              }}
            >
              A
            </div>
          </div>
        </header>

        {/* ── Cuerpo: sub-nav + contenido ── */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

          {/* Sub-navegación de reportes */}
          <aside
            style={{
              width: 200,
              background: '#ffffff',
              borderRight: '0.5px solid #c5ddf5',
              flexShrink: 0,
              paddingTop: 20,
              paddingBottom: 20,
              overflowY: 'auto',
            }}
          >
            {/* Sección Facturación */}
            <div
              style={{
                padding: '0 16px 6px 20px',
                fontSize: 11,
                fontWeight: 600,
                color: '#1a6bbd',
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                marginBottom: 2,
              }}
            >
              Facturación
            </div>
            {FACTURACION.filter((item) => !(item.soloMultiSucursal && esPlanEstandar)).map((item) => (
              <ItemNav
                key={item.href}
                href={item.href}
                etiqueta={item.etiqueta}
                activo={pathname === item.href}
              />
            ))}

            {/* Separador */}
            <div style={{ margin: '16px 0 12px', borderTop: '0.5px solid #e0eef8' }} />

            {/* Sección Inventario */}
            <div
              style={{
                padding: '0 16px 6px 20px',
                fontSize: 11,
                fontWeight: 600,
                color: '#1a6bbd',
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                marginBottom: 2,
              }}
            >
              Inventario
            </div>
            {INVENTARIO.map((item) => (
              <ItemNav
                key={item.href}
                href={item.href}
                etiqueta={item.etiqueta}
                activo={pathname === item.href}
              />
            ))}
          </aside>

          {/* Contenido del reporte */}
          <main style={{ flex: 1, padding: 24, background: '#f7faff', minWidth: 0 }}>
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
