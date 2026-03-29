'use client'

import { useState, useEffect, use, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { EMPRESA_ID } from '@/lib/config'

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Sucursal {
  id: string
  nombre: string
}

interface Medico {
  id: string
  nombre: string
  apellido: string | null
  email: string
  rol: string
  activo: boolean
  sucursal_id: string | null
  creado_en: string
  numero_colegiado: string | null
  foto_url: string | null
}

interface Errores {
  nombre?: string
  apellido?: string
  email?: string
}

// ── Helpers de estilo ─────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 500, color: '#5a8ab0', marginBottom: 4,
}

const valorStyle: React.CSSProperties = {
  fontSize: 14, color: '#0d3d6e', fontWeight: 400,
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
      {error && <p style={{ fontSize: 12, color: '#e84040', marginTop: 4 }}>{error}</p>}
    </div>
  )
}

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-GT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function obtenerIniciales(nombre: string, apellido: string | null): string {
  const n = nombre.trim()[0] ?? ''
  const a = (apellido ?? '').trim()[0] ?? ''
  return (n + a).toUpperCase() || '?'
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function PaginaPerfilMedico({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const [medico, setMedico]           = useState<Medico | null>(null)
  const [sucursales, setSucursales]   = useState<Sucursal[]>([])
  const [cargando, setCargando]       = useState(true)
  const [editando, setEditando]       = useState(false)
  const [guardando, setGuardando]     = useState(false)
  const [cambiandoEstado, setCambiandoEstado] = useState(false)
  const [exito, setExito]             = useState<string | null>(null)
  const [error, setError]             = useState<string | null>(null)
  const [errores, setErrores]         = useState<Errores>({})

  // Copia editable separada para no mutar el original hasta guardar
  const [borrador, setBorrador] = useState<Medico | null>(null)

  // Foto en modo edición
  const [fotoPreview, setFotoPreview]   = useState<string | null>(null)
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const [errorFoto, setErrorFoto]       = useState<string | null>(null)
  const inputFotoRef = useRef<HTMLInputElement>(null)

  // Cargar médico y sucursales
  useEffect(() => {
    async function cargar() {
      setCargando(true)
      const [{ data: medicoData }, { data: sucData }] = await Promise.all([
        supabase
          .from('usuarios')
          .select('id, nombre, apellido, email, rol, activo, sucursal_id, creado_en, numero_colegiado, foto_url')
          .eq('id', id)
          .eq('empresa_id', EMPRESA_ID)
          .single(),
        supabase
          .from('sucursales')
          .select('id, nombre')
          .eq('empresa_id', EMPRESA_ID)
          .eq('activa', true)
          .order('es_principal', { ascending: false })
          .order('nombre', { ascending: true }),
      ])
      setMedico(medicoData as Medico)
      setSucursales((sucData as Sucursal[]) ?? [])
      setCargando(false)
    }
    cargar()
  }, [id])

  // Auto-ocultar toast
  useEffect(() => {
    if (!exito) return
    const t = setTimeout(() => setExito(null), 5000)
    return () => clearTimeout(t)
  }, [exito])

  // ── Subir foto ──────────────────────────────────────────────────────────────

  async function subirFoto(archivo: File) {
    setErrorFoto(null)
    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp']
    if (!tiposPermitidos.includes(archivo.type)) {
      setErrorFoto('Solo se permiten imágenes JPG, PNG o WebP.')
      return
    }
    if (archivo.size > 2 * 1024 * 1024) {
      setErrorFoto('La imagen no debe superar 2 MB.')
      return
    }

    // Preview inmediato
    const reader = new FileReader()
    reader.onload = (e) => setFotoPreview(e.target?.result as string)
    reader.readAsDataURL(archivo)

    setSubiendoFoto(true)
    try {
      const ext = archivo.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const path = `${EMPRESA_ID}/${id}.${ext}`

      const { error: errUp } = await supabase.storage
        .from('fotos-medicos')
        .upload(path, archivo, { upsert: true, contentType: archivo.type })
      if (errUp) throw errUp

      const { data: urlData } = supabase.storage
        .from('fotos-medicos')
        .getPublicUrl(path)

      const nuevaFotoUrl = `${urlData.publicUrl}?t=${Date.now()}`
      setBorrador((b) => b ? { ...b, foto_url: nuevaFotoUrl } : b)
    } catch (e) {
      console.error('Error al subir foto:', e)
      setErrorFoto('Error al subir la foto. Por favor intente de nuevo.')
      setFotoPreview(null)
    } finally {
      setSubiendoFoto(false)
    }
  }

  // ── Validación ──────────────────────────────────────────────────────────────

  function validar(): boolean {
    if (!borrador) return false
    const e: Errores = {}
    if (!borrador.nombre.trim())   e.nombre   = 'Este campo es requerido'
    if (!borrador.email.trim())    e.email    = 'Este campo es requerido'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(borrador.email.trim()))
      e.email = 'Formato de correo electrónico inválido'
    setErrores(e)
    return Object.keys(e).length === 0
  }

  // ── Guardar edición ─────────────────────────────────────────────────────────

  async function guardar() {
    if (!borrador) return
    setError(null)
    if (!validar()) return

    setGuardando(true)
    try {
      const { error: err } = await supabase
        .from('usuarios')
        .update({
          nombre:           borrador.nombre.trim(),
          apellido:         borrador.apellido?.trim() || null,
          email:            borrador.email.trim(),
          sucursal_id:      borrador.sucursal_id || null,
          numero_colegiado: borrador.numero_colegiado?.trim() || null,
          foto_url:         borrador.foto_url || null,
        })
        .eq('id', id)
        .eq('empresa_id', EMPRESA_ID)
      if (err) throw err

      setMedico({ ...medico!, ...borrador })
      setEditando(false)
      setFotoPreview(null)
      setExito('Datos del médico actualizados correctamente.')
    } catch (e: unknown) {
      console.error(e)
      setError('Ocurrió un error al guardar. Por favor intente de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  // ── Activar / Desactivar ────────────────────────────────────────────────────

  async function toggleEstado() {
    if (!medico) return
    setError(null)
    setCambiandoEstado(true)
    try {
      const nuevoEstado = !medico.activo
      const { error: err } = await supabase
        .from('usuarios')
        .update({ activo: nuevoEstado })
        .eq('id', id)
        .eq('empresa_id', EMPRESA_ID)
      if (err) throw err
      setMedico({ ...medico, activo: nuevoEstado })
      setExito(nuevoEstado ? 'Médico activado correctamente.' : 'Médico desactivado correctamente.')
    } catch (e: unknown) {
      console.error(e)
      setError('Ocurrió un error al cambiar el estado. Por favor intente de nuevo.')
    } finally {
      setCambiandoEstado(false)
    }
  }

  // ── Cancelar edición ────────────────────────────────────────────────────────

  function cancelarEdicion() {
    setEditando(false)
    setErrores({})
    setError(null)
    setFotoPreview(null)
    setErrorFoto(null)
  }

  function iniciarEdicion() {
    if (!medico) return
    setBorrador({ ...medico })
    setFotoPreview(null)
    setEditando(true)
    setExito(null)
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (cargando) {
    return (
      <div style={{ padding: '48px 0', textAlign: 'center', color: '#5a8ab0', fontSize: 14 }}>
        Cargando...
      </div>
    )
  }

  if (!medico) {
    return (
      <div style={{ padding: '48px 0', textAlign: 'center', color: '#e84040', fontSize: 14 }}>
        No se encontró el médico solicitado.
      </div>
    )
  }

  const nombreCompleto = `${medico.nombre}${medico.apellido ? ` ${medico.apellido}` : ''}`
  const sucursalAsignada = sucursales.find((s) => s.id === medico.sucursal_id)?.nombre

  // Avatar a mostrar en el encabezado (modo lectura)
  const avatarSrc = medico.foto_url

  return (
    <div>
      {/* Breadcrumb */}
      <nav style={{ fontSize: 13, color: '#5a8ab0', marginBottom: 16 }}>
        <Link href="/medicos" style={{ color: '#1a6bbd', textDecoration: 'none' }}>
          Médicos
        </Link>
        <span style={{ margin: '0 6px' }}>›</span>
        <span style={{ color: '#0d3d6e', fontWeight: 500 }}>{nombreCompleto}</span>
      </nav>

      {/* Encabezado */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        marginBottom: 24, flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Avatar 80px */}
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt={nombreCompleto}
              style={{
                width: 80, height: 80, borderRadius: '50%', objectFit: 'cover',
                border: '0.5px solid #c5ddf5', flexShrink: 0,
              }}
            />
          ) : (
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: '#e8f4ff', border: '0.5px solid #c5ddf5',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, fontWeight: 600, color: '#1a6bbd', flexShrink: 0,
            }}>
              {obtenerIniciales(medico.nombre, medico.apellido)}
            </div>
          )}

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: 24, fontWeight: 600, color: '#0d3d6e', margin: 0 }}>
                {nombreCompleto}
              </h1>
              {medico.activo ? (
                <span className="ct-badge ct-badge-activo">Activo</span>
              ) : (
                <span style={{
                  display: 'inline-block', padding: '2px 10px', borderRadius: 20,
                  fontSize: 12, fontWeight: 500, background: '#f0f0f5', color: '#6b7280',
                }}>
                  Inactivo
                </span>
              )}
            </div>
            {medico.numero_colegiado && (
              <p style={{ fontSize: 13, color: '#5a8ab0', margin: '3px 0 0' }}>
                Colegiado No. {medico.numero_colegiado}
              </p>
            )}
            <p style={{ fontSize: 13, color: '#5a8ab0', margin: '2px 0 0' }}>
              Registrado el {formatearFecha(medico.creado_en)}
            </p>
          </div>
        </div>

        {!editando && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="ct-btn ct-btn-secondary"
              onClick={toggleEstado}
              disabled={cambiandoEstado}
              style={{ opacity: cambiandoEstado ? 0.6 : 1 }}
            >
              {cambiandoEstado
                ? 'Procesando...'
                : medico.activo ? 'Desactivar' : 'Activar'}
            </button>
            <button className="ct-btn ct-btn-primary" onClick={iniciarEdicion}>
              Editar
            </button>
          </div>
        )}
      </div>

      {/* Toast éxito */}
      {exito && (
        <div style={{
          background: '#e8fff5', border: '0.5px solid #2ecc8a', borderRadius: 8,
          padding: '10px 14px', color: '#0a5535', fontSize: 13, marginBottom: 20,
        }}>
          ✓ {exito}
        </div>
      )}

      {/* Error general */}
      {error && (
        <div style={{
          background: '#fff0f0', border: '0.5px solid #e84040', borderRadius: 8,
          padding: '10px 14px', color: '#e84040', fontSize: 13, marginBottom: 20,
        }}>
          {error}
        </div>
      )}

      {/* Tarjeta principal */}
      <div className="ct-card" style={{ maxWidth: 700 }}>

        {/* ── Modo lectura ──────────────────────────────────────────────────── */}
        {!editando && (
          <>
            <p style={{ fontSize: 16, fontWeight: 600, color: '#0d3d6e', margin: '0 0 20px' }}>
              Datos del médico
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              <div>
                <p style={labelStyle}>Nombre</p>
                <p style={valorStyle}>{medico.nombre}</p>
              </div>
              <div>
                <p style={labelStyle}>Apellido</p>
                <p style={valorStyle}>{medico.apellido ?? <span style={{ color: '#5a8ab0' }}>—</span>}</p>
              </div>
              <div>
                <p style={labelStyle}>Correo electrónico</p>
                <p style={valorStyle}>{medico.email}</p>
              </div>
              <div>
                <p style={labelStyle}>Número de Colegiado</p>
                <p style={valorStyle}>
                  {medico.numero_colegiado ?? <span style={{ color: '#5a8ab0' }}>—</span>}
                </p>
              </div>
              <div>
                <p style={labelStyle}>Rol</p>
                <p style={valorStyle}>Médico / Dentista</p>
              </div>
              <div>
                <p style={labelStyle}>Sucursal asignada</p>
                <p style={valorStyle}>
                  {sucursalAsignada ?? <span style={{ color: '#5a8ab0' }}>Sin asignar</span>}
                </p>
              </div>
              <div>
                <p style={labelStyle}>Estado</p>
                {medico.activo ? (
                  <span className="ct-badge ct-badge-activo">Activo</span>
                ) : (
                  <span style={{
                    display: 'inline-block', padding: '2px 10px', borderRadius: 20,
                    fontSize: 12, fontWeight: 500, background: '#f0f0f5', color: '#6b7280',
                  }}>
                    Inactivo
                  </span>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── Modo edición ──────────────────────────────────────────────────── */}
        {editando && borrador && (
          <>
            <p style={{ fontSize: 16, fontWeight: 600, color: '#0d3d6e', margin: '0 0 20px' }}>
              Editar datos del médico
            </p>

            {/* Avatar + subir foto */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 20 }}>
              <div style={{ flexShrink: 0 }}>
                {fotoPreview ? (
                  <img
                    src={fotoPreview}
                    alt="Foto del médico"
                    style={{
                      width: 80, height: 80, borderRadius: '50%', objectFit: 'cover',
                      border: '0.5px solid #c5ddf5',
                    }}
                  />
                ) : borrador.foto_url ? (
                  <img
                    src={borrador.foto_url}
                    alt="Foto del médico"
                    style={{
                      width: 80, height: 80, borderRadius: '50%', objectFit: 'cover',
                      border: '0.5px solid #c5ddf5',
                    }}
                  />
                ) : (
                  <div style={{
                    width: 80, height: 80, borderRadius: '50%',
                    background: '#e8f4ff', border: '0.5px solid #c5ddf5',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 24, fontWeight: 600, color: '#1a6bbd',
                  }}>
                    {obtenerIniciales(borrador.nombre, borrador.apellido)}
                  </div>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Foto del Médico</label>
                <input
                  ref={inputFotoRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const archivo = e.target.files?.[0]
                    if (archivo) subirFoto(archivo)
                    e.target.value = ''
                  }}
                />
                <button
                  type="button"
                  className="ct-btn ct-btn-secondary ct-btn-sm"
                  onClick={() => inputFotoRef.current?.click()}
                  disabled={subiendoFoto}
                  style={{ opacity: subiendoFoto ? 0.6 : 1 }}
                >
                  {subiendoFoto ? 'Subiendo...' : borrador.foto_url ? 'Cambiar Foto' : 'Subir Foto'}
                </button>
                <p style={{ fontSize: 12, color: '#5a8ab0', margin: '6px 0 0' }}>
                  JPG, PNG o WebP · Máx. 2 MB
                </p>
                {errorFoto && (
                  <p style={{ fontSize: 12, color: '#e84040', margin: '4px 0 0' }}>{errorFoto}</p>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <Campo label="Nombre" requerido error={errores.nombre}>
                <input
                  className="ct-input"
                  value={borrador.nombre}
                  onChange={(e) => {
                    setBorrador({ ...borrador, nombre: e.target.value })
                    if (errores.nombre) setErrores({ ...errores, nombre: undefined })
                  }}
                  style={errores.nombre ? { borderColor: '#e84040' } : undefined}
                />
              </Campo>
              <Campo label="Apellido">
                <input
                  className="ct-input"
                  value={borrador.apellido ?? ''}
                  onChange={(e) => setBorrador({ ...borrador, apellido: e.target.value })}
                />
              </Campo>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <Campo label="Correo electrónico" requerido error={errores.email}>
                <input
                  className="ct-input"
                  type="email"
                  value={borrador.email}
                  onChange={(e) => {
                    setBorrador({ ...borrador, email: e.target.value })
                    if (errores.email) setErrores({ ...errores, email: undefined })
                  }}
                  style={errores.email ? { borderColor: '#e84040' } : undefined}
                />
              </Campo>
              <Campo label="Número de Colegiado">
                <input
                  className="ct-input"
                  value={borrador.numero_colegiado ?? ''}
                  onChange={(e) => setBorrador({ ...borrador, numero_colegiado: e.target.value })}
                  placeholder="Ej. 12345"
                  maxLength={20}
                />
              </Campo>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <Campo label="Rol">
                <input
                  className="ct-input"
                  value="Médico / Dentista"
                  readOnly
                  style={{ background: '#f0f7ff', color: '#5a8ab0', cursor: 'not-allowed' }}
                />
              </Campo>
              <Campo label="Sucursal asignada">
                <select
                  className="ct-input"
                  value={borrador.sucursal_id ?? ''}
                  onChange={(e) => setBorrador({ ...borrador, sucursal_id: e.target.value || null })}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="">— Sin sucursal asignada —</option>
                  {sucursales.map((s) => (
                    <option key={s.id} value={s.id}>{s.nombre}</option>
                  ))}
                </select>
              </Campo>
            </div>

            {/* Botones edición */}
            <div style={{ borderTop: '0.5px solid #c5ddf5', paddingTop: 20, marginTop: 8,
              display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                type="button"
                className="ct-btn ct-btn-secondary"
                onClick={cancelarEdicion}
                disabled={guardando}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="ct-btn ct-btn-primary"
                onClick={guardar}
                disabled={guardando}
                style={{ opacity: guardando ? 0.6 : 1 }}
              >
                {guardando ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
