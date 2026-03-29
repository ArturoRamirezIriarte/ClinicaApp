'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { EMPRESA_ID } from '@/lib/config'
import ModalNuevaCita from '@/components/ModalNuevaCita'
import HistorialCitasPaciente from '@/components/HistorialCitasPaciente'
import Odontograma from '@/components/Odontograma'
import {
  Campo, TagInput, Seccion,
  DatosPaciente, ErroresCampo,
  ESTADO_INICIAL, COMO_NOS_CONOCIO_OPCIONES, MUESTRA_REFERIDO,
} from '@/components/CamposFormulario'

// ── Tipos ──────────────────────────────────────────────────────────────────

interface PacienteCompleto {
  id: string
  empresa_id: string
  primer_nombre: string
  segundo_nombre: string | null
  primer_apellido: string
  segundo_apellido: string | null
  fecha_nacimiento: string | null
  dpi: string | null
  genero: 'M' | 'F' | 'otro' | null
  telefono: string | null
  telefono_alt: string | null
  email: string | null
  direccion: string | null
  como_nos_conocio: string | null
  referido_nombre: string | null
  tiene_seguro: boolean
  seguro_nombre: string | null
  seguro_poliza: string | null
  seguro_vigencia: string | null
  alergias: string[] | null
  condiciones: string[] | null
  medicamentos: string[] | null
  notas_medicas: string | null
  activo: boolean
  creado_en: string
  actualizado_en: string
}

// ── Helpers ────────────────────────────────────────────────────────────────

function nombreCompleto(p: PacienteCompleto): string {
  return [p.primer_nombre, p.segundo_nombre, p.primer_apellido, p.segundo_apellido]
    .filter(Boolean)
    .join(' ')
}

function calcularEdad(fechaNacimiento: string | null): string {
  if (!fechaNacimiento) return ''
  const hoy = new Date()
  const nac = new Date(fechaNacimiento + 'T12:00:00')
  let edad = hoy.getFullYear() - nac.getFullYear()
  if (
    hoy.getMonth() < nac.getMonth() ||
    (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate())
  ) edad--
  return `${edad} años`
}

// Formato seguro para campos DATE (evita desfase de zona horaria)
function formatearFechaLocal(fecha: string | null): string {
  if (!fecha) return '—'
  const [year, month, day] = fecha.split('-')
  return `${day}/${month}/${year}`
}

function formatearFechaHora(iso: string): string {
  return new Date(iso).toLocaleDateString('es-GT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

const ETIQUETA_GENERO: Record<string, string> = {
  M:    'Masculino',
  F:    'Femenino',
  otro: 'Otro / Prefiero no indicar',
}

const ETIQUETA_CONOCIO: Record<string, string> = {
  referido_paciente: 'Referido por paciente',
  referido_medico:   'Referido por médico',
  redes_sociales:    'Redes sociales',
  google:            'Google / Internet',
  walk_in:           'Visita directa',
  publicidad:        'Publicidad',
  otro:              'Otro',
}

// ── Componentes de lectura ─────────────────────────────────────────────────

function CampoLectura({ etiqueta, valor }: { etiqueta: string; valor?: string | null }) {
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 500, color: '#5a8ab0', marginBottom: 3 }}>
        {etiqueta}
      </div>
      <div style={{ fontSize: 14, color: '#0d3d6e', minHeight: 20 }}>
        {valor || '—'}
      </div>
    </div>
  )
}

function TagsLectura({ etiqueta, valores }: { etiqueta: string; valores: string[] | null }) {
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 500, color: '#5a8ab0', marginBottom: 6 }}>
        {etiqueta}
      </div>
      {valores && valores.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {valores.map((v, i) => (
            <span
              key={i}
              style={{
                display: 'inline-flex', alignItems: 'center',
                padding: '3px 10px', borderRadius: 20,
                background: '#e8f4ff', color: '#0d3d6e',
                fontSize: 13, fontWeight: 500,
              }}
            >
              {v}
            </span>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 14, color: '#5a8ab0' }}>—</div>
      )}
    </div>
  )
}

// ── Conversión paciente → datos de formulario ──────────────────────────────

function pacienteADatos(p: PacienteCompleto): DatosPaciente {
  return {
    primer_nombre:    p.primer_nombre,
    segundo_nombre:   p.segundo_nombre   ?? '',
    primer_apellido:  p.primer_apellido,
    segundo_apellido: p.segundo_apellido ?? '',
    fecha_nacimiento: p.fecha_nacimiento ?? '',
    dpi:              p.dpi              ?? '',
    genero:           (p.genero as DatosPaciente['genero']) ?? '',
    telefono:         p.telefono         ?? '',
    telefono_alt:     p.telefono_alt     ?? '',
    email:            p.email            ?? '',
    direccion:        p.direccion        ?? '',
    como_nos_conocio: p.como_nos_conocio ?? '',
    referido_nombre:  p.referido_nombre  ?? '',
    tiene_seguro:     p.tiene_seguro,
    seguro_nombre:    p.seguro_nombre    ?? '',
    seguro_poliza:    p.seguro_poliza    ?? '',
    seguro_vigencia:  p.seguro_vigencia  ?? '',
    alergias:         p.alergias         ?? [],
    condiciones:      p.condiciones      ?? [],
    medicamentos:     p.medicamentos     ?? [],
    notas_medicas:    p.notas_medicas    ?? '',
  }
}

// ── Componente principal ───────────────────────────────────────────────────

export default function PerfilPaciente({ pacienteId }: { pacienteId: string }) {
  const router = useRouter()

  // Estado de carga
  const [paciente, setPaciente] = useState<PacienteCompleto | null>(null)
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)

  // Estado de edición
  const [modoEdicion, setModoEdicion] = useState(false)
  const [mostrarModalCita, setMostrarModalCita] = useState(false)
  const [datos, setDatos] = useState<DatosPaciente>(ESTADO_INICIAL)
  const [errores, setErrores] = useState<ErroresCampo>({})
  const [guardando, setGuardando] = useState(false)
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [guardadoExito, setGuardadoExito] = useState(false)

  // ── Carga inicial ──────────────────────────────────────────────────────

  useEffect(() => {
    async function cargar() {
      setCargando(true)
      setErrorCarga(null)

      const { data, error } = await supabase
        .from('pacientes')
        .select('*')
        .eq('id', pacienteId)
        .eq('empresa_id', EMPRESA_ID)
        .single()

      setCargando(false)
      if (error || !data) {
        setErrorCarga('No se pudo cargar el perfil del paciente.')
        return
      }
      setPaciente(data as PacienteCompleto)
    }
    cargar()
  }, [pacienteId])

  // ── Entrar / salir modo edición ────────────────────────────────────────

  function iniciarEdicion() {
    if (!paciente) return
    setDatos(pacienteADatos(paciente))
    setErrores({})
    setErrorGeneral(null)
    setModoEdicion(true)
  }

  function cancelarEdicion() {
    setModoEdicion(false)
    setErrores({})
    setErrorGeneral(null)
  }

  // ── Handlers de formulario ─────────────────────────────────────────────

  function manejarCambio(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value, type } = e.target
    const nuevoValor = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    setDatos((prev) => ({ ...prev, [name]: nuevoValor }))
    if (errores[name]) setErrores((prev) => ({ ...prev, [name]: '' }))
  }

  function manejarArray(campo: 'alergias' | 'condiciones' | 'medicamentos', nuevos: string[]) {
    setDatos((prev) => ({ ...prev, [campo]: nuevos }))
  }

  // ── Validación ─────────────────────────────────────────────────────────

  function validar(): boolean {
    const e: ErroresCampo = {}
    if (!datos.primer_nombre.trim())
      e.primer_nombre = 'Este campo es requerido'
    if (!datos.primer_apellido.trim())
      e.primer_apellido = 'Este campo es requerido'
    if (!datos.telefono.trim())
      e.telefono = 'Este campo es requerido'
    if (datos.dpi && !/^\d{13}$/.test(datos.dpi.replace(/\s/g, '')))
      e.dpi = 'El DPI debe tener exactamente 13 dígitos numéricos'
    if (datos.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email))
      e.email = 'Formato de correo electrónico inválido'
    if (datos.tiene_seguro && !datos.seguro_nombre.trim())
      e.seguro_nombre = 'Ingrese el nombre de la aseguradora'
    if (MUESTRA_REFERIDO.includes(datos.como_nos_conocio) && !datos.referido_nombre.trim())
      e.referido_nombre = 'Ingrese el nombre de quien refirió al paciente'
    setErrores(e)
    return Object.keys(e).length === 0
  }

  // ── Guardar cambios ────────────────────────────────────────────────────

  async function manejarGuardar(e: React.FormEvent) {
    e.preventDefault()
    setErrorGeneral(null)
    if (!validar()) return

    setGuardando(true)
    try {
      const dpiLimpio = datos.dpi.replace(/\s/g, '').trim()
      const registro = {
        primer_nombre:    datos.primer_nombre.trim(),
        segundo_nombre:   datos.segundo_nombre.trim()   || null,
        primer_apellido:  datos.primer_apellido.trim(),
        segundo_apellido: datos.segundo_apellido.trim() || null,
        fecha_nacimiento: datos.fecha_nacimiento        || null,
        dpi:              dpiLimpio                     || null,
        genero:           datos.genero                  || null,
        telefono:         datos.telefono.trim(),
        telefono_alt:     datos.telefono_alt.trim()     || null,
        email:            datos.email.trim()            || null,
        direccion:        datos.direccion.trim()        || null,
        como_nos_conocio: datos.como_nos_conocio        || null,
        referido_nombre:  MUESTRA_REFERIDO.includes(datos.como_nos_conocio)
                            ? datos.referido_nombre.trim() || null
                            : null,
        tiene_seguro:     datos.tiene_seguro,
        seguro_nombre:    datos.tiene_seguro ? datos.seguro_nombre.trim()  || null : null,
        seguro_poliza:    datos.tiene_seguro ? datos.seguro_poliza.trim()  || null : null,
        seguro_vigencia:  datos.tiene_seguro && datos.seguro_vigencia
                            ? datos.seguro_vigencia : null,
        alergias:         datos.alergias.length     > 0 ? datos.alergias     : null,
        condiciones:      datos.condiciones.length  > 0 ? datos.condiciones  : null,
        medicamentos:     datos.medicamentos.length > 0 ? datos.medicamentos : null,
        notas_medicas:    datos.notas_medicas.trim() || null,
        actualizado_en:   new Date().toISOString(),
      }

      const { data: actualizado, error } = await supabase
        .from('pacientes')
        .update(registro)
        .eq('id', pacienteId)
        .eq('empresa_id', EMPRESA_ID)
        .select()
        .single()

      if (error) throw error

      setPaciente(actualizado as PacienteCompleto)
      setModoEdicion(false)
      setGuardadoExito(true)
      setTimeout(() => setGuardadoExito(false), 5000)
    } catch (err) {
      console.error('Error al actualizar paciente:', err)
      setErrorGeneral('Ocurrió un error al guardar. Por favor intente de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  // ── Estados de carga y error inicial ──────────────────────────────────

  if (cargando) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: '#5a8ab0', fontSize: 14 }}>
        Cargando perfil...
      </div>
    )
  }

  if (errorCarga || !paciente) {
    return (
      <div style={{
        background: '#fff0f0', border: '0.5px solid #e84040', borderRadius: 8,
        padding: '16px 20px', color: '#e84040', fontSize: 14,
      }}>
        {errorCarga ?? 'Paciente no encontrado.'}
      </div>
    )
  }

  const nombre = nombreCompleto(paciente)
  const edad   = calcularEdad(paciente.fecha_nacimiento)

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 16, fontSize: 13, color: '#5a8ab0' }}>
        <Link href="/pacientes" style={{ color: '#1a6bbd', textDecoration: 'none' }}>
          Pacientes
        </Link>
        {' › '}
        <span style={{ color: '#0d3d6e' }}>{nombre}</span>
      </div>

      {/* Encabezado */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        marginBottom: 24, flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: '#0d3d6e', margin: 0 }}>
            {nombre}
          </h1>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span className={`ct-badge ${paciente.activo ? 'ct-badge-activo' : 'ct-badge-cancelado'}`}>
              {paciente.activo ? 'Activo' : 'Inactivo'}
            </span>
            {edad && (
              <span style={{ fontSize: 13, color: '#5a8ab0' }}>{edad}</span>
            )}
            <span style={{ fontSize: 13, color: '#5a8ab0' }}>
              · Registrado el {formatearFechaHora(paciente.creado_en)}
            </span>
          </div>
        </div>

        {!modoEdicion && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="ct-btn ct-btn-secondary"
              onClick={() => setMostrarModalCita(true)}
            >
              📅 Agendar Cita
            </button>
            <button
              className="ct-btn ct-btn-secondary"
              onClick={() => router.push(`/cobros/nuevo?paciente_id=${pacienteId}`)}
            >
              💳 Cobrar
            </button>
            <button className="ct-btn ct-btn-secondary" onClick={iniciarEdicion}>
              ✏ Editar
            </button>
          </div>
        )}
      </div>

      {/* Banner de éxito tras guardar */}
      {guardadoExito && (
        <div style={{
          background: '#e8fff5', border: '0.5px solid #2ecc8a', borderRadius: 8,
          padding: '12px 16px', color: '#0a5535', marginBottom: 20, fontSize: 14,
        }}>
          Datos del paciente actualizados correctamente.
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          MODO LECTURA
      ════════════════════════════════════════════════════════════════ */}
      {!modoEdicion && (
        <>
          {/* 1. Datos Personales */}
          <Seccion titulo="Datos Personales">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CampoLectura etiqueta="Primer Nombre"    valor={paciente.primer_nombre} />
              <CampoLectura etiqueta="Segundo Nombre"   valor={paciente.segundo_nombre} />
              <CampoLectura etiqueta="Primer Apellido"  valor={paciente.primer_apellido} />
              <CampoLectura etiqueta="Segundo Apellido" valor={paciente.segundo_apellido} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <CampoLectura
                etiqueta="Fecha de Nacimiento"
                valor={formatearFechaLocal(paciente.fecha_nacimiento)}
              />
              <CampoLectura etiqueta="DPI / CUI" valor={paciente.dpi} />
              <CampoLectura
                etiqueta="Género"
                valor={paciente.genero ? (ETIQUETA_GENERO[paciente.genero] ?? paciente.genero) : null}
              />
            </div>
          </Seccion>

          {/* 2. Información de Contacto */}
          <Seccion titulo="Información de Contacto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CampoLectura etiqueta="Teléfono Principal"    valor={paciente.telefono} />
              <CampoLectura etiqueta="Teléfono Alternativo"  valor={paciente.telefono_alt} />
              <CampoLectura etiqueta="Correo Electrónico"    valor={paciente.email} />
              <CampoLectura
                etiqueta="¿Cómo nos conoció?"
                valor={paciente.como_nos_conocio
                  ? (ETIQUETA_CONOCIO[paciente.como_nos_conocio] ?? paciente.como_nos_conocio)
                  : null}
              />
              {paciente.referido_nombre && (
                <div className="md:col-span-2">
                  <CampoLectura etiqueta="Nombre de quien refirió" valor={paciente.referido_nombre} />
                </div>
              )}
            </div>
            {paciente.direccion && (
              <div className="mt-4">
                <CampoLectura etiqueta="Dirección" valor={paciente.direccion} />
              </div>
            )}
          </Seccion>

          {/* 3. Seguro Médico */}
          <Seccion titulo="Seguro Médico">
            {paciente.tiene_seguro ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <CampoLectura etiqueta="Aseguradora"   valor={paciente.seguro_nombre} />
                <CampoLectura etiqueta="No. de Póliza" valor={paciente.seguro_poliza} />
                <CampoLectura
                  etiqueta="Vigente hasta"
                  valor={formatearFechaLocal(paciente.seguro_vigencia)}
                />
              </div>
            ) : (
              <p style={{ fontSize: 13, color: '#5a8ab0' }}>
                El paciente no tiene seguro médico registrado.
              </p>
            )}
          </Seccion>

          {/* 4. Información Médica */}
          <Seccion titulo="Información Médica">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <TagsLectura etiqueta="Alergias"             valores={paciente.alergias} />
              <TagsLectura etiqueta="Condiciones Médicas"  valores={paciente.condiciones} />
              <TagsLectura etiqueta="Medicamentos Actuales" valores={paciente.medicamentos} />
            </div>
            {paciente.notas_medicas && (
              <div className="mt-4">
                <CampoLectura etiqueta="Notas Médicas Adicionales" valor={paciente.notas_medicas} />
              </div>
            )}
          </Seccion>

          {/* 5. Historial de Citas */}
          <Seccion titulo="Historial de Citas">
            <HistorialCitasPaciente pacienteId={pacienteId} />
          </Seccion>

          {/* 6. Odontograma interactivo */}
          <Seccion titulo="Odontograma">
            <Odontograma pacienteId={pacienteId} />
          </Seccion>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════
          MODO EDICIÓN
      ════════════════════════════════════════════════════════════════ */}
      {modoEdicion && (
        <form onSubmit={manejarGuardar} noValidate>

          {/* Error general */}
          {errorGeneral && (
            <div style={{
              background: '#fff0f0', border: '0.5px solid #e84040', borderRadius: 8,
              padding: '12px 16px', color: '#e84040', marginBottom: 20, fontSize: 14,
            }}>
              {errorGeneral}
            </div>
          )}

          {/* 1. Datos Personales */}
          <Seccion titulo="Datos Personales">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Campo id="primer_nombre" etiqueta="Primer Nombre" requerido
                valor={datos.primer_nombre} error={errores.primer_nombre}
                onChange={manejarCambio} placeholder="Ingrese el primer nombre" />
              <Campo id="segundo_nombre" etiqueta="Segundo Nombre"
                valor={datos.segundo_nombre} onChange={manejarCambio}
                placeholder="Ingrese el segundo nombre" />
              <Campo id="primer_apellido" etiqueta="Primer Apellido" requerido
                valor={datos.primer_apellido} error={errores.primer_apellido}
                onChange={manejarCambio} placeholder="Ingrese el primer apellido" />
              <Campo id="segundo_apellido" etiqueta="Segundo Apellido"
                valor={datos.segundo_apellido} onChange={manejarCambio}
                placeholder="Ingrese el segundo apellido" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label htmlFor="fecha_nacimiento" className="ct-label">Fecha de Nacimiento</label>
                <input
                  id="fecha_nacimiento" name="fecha_nacimiento" type="date"
                  value={datos.fecha_nacimiento} onChange={manejarCambio}
                  max={new Date().toISOString().split('T')[0]} className="ct-input"
                />
              </div>
              <div>
                <label htmlFor="dpi" className="ct-label">DPI / CUI</label>
                <input
                  id="dpi" name="dpi" type="text" value={datos.dpi}
                  onChange={manejarCambio} placeholder="1234 12345 1234"
                  maxLength={13} inputMode="numeric"
                  className={`ct-input${errores.dpi ? ' ct-error' : ''}`}
                />
                {errores.dpi && <p className="ct-field-error">{errores.dpi}</p>}
              </div>
              <div>
                <label htmlFor="genero" className="ct-label">Género</label>
                <select id="genero" name="genero" value={datos.genero}
                  onChange={manejarCambio} className="ct-select">
                  <option value="">Seleccione...</option>
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                  <option value="otro">Otro / Prefiero no indicar</option>
                </select>
              </div>
            </div>
          </Seccion>

          {/* 2. Información de Contacto */}
          <Seccion titulo="Información de Contacto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Campo id="telefono" etiqueta="Teléfono Principal" requerido tipo="tel"
                valor={datos.telefono} error={errores.telefono}
                onChange={manejarCambio} placeholder="Ej. 5555-1234" />
              <Campo id="telefono_alt" etiqueta="Teléfono Alternativo" tipo="tel"
                valor={datos.telefono_alt} onChange={manejarCambio}
                placeholder="Ej. 2222-0000" />
              <Campo id="email" etiqueta="Correo Electrónico" tipo="email"
                valor={datos.email} error={errores.email}
                onChange={manejarCambio} placeholder="correo@ejemplo.com" />
              <div>
                <label htmlFor="como_nos_conocio" className="ct-label">¿Cómo nos conoció?</label>
                <select id="como_nos_conocio" name="como_nos_conocio"
                  value={datos.como_nos_conocio} onChange={manejarCambio} className="ct-select">
                  {COMO_NOS_CONOCIO_OPCIONES.map((op) => (
                    <option key={op.valor} value={op.valor}>{op.etiqueta}</option>
                  ))}
                </select>
              </div>
              {MUESTRA_REFERIDO.includes(datos.como_nos_conocio) && (
                <div className="md:col-span-2">
                  <label htmlFor="referido_nombre" className="ct-label ct-label-req">
                    Nombre de quien refirió
                  </label>
                  <input
                    id="referido_nombre" name="referido_nombre" type="text"
                    value={datos.referido_nombre} onChange={manejarCambio}
                    placeholder={datos.como_nos_conocio === 'referido_medico'
                      ? 'Nombre del médico o especialista'
                      : 'Nombre del paciente que refirió'}
                    maxLength={150}
                    className={`ct-input${errores.referido_nombre ? ' ct-error' : ''}`}
                  />
                  {errores.referido_nombre && (
                    <p className="ct-field-error">{errores.referido_nombre}</p>
                  )}
                </div>
              )}
            </div>
            <div className="mt-4">
              <label htmlFor="direccion" className="ct-label">Dirección</label>
              <textarea
                id="direccion" name="direccion" value={datos.direccion}
                onChange={manejarCambio}
                placeholder="Zona, colonia, municipio, departamento..."
                className="ct-textarea" rows={2}
              />
            </div>
          </Seccion>

          {/* 3. Seguro Médico */}
          <Seccion titulo="Seguro Médico">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <input type="checkbox" id="tiene_seguro" name="tiene_seguro"
                checked={datos.tiene_seguro} onChange={manejarCambio} className="ct-checkbox" />
              <label htmlFor="tiene_seguro"
                style={{ fontSize: 14, fontWeight: 500, color: '#0d3d6e', cursor: 'pointer' }}>
                El paciente tiene seguro médico
              </label>
            </div>
            {datos.tiene_seguro ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="seguro_nombre" className="ct-label ct-label-req">Aseguradora</label>
                  <input id="seguro_nombre" name="seguro_nombre" type="text"
                    value={datos.seguro_nombre} onChange={manejarCambio}
                    placeholder="Ej. G&T, Seguros Universales..."
                    className={`ct-input${errores.seguro_nombre ? ' ct-error' : ''}`} />
                  {errores.seguro_nombre && (
                    <p className="ct-field-error">{errores.seguro_nombre}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="seguro_poliza" className="ct-label">No. de Póliza</label>
                  <input id="seguro_poliza" name="seguro_poliza" type="text"
                    value={datos.seguro_poliza} onChange={manejarCambio}
                    placeholder="Número de póliza" className="ct-input" />
                </div>
                <div>
                  <label htmlFor="seguro_vigencia" className="ct-label">Vigente hasta</label>
                  <input id="seguro_vigencia" name="seguro_vigencia" type="date"
                    value={datos.seguro_vigencia} onChange={manejarCambio} className="ct-input" />
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 13, color: '#5a8ab0' }}>
                Active la casilla si el paciente cuenta con seguro médico.
              </p>
            )}
          </Seccion>

          {/* 4. Información Médica */}
          <Seccion titulo="Información Médica">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <TagInput etiqueta="Alergias" valores={datos.alergias}
                placeholder="Ej. Penicilina, látex..."
                onChange={(v) => manejarArray('alergias', v)} />
              <TagInput etiqueta="Condiciones Médicas" valores={datos.condiciones}
                placeholder="Ej. Diabetes, hipertensión..."
                onChange={(v) => manejarArray('condiciones', v)} />
              <TagInput etiqueta="Medicamentos Actuales" valores={datos.medicamentos}
                placeholder="Ej. Metformina, aspirina..."
                onChange={(v) => manejarArray('medicamentos', v)} />
            </div>
            <div className="mt-4">
              <label htmlFor="notas_medicas" className="ct-label">Notas Médicas Adicionales</label>
              <textarea id="notas_medicas" name="notas_medicas" value={datos.notas_medicas}
                onChange={manejarCambio}
                placeholder="Observaciones, antecedentes relevantes, notas del dentista..."
                className="ct-textarea" rows={3} />
            </div>
          </Seccion>

          {/* Acciones */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingBottom: 32 }}>
            <button type="button" className="ct-btn ct-btn-secondary"
              onClick={cancelarEdicion} disabled={guardando}>
              Cancelar
            </button>
            <button type="submit" className="ct-btn ct-btn-primary" disabled={guardando}>
              {guardando ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      )}

      {/* Modal para agendar cita desde el perfil */}
      {mostrarModalCita && (
        <ModalNuevaCita
          pacientePrefijado={{ id: pacienteId, nombre }}
          onClose={() => setMostrarModalCita(false)}
          onSuccess={() => {
            setMostrarModalCita(false)
            router.push('/citas')
          }}
        />
      )}
    </div>
  )
}
