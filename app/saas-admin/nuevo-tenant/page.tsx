'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

// ── Constantes ────────────────────────────────────────────────────────────────

const PLANES = [
  { value: 'estandar', label: 'Estándar — Q250/mes', max_sucursales: 1, max_usuarios: 5  },
  { value: 'pro',      label: 'Pro — Q499/mes',       max_sucursales: 5, max_usuarios: 20 },
]

const MODULOS = [
  'dashboard', 'pacientes', 'agenda', 'expediente',
  'cobros', 'contabilidad', 'inventario', 'medicos', 'reportes', 'configuracion',
]

// Matriz de permisos por rol (accion='ver')
const PERMISOS_INICIAL: Record<string, string[]> = {
  admin:         MODULOS,
  dentista:      ['dashboard', 'pacientes', 'agenda', 'expediente', 'reportes'],
  recepcionista: ['dashboard', 'pacientes', 'agenda', 'cobros', 'inventario'],
  asistente:     ['dashboard', 'pacientes', 'agenda', 'expediente'],
}

const PRECIO_PLAN: Record<string, number> = {
  estandar: 250,
  pro:      499,
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', height: 40, padding: '0 12px', fontSize: 14,
  border: '0.5px solid #c5ddf5', borderRadius: 8, background: '#fff',
  color: '#0d3d6e', outline: 'none', boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 500, color: '#5a8ab0', marginBottom: 4,
}

function Campo({
  label, requerido, error, children,
}: {
  label: string; requerido?: boolean; error?: string; children: React.ReactNode
}) {
  return (
    <div>
      <label style={labelStyle}>
        {label}{requerido && <span style={{ color: '#e84040' }}> *</span>}
      </label>
      {children}
      {error && <div style={{ fontSize: 12, color: '#e84040', marginTop: 4 }}>{error}</div>}
    </div>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function PaginaNuevoTenant() {
  const router = useRouter()

  // Auth guard
  const [autenticado, setAutenticado] = useState<boolean | null>(null)
  useEffect(() => {
    const ok = typeof window !== 'undefined' && localStorage.getItem('saas_admin_auth') === 'true'
    setAutenticado(ok)
    if (!ok) router.replace('/saas-admin')
  }, [router])

  // Formulario
  const [form, setForm] = useState({
    nombre:   '',
    nit:      '',
    email:    '',
    telefono: '',
    direccion:'',
    plan:     'estandar',
    meses:    1,
  })
  const [errores,    setErrores]    = useState<Record<string, string>>({})
  const [guardando,  setGuardando]  = useState(false)
  const [resultado,  setResultado]  = useState<{ id: string; nombre: string } | null>(null)
  const [errorGlobal,setErrorGlobal]= useState<string | null>(null)

  function actualizar(campo: string, valor: string | number) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
    setErrores((prev) => { const n = { ...prev }; delete n[campo]; return n })
  }

  function validar(): boolean {
    const e: Record<string, string> = {}
    if (!form.nombre.trim()) e.nombre = 'El nombre comercial es requerido.'
    if (!form.email.trim())  e.email  = 'El correo electrónico es requerido.'
    setErrores(e)
    return Object.keys(e).length === 0
  }

  async function crearTenant() {
    if (!validar()) return
    setGuardando(true)
    setErrorGlobal(null)

    try {
      const planCfg = PLANES.find((p) => p.value === form.plan)!

      // 1. Insertar empresa
      const { data: empData, error: empErr } = await supabase
        .from('empresas')
        .insert({
          nombre:         form.nombre.trim(),
          nit:            form.nit.trim() || null,
          email:          form.email.trim(),
          telefono:       form.telefono.trim() || null,
          direccion:      form.direccion.trim() || null,
          plan:           'trial',
          estado:         'trial',
          max_sucursales: planCfg.max_sucursales,
          max_usuarios:   planCfg.max_usuarios,
          precio_plan:    PRECIO_PLAN[form.plan],
          fecha_vigencia: new Date(Date.now() + form.meses * 30 * 86_400_000).toISOString(),
        })
        .select('id, nombre')
        .single()

      if (empErr) throw empErr
      const empresa = empData as { id: string; nombre: string }

      // 2. Insertar sucursal principal
      const { error: sucErr } = await supabase
        .from('sucursales')
        .insert({
          empresa_id:   empresa.id,
          nombre:       'Sucursal Principal',
          es_principal: true,
          activa:       true,
        })

      if (sucErr) throw sucErr

      // 3. Insertar rol_permisos para los 4 roles
      const filas: {
        empresa_id: string; rol: string; modulo: string; accion: string; permitido: boolean
      }[] = []
      for (const rol of Object.keys(PERMISOS_INICIAL)) {
        const modulosPermitidos = PERMISOS_INICIAL[rol]
        for (const mod of MODULOS) {
          filas.push({
            empresa_id: empresa.id,
            rol,
            modulo:    mod,
            accion:    'ver',
            permitido: modulosPermitidos.includes(mod),
          })
        }
      }

      const { error: permErr } = await supabase.from('rol_permisos').insert(filas)
      if (permErr) throw permErr

      // Éxito
      setResultado({ id: empresa.id, nombre: empresa.nombre })
      setTimeout(() => router.push('/saas-admin'), 3000)

    } catch (e: unknown) {
      console.error('Error al crear tenant:', e)
      setErrorGlobal('Ocurrió un error al crear el tenant. Por favor intente de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (autenticado === null || autenticado === false) return null

  if (resultado) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#f7faff',
      }}>
        <div style={{
          background: '#fff', border: '0.5px solid #c5ddf5', borderRadius: 16,
          padding: '40px 48px', width: '100%', maxWidth: 440, textAlign: 'center',
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#0d3d6e', margin: '0 0 8px' }}>
            Tenant creado correctamente
          </h2>
          <p style={{ fontSize: 14, color: '#5a8ab0', margin: '0 0 20px' }}>
            {resultado.nombre}
          </p>
          <div style={{
            background: '#f0f7ff', border: '0.5px solid #c5ddf5', borderRadius: 8,
            padding: '10px 14px', fontSize: 12, color: '#0d3d6e',
            fontFamily: 'monospace', wordBreak: 'break-all', marginBottom: 20,
          }}>
            empresa_id: {resultado.id}
          </div>
          <p style={{ fontSize: 12, color: '#5a8ab0', margin: 0 }}>
            Redirigiendo al panel en 3 segundos…
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px 48px' }}>

      {/* Breadcrumb */}
      <nav style={{ fontSize: 13, color: '#5a8ab0', marginBottom: 16 }}>
        <Link href="/saas-admin" style={{ color: '#1a6bbd', textDecoration: 'none' }}>
          Panel Administrativo
        </Link>
        <span style={{ margin: '0 6px' }}>›</span>
        <span style={{ color: '#0d3d6e', fontWeight: 500 }}>Nuevo Tenant</span>
      </nav>

      {/* Título */}
      <h1 style={{ fontSize: 24, fontWeight: 600, color: '#0d3d6e', margin: '0 0 24px' }}>
        Nuevo Tenant
      </h1>

      {/* Error global */}
      {errorGlobal && (
        <div style={{
          background: '#fff0f0', border: '0.5px solid #e84040', borderRadius: 8,
          padding: '10px 14px', color: '#e84040', fontSize: 13, marginBottom: 20,
        }}>
          {errorGlobal}
        </div>
      )}

      {/* Card formulario */}
      <div style={{
        background: '#fff', border: '0.5px solid #c5ddf5', borderRadius: 12, padding: '24px 28px',
      }}>

        {/* Sección: Datos de la empresa */}
        <div style={{ fontSize: 15, fontWeight: 600, color: '#0d3d6e', marginBottom: 16 }}>
          Datos de la empresa
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <Campo label="Nombre comercial" requerido error={errores.nombre}>
            <input
              style={{ ...inputStyle, ...(errores.nombre ? { borderColor: '#e84040' } : {}) }}
              value={form.nombre}
              onChange={(e) => actualizar('nombre', e.target.value)}
              placeholder="Clínica Dental XYZ"
            />
          </Campo>
          <Campo label="NIT">
            <input
              style={inputStyle}
              value={form.nit}
              onChange={(e) => actualizar('nit', e.target.value)}
              placeholder="1234567-8"
            />
          </Campo>
          <Campo label="Correo electrónico de contacto" requerido error={errores.email}>
            <input
              type="email"
              style={{ ...inputStyle, ...(errores.email ? { borderColor: '#e84040' } : {}) }}
              value={form.email}
              onChange={(e) => actualizar('email', e.target.value)}
              placeholder="admin@clinica.com"
            />
          </Campo>
          <Campo label="Teléfono">
            <input
              style={inputStyle}
              value={form.telefono}
              onChange={(e) => actualizar('telefono', e.target.value)}
              placeholder="2345-6789"
            />
          </Campo>
        </div>
        <Campo label="Dirección">
          <input
            style={inputStyle}
            value={form.direccion}
            onChange={(e) => actualizar('direccion', e.target.value)}
            placeholder="Ciudad de Guatemala, zona 10"
          />
        </Campo>

        {/* Divisor */}
        <div style={{ borderTop: '0.5px solid #e0eef8', margin: '24px 0' }} />

        {/* Sección: Plan y trial */}
        <div style={{ fontSize: 15, fontWeight: 600, color: '#0d3d6e', marginBottom: 16 }}>
          Plan y período de prueba
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Campo label="Plan base">
            <select
              style={{ ...inputStyle, cursor: 'pointer' }}
              value={form.plan}
              onChange={(e) => actualizar('plan', e.target.value)}
            >
              {PLANES.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </Campo>
          <Campo label="Meses de prueba (trial)">
            <select
              style={{ ...inputStyle, cursor: 'pointer' }}
              value={form.meses}
              onChange={(e) => actualizar('meses', Number(e.target.value))}
            >
              <option value={1}>1 mes</option>
              <option value={2}>2 meses</option>
              <option value={3}>3 meses</option>
            </select>
          </Campo>
        </div>

        {/* Resumen de lo que se creará */}
        {(() => {
          const planCfg = PLANES.find((p) => p.value === form.plan)!
          return (
            <div style={{
              background: '#f0f7ff', border: '0.5px solid #c5ddf5', borderRadius: 8,
              padding: '12px 16px', fontSize: 13, color: '#0d3d6e', marginTop: 16,
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
            }}>
              <div>Máx. sucursales: <strong>{planCfg.max_sucursales}</strong></div>
              <div>Máx. usuarios: <strong>{planCfg.max_usuarios}</strong></div>
              <div>Estado inicial: <strong>Trial</strong></div>
              <div>Precio referencial: <strong>Q {PRECIO_PLAN[form.plan].toLocaleString('es-GT', { minimumFractionDigits: 2 })}/mes</strong></div>
            </div>
          )
        })()}

        {/* Acciones */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
          <Link
            href="/saas-admin"
            style={{
              height: 40, padding: '0 18px', display: 'inline-flex', alignItems: 'center',
              background: '#fff', color: '#1a6bbd', border: '1px solid #1a6bbd',
              borderRadius: 8, fontSize: 14, fontWeight: 500, textDecoration: 'none',
            }}
          >
            Cancelar
          </Link>
          <button
            onClick={crearTenant}
            disabled={guardando}
            style={{
              height: 40, padding: '0 22px', background: '#1a6bbd', color: '#fff',
              border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500,
              cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.6 : 1,
            }}
          >
            {guardando ? 'Creando tenant...' : 'Crear tenant'}
          </button>
        </div>
      </div>
    </div>
  )
}
