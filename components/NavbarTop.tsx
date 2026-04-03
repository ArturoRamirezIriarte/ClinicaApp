'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface UsuarioLocal {
  nombre: string
  apellido: string
  rol: string
  email: string
}

interface NavbarTopProps {
  titulo?: string
}

export default function NavbarTop({ titulo = 'ClinicaApp' }: NavbarTopProps) {
  const router = useRouter()
  const [usuario, setUsuario]       = useState<UsuarioLocal | null>(null)
  const [menuAbierto, setMenuAbierto] = useState(false)
  const refMenu = useRef<HTMLDivElement>(null)

  // Leer usuario de localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('clinica_usuario')
      if (raw) setUsuario(JSON.parse(raw) as UsuarioLocal)
    } catch {
      // localStorage no disponible o JSON inválido
    }
  }, [])

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    if (!menuAbierto) return
    function manejarClicFuera(e: MouseEvent) {
      if (refMenu.current && !refMenu.current.contains(e.target as Node)) {
        setMenuAbierto(false)
      }
    }
    document.addEventListener('mousedown', manejarClicFuera)
    return () => document.removeEventListener('mousedown', manejarClicFuera)
  }, [menuAbierto])

  // Cerrar sesión
  async function cerrarSesion() {
    setMenuAbierto(false)
    localStorage.removeItem('clinica_permisos')
    localStorage.removeItem('clinica_usuario')
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const nombreMostrado = usuario
    ? `${usuario.nombre} ${usuario.apellido}`.trim()
    : ''

  const inicial = usuario?.nombre?.[0]?.toUpperCase() ?? '?'

  return (
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
      <span style={{ color: '#a8c8e8', fontSize: 14 }}>{titulo}</span>

      {/* Área de usuario — clickeable, con dropdown */}
      <div ref={refMenu} style={{ position: 'relative' }}>
        <button
          onClick={() => setMenuAbierto((v) => !v)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px 6px',
            borderRadius: 8,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
          aria-label="Menú de usuario"
          aria-expanded={menuAbierto}
        >
          {nombreMostrado && (
            <span style={{ color: '#a8c8e8', fontSize: 13 }}>{nombreMostrado}</span>
          )}
          <div
            style={{
              width: 32,
              height: 32,
              background: '#1a6bbd',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {inicial}
          </div>
        </button>

        {/* Dropdown */}
        {menuAbierto && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              right: 0,
              minWidth: 180,
              background: '#ffffff',
              border: '0.5px solid #c5ddf5',
              borderRadius: 8,
              zIndex: 50,
              overflow: 'hidden',
            }}
          >
            {/* Info del usuario */}
            {usuario && (
              <div style={{
                padding: '10px 14px 8px',
                borderBottom: '0.5px solid #e0eef8',
              }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#0d3d6e' }}>
                  {nombreMostrado}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#5a8ab0' }}>
                  {usuario.email}
                </p>
              </div>
            )}

            {/* Cerrar sesión */}
            <button
              onClick={cerrarSesion}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '10px 14px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                color: '#e84040',
                fontWeight: 500,
                textAlign: 'left',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#fff0f0' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
            >
              <span style={{ fontSize: 14 }}>⎋</span>
              Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
