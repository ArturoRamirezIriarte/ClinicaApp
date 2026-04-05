'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface Empresa {
  id: string
  nombre: string
  plan: string
  estado: string
  fecha_vigencia: string | null
  precio_plan: number | null
  creado_en: string
  sucursales: { count: number }[]
  usuarios: { count: number }[]
}

interface KPIs {
  totalActivos: number
  enTrial: number
  porVencer: number
  ingresoEstimado: number
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', height: 40, padding: '0 12px', fontSize: 14,
  border: '0.5px solid #c5ddf5', borderRadius: 8, background: '#fff',
  color: '#0d3d6e', outline: 'none', boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 500, color: '#5a8ab0', marginBottom: 4,
}

function formatearFecha(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const dia  = String(d.getUTCDate()).padStart(2, '0')
  const mes  = String(d.getUTCMonth() + 1).padStart(2, '0')
  const anio = d.getUTCFullYear()
  return `${dia}/${mes}/${anio}`
}

function colorVencimiento(iso: string | null): React.CSSProperties {
  if (!iso) return {}
  const hoy    = new Date()
  const fecha  = new Date(iso)
  const diff   = (fecha.getTime() - hoy.getTime()) / 86_400_000
  if (diff < 0)  return { color: '#e84040', fontWeight: 600 }
  if (diff <= 7) return { color: '#e07b00', fontWeight: 600 }
  return {}
}

const PLAN_PRECIO: Record<string, number> = {
  estandar: 250,
  pro:      499,
}

const BADGE_ESTADO: Record<string, React.CSSProperties> = {
  activo:    { background: '#e8fff5', color: '#0a5535' },
  trial:     { background: '#e8f4ff', color: '#0d3d6e' },
  vencido:   { background: '#fff0f0', color: '#7a1a1a' },
  suspendido:{ background: '#f5e8ff', color: '#5a1a8a' },
}

// ── Componente principal ───────────────────────────────────────────────────────

export default function PaginaSaasAdmin() {
  const [autenticado,  setAutenticado]  = useState<boolean | null>(null)
  const [password,     setPassword]     = useState('')
  const [errorPass,    setErrorPass]    = useState(false)

  const [empresas,     setEmpresas]     = useState<Empresa[]>([])
  const [kpis,         setKpis]         = useState<KPIs | null>(null)
  const [cargando,     setCargando]     = useState(true)

  // Modal Renovar
  const [modalEmpresa, setModalEmpresa] = useState<Empresa | null>(null)
  const [modalPlan,    setModalPlan]    = useState('estandar')
  const [modalMeses,   setModalMeses]   = useState(1)
  const [renovando,    setRenovando]    = useState(false)
  const [toast,        setToast]        = useState<{ tipo: 'ok' | 'error'; msg: string } | null>(null)

  // ── Auth ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    const ok = typeof window !== 'undefined' && localStorage.getItem('saas_admin_auth') === 'true'
    setAutenticado(ok)
  }, [])

  function verificarPassword() {
    const clave = process.env.NEXT_PUBLIC_SAAS_ADMIN_PASSWORD ?? ''
    if (password === clave && clave !== '') {
      localStorage.setItem('saas_admin_auth', 'true')
      setAutenticado(true)
      setErrorPass(false)
    } else {
      setErrorPass(true)
    }
  }

  function cerrarSesion() {
    localStorage.removeItem('saas_admin_auth')
    setAutenticado(false)
    setPassword('')
  }

  // ── Carga de datos ───────────────────────────────────────────────────────

  const cargarEmpresas = useCallback(async () => {
    setCargando(true)
    const { data, error } = await supabase
      .from('empresas')
      .select('id, nombre, plan, estado, fecha_vigencia, precio_plan, creado_en, sucursales(count), usuarios(count)')
      .order('creado_en', { ascending: false })

    if (error) {
      console.error('Error al cargar empresas:', error)
      setCargando(false)
      return
    }

    const lista = (data ?? []) as Empresa[]
    setEmpresas(lista)

    const hoy7 = new Date()
    hoy7.setDate(hoy7.getDate() + 7)
    const hoy  = new Date()

    const totalActivos   = lista.filter((e) => e.estado === 'activo').length
    const enTrial        = lista.filter((e) => e.estado === 'trial').length
    const porVencer      = lista.filter((e) => {
      if (!e.fecha_vigencia || e.estado !== 'activo') return false
      const f = new Date(e.fecha_vigencia)
      return f >= hoy && f <= hoy7
    }).length
    const ingresoEstimado = lista
      .filter((e) => e.estado === 'activo')
      .reduce((sum, e) => sum + (e.precio_plan ?? PLAN_PRECIO[e.plan] ?? 0), 0)

    setKpis({ totalActivos, enTrial, porVencer, ingresoEstimado })
    setCargando(false)
  }, [])

  useEffect(() => {
    if (autenticado) cargarEmpresas()
  }, [autenticado, cargarEmpresas])

  // ── Renovar suscripción ──────────────────────────────────────────────────

  async function confirmarRenovacion() {
    if (!modalEmpresa) return
    setRenovando(true)
    setToast(null)

    const { error } = await supabase.rpc('clinica_renovar_suscripcion', {
      p_empresa_id: modalEmpresa.id,
      p_plan:       modalPlan,
      p_meses:      modalMeses,
    })

    if (error) {
      console.error('Error al renovar:', error)
      setToast({ tipo: 'error', msg: 'Ocurrió un error al renovar. Por favor intente de nuevo.' })
    } else {
      setToast({ tipo: 'ok', msg: `Suscripción de ${modalEmpresa.nombre} renovada correctamente.` })
      setModalEmpresa(null)
      cargarEmpresas()
    }
    setRenovando(false)
  }

  // ── Render: formulario de contraseña ──────────────────────────────────────

  if (autenticado === null) return null

  if (!autenticado) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#f7faff',
      }}>
        <div style={{
          background: '#fff', border: '0.5px solid #c5ddf5', borderRadius: 16,
          padding: '40px 48px', width: '100%', maxWidth: 380,
        }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ fontSize: 22, fontWeight: 600, color: '#0d3d6e' }}>ClinicaApp</div>
            <div style={{ fontSize: 13, color: '#5a8ab0', marginTop: 4 }}>Panel Administrativo SaaS</div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Contraseña de acceso <span style={{ color: '#e84040' }}>*</span></label>
            <input
              type="password"
              style={{ ...inputStyle, ...(errorPass ? { borderColor: '#e84040' } : {}) }}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setErrorPass(false) }}
              onKeyDown={(e) => e.key === 'Enter' && verificarPassword()}
              placeholder="••••••••"
              autoFocus
            />
            {errorPass && (
              <div style={{ fontSize: 12, color: '#e84040', marginTop: 4 }}>
                Contraseña incorrecta
              </div>
            )}
          </div>
          <button
            onClick={verificarPassword}
            style={{
              width: '100%', height: 40, background: '#1a6bbd', color: '#fff',
              border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer',
            }}
          >
            Ingresar
          </button>
        </div>
      </div>
    )
  }

  // ── Render: panel principal ───────────────────────────────────────────────

  const porVencerCount = kpis?.porVencer ?? 0

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 48px' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 0 24px', borderBottom: '0.5px solid #c5ddf5', marginBottom: 24,
      }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: '#0d3d6e', margin: 0 }}>
          ClinicaApp — Panel Administrativo
        </h1>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Link
            href="/saas-admin/nuevo-tenant"
            style={{
              height: 36, padding: '0 16px', display: 'inline-flex', alignItems: 'center',
              background: '#1a6bbd', color: '#fff', borderRadius: 8, fontSize: 13,
              fontWeight: 500, textDecoration: 'none',
            }}
          >
            + Nuevo Tenant
          </Link>
          <button
            onClick={cerrarSesion}
            style={{
              height: 36, padding: '0 14px', background: '#fff', color: '#5a8ab0',
              border: '0.5px solid #c5ddf5', borderRadius: 8, fontSize: 13,
              fontWeight: 500, cursor: 'pointer',
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          background: toast.tipo === 'ok' ? '#e8fff5' : '#fff0f0',
          border: `0.5px solid ${toast.tipo === 'ok' ? '#2ecc8a' : '#e84040'}`,
          borderRadius: 8, padding: '10px 16px',
          color: toast.tipo === 'ok' ? '#0a5535' : '#e84040',
          fontSize: 13, marginBottom: 20,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          {toast.tipo === 'ok' ? '✓ ' : ''}{toast.msg}
          <button
            onClick={() => setToast(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, lineHeight: 1, color: 'inherit' }}
          >×</button>
        </div>
      )}

      {/* Alert por vencer */}
      {porVencerCount > 0 && (
        <div style={{
          background: '#fff8e8', border: '0.5px solid #f0c040', borderRadius: 8,
          padding: '12px 16px', color: '#7a5500', fontSize: 13, marginBottom: 24,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          ⚠️ {porVencerCount} cliente(s) vencen en los próximos 7 días
        </div>
      )}

      {/* KPI Cards */}
      {kpis && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28,
        }}>
          {[
            { label: 'Tenants activos',        valor: kpis.totalActivos,    prefix: '',   suffix: '' },
            { label: 'En trial',                valor: kpis.enTrial,         prefix: '',   suffix: '' },
            { label: 'Por vencer (7 días)',      valor: kpis.porVencer,       prefix: '',   suffix: '' },
            { label: 'Ingreso estimado mes',    valor: kpis.ingresoEstimado, prefix: 'Q ', suffix: '' },
          ].map((kpi) => (
            <div key={kpi.label} style={{
              background: '#f0f7ff', border: '0.5px solid #c5ddf5', borderRadius: 8, padding: 16,
            }}>
              <div style={{ fontSize: 12, color: '#5a8ab0', marginBottom: 4 }}>{kpi.label}</div>
              <div style={{ fontSize: 28, fontWeight: 600, color: '#0d3d6e' }}>
                {kpi.prefix}
                {kpi.label === 'Ingreso estimado mes'
                  ? kpi.valor.toLocaleString('es-GT', { minimumFractionDigits: 2 })
                  : kpi.valor}
                {kpi.suffix}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabla de tenants */}
      <div style={{
        background: '#fff', border: '0.5px solid #c5ddf5', borderRadius: 12, overflow: 'hidden',
      }}>
        {cargando ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#5a8ab0', fontSize: 14 }}>
            Cargando...
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f0f7ff' }}>
                {['Empresa', 'Plan', 'Vencimiento', 'Sucursales', 'Usuarios', 'Estado', 'Acciones'].map((h) => (
                  <th key={h} style={{
                    padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600,
                    color: '#0d3d6e', borderBottom: '0.5px solid #e0eef8',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {empresas.map((emp, idx) => {
                const sucCount = emp.sucursales?.[0]?.count ?? 0
                const usrCount = emp.usuarios?.[0]?.count ?? 0
                const estadoBadge = BADGE_ESTADO[emp.estado] ?? BADGE_ESTADO.activo
                return (
                  <tr
                    key={emp.id}
                    style={{ background: idx % 2 === 0 ? '#fff' : '#f7faff' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#e8f4ff' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#f7faff' }}
                  >
                    <td style={{ padding: '12px 16px', borderBottom: '0.5px solid #e0eef8' }}>
                      <div style={{ fontWeight: 500, color: '#0d3d6e', fontSize: 14 }}>{emp.nombre}</div>
                      <div style={{ fontSize: 11, color: '#5a8ab0', marginTop: 2, fontFamily: 'monospace' }}>
                        {emp.id.slice(0, 8)}…
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: '0.5px solid #e0eef8', fontSize: 13, color: '#0d3d6e', textTransform: 'capitalize' }}>
                      {emp.plan}
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: '0.5px solid #e0eef8', fontSize: 13, ...colorVencimiento(emp.fecha_vigencia) }}>
                      {formatearFecha(emp.fecha_vigencia)}
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: '0.5px solid #e0eef8', fontSize: 13, color: '#5a8ab0', textAlign: 'center' }}>
                      {sucCount}
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: '0.5px solid #e0eef8', fontSize: 13, color: '#5a8ab0', textAlign: 'center' }}>
                      {usrCount}
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: '0.5px solid #e0eef8' }}>
                      <span style={{
                        fontSize: 12, fontWeight: 600, borderRadius: 20, padding: '3px 10px',
                        ...estadoBadge,
                      }}>
                        {emp.estado.charAt(0).toUpperCase() + emp.estado.slice(1)}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: '0.5px solid #e0eef8' }}>
                      <button
                        onClick={() => { setModalEmpresa(emp); setModalPlan('estandar'); setModalMeses(1) }}
                        style={{
                          height: 30, padding: '0 12px', fontSize: 12, borderRadius: 6,
                          border: '1px solid #1a6bbd', background: '#fff', color: '#1a6bbd',
                          cursor: 'pointer', fontWeight: 500,
                        }}
                      >
                        Renovar
                      </button>
                    </td>
                  </tr>
                )
              })}
              {empresas.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: '#5a8ab0', padding: '40px 0', fontSize: 14 }}>
                    No se encontraron tenants.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Renovar */}
      {modalEmpresa && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(13,61,110,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
        }}>
          <div style={{
            background: '#fff', borderRadius: 16, border: '0.5px solid #c5ddf5',
            padding: '32px 36px', width: '100%', maxWidth: 440,
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#0d3d6e', margin: '0 0 4px' }}>
              Renovar suscripción
            </h2>
            <p style={{ fontSize: 13, color: '#5a8ab0', margin: '0 0 24px' }}>
              {modalEmpresa.nombre}
            </p>

            <div style={{ display: 'grid', gap: 16, marginBottom: 24 }}>
              <div>
                <label style={labelStyle}>Plan</label>
                <select
                  style={{ ...inputStyle, cursor: 'pointer' }}
                  value={modalPlan}
                  onChange={(e) => setModalPlan(e.target.value)}
                >
                  <option value="estandar">Estándar — Q250/mes</option>
                  <option value="pro">Pro — Q499/mes</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Meses</label>
                <select
                  style={{ ...inputStyle, cursor: 'pointer' }}
                  value={modalMeses}
                  onChange={(e) => setModalMeses(Number(e.target.value))}
                >
                  <option value={1}>1 mes</option>
                  <option value={3}>3 meses</option>
                  <option value={6}>6 meses</option>
                  <option value={12}>12 meses</option>
                </select>
              </div>
            </div>

            <div style={{
              background: '#f0f7ff', border: '0.5px solid #c5ddf5', borderRadius: 8,
              padding: '10px 14px', fontSize: 13, color: '#0d3d6e', marginBottom: 24,
            }}>
              Total estimado: <strong>Q {((PLAN_PRECIO[modalPlan] ?? 0) * modalMeses).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</strong>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setModalEmpresa(null)}
                disabled={renovando}
                style={{
                  height: 40, padding: '0 18px', background: '#fff', color: '#1a6bbd',
                  border: '1px solid #1a6bbd', borderRadius: 8, fontSize: 14, fontWeight: 500,
                  cursor: 'pointer', opacity: renovando ? 0.6 : 1,
                }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmarRenovacion}
                disabled={renovando}
                style={{
                  height: 40, padding: '0 18px', background: '#1a6bbd', color: '#fff',
                  border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500,
                  cursor: 'pointer', opacity: renovando ? 0.6 : 1,
                }}
              >
                {renovando ? 'Procesando...' : 'Confirmar renovación'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
