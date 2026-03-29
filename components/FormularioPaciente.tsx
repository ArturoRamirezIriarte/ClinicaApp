'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { EMPRESA_ID } from '@/lib/config'
import {
  Campo, TagInput, Seccion,
  DatosPaciente, ErroresCampo,
  ESTADO_INICIAL, COMO_NOS_CONOCIO_OPCIONES, MUESTRA_REFERIDO,
} from '@/components/CamposFormulario'

// ── Formulario de registro ─────────────────────────────────────────────────

export default function FormularioPaciente() {
  const router = useRouter()
  const [datos, setDatos] = useState<DatosPaciente>(ESTADO_INICIAL)
  const [errores, setErrores] = useState<ErroresCampo>({})
  const [guardando, setGuardando] = useState(false)
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)

  // ── Handlers ───────────────────────────────────────────────────────────

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

  // ── Guardar ────────────────────────────────────────────────────────────

  async function manejarGuardar(e: React.FormEvent) {
    e.preventDefault()
    setErrorGeneral(null)
    if (!validar()) return

    setGuardando(true)
    try {
      const dpiLimpio = datos.dpi.replace(/\s/g, '').trim()
      const registro = {
        empresa_id:       EMPRESA_ID,
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
        activo:           true,
      }

      const { error } = await supabase.from('pacientes').insert([registro])
      if (error) throw error

      router.push('/pacientes?registrado=1')
    } catch (err) {
      console.error('Error al registrar paciente:', err)
      setErrorGeneral('Ocurrió un error al guardar. Por favor intente de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
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

      {/* ── 1. Datos Personales ─────────────────────────────────────────── */}
      <Seccion titulo="Datos Personales">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Campo
            id="primer_nombre"
            etiqueta="Primer Nombre"
            requerido
            valor={datos.primer_nombre}
            error={errores.primer_nombre}
            onChange={manejarCambio}
            placeholder="Ingrese el primer nombre"
          />
          <Campo
            id="segundo_nombre"
            etiqueta="Segundo Nombre"
            valor={datos.segundo_nombre}
            onChange={manejarCambio}
            placeholder="Ingrese el segundo nombre"
          />
          <Campo
            id="primer_apellido"
            etiqueta="Primer Apellido"
            requerido
            valor={datos.primer_apellido}
            error={errores.primer_apellido}
            onChange={manejarCambio}
            placeholder="Ingrese el primer apellido"
          />
          <Campo
            id="segundo_apellido"
            etiqueta="Segundo Apellido"
            valor={datos.segundo_apellido}
            onChange={manejarCambio}
            placeholder="Ingrese el segundo apellido"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {/* Fecha de nacimiento */}
          <div>
            <label htmlFor="fecha_nacimiento" className="ct-label">
              Fecha de Nacimiento
            </label>
            <input
              id="fecha_nacimiento"
              name="fecha_nacimiento"
              type="date"
              value={datos.fecha_nacimiento}
              onChange={manejarCambio}
              max={new Date().toISOString().split('T')[0]}
              className="ct-input"
            />
          </div>

          {/* DPI */}
          <div>
            <label htmlFor="dpi" className="ct-label">DPI / CUI</label>
            <input
              id="dpi"
              name="dpi"
              type="text"
              value={datos.dpi}
              onChange={manejarCambio}
              placeholder="1234 12345 1234"
              maxLength={13}
              inputMode="numeric"
              className={`ct-input${errores.dpi ? ' ct-error' : ''}`}
            />
            {errores.dpi && <p className="ct-field-error">{errores.dpi}</p>}
          </div>

          {/* Género */}
          <div>
            <label htmlFor="genero" className="ct-label">Género</label>
            <select
              id="genero"
              name="genero"
              value={datos.genero}
              onChange={manejarCambio}
              className="ct-select"
            >
              <option value="">Seleccione...</option>
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
              <option value="otro">Otro / Prefiero no indicar</option>
            </select>
          </div>
        </div>
      </Seccion>

      {/* ── 2. Información de Contacto ──────────────────────────────────── */}
      <Seccion titulo="Información de Contacto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Campo
            id="telefono"
            etiqueta="Teléfono Principal"
            requerido
            tipo="tel"
            valor={datos.telefono}
            error={errores.telefono}
            onChange={manejarCambio}
            placeholder="Ej. 5555-1234"
          />
          <Campo
            id="telefono_alt"
            etiqueta="Teléfono Alternativo"
            tipo="tel"
            valor={datos.telefono_alt}
            onChange={manejarCambio}
            placeholder="Ej. 2222-0000"
          />
          <Campo
            id="email"
            etiqueta="Correo Electrónico"
            tipo="email"
            valor={datos.email}
            error={errores.email}
            onChange={manejarCambio}
            placeholder="correo@ejemplo.com"
          />

          {/* Cómo nos conoció */}
          <div>
            <label htmlFor="como_nos_conocio" className="ct-label">
              ¿Cómo nos conoció?
            </label>
            <select
              id="como_nos_conocio"
              name="como_nos_conocio"
              value={datos.como_nos_conocio}
              onChange={manejarCambio}
              className="ct-select"
            >
              {COMO_NOS_CONOCIO_OPCIONES.map((op) => (
                <option key={op.valor} value={op.valor}>{op.etiqueta}</option>
              ))}
            </select>
          </div>

          {/* Referido por — aparece solo cuando aplica */}
          {MUESTRA_REFERIDO.includes(datos.como_nos_conocio) && (
            <div className="md:col-span-2">
              <label htmlFor="referido_nombre" className="ct-label ct-label-req">
                Nombre de quien refirió
              </label>
              <input
                id="referido_nombre"
                name="referido_nombre"
                type="text"
                value={datos.referido_nombre}
                onChange={manejarCambio}
                placeholder={
                  datos.como_nos_conocio === 'referido_medico'
                    ? 'Nombre del médico o especialista'
                    : 'Nombre del paciente que refirió'
                }
                maxLength={150}
                className={`ct-input${errores.referido_nombre ? ' ct-error' : ''}`}
              />
              {errores.referido_nombre && (
                <p className="ct-field-error">{errores.referido_nombre}</p>
              )}
            </div>
          )}
        </div>

        {/* Dirección */}
        <div className="mt-4">
          <label htmlFor="direccion" className="ct-label">Dirección</label>
          <textarea
            id="direccion"
            name="direccion"
            value={datos.direccion}
            onChange={manejarCambio}
            placeholder="Zona, colonia, municipio, departamento..."
            className="ct-textarea"
            rows={2}
          />
        </div>
      </Seccion>

      {/* ── 3. Seguro Médico ─────────────────────────────────────────────── */}
      <Seccion titulo="Seguro Médico">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <input
            type="checkbox"
            id="tiene_seguro"
            name="tiene_seguro"
            checked={datos.tiene_seguro}
            onChange={manejarCambio}
            className="ct-checkbox"
          />
          <label
            htmlFor="tiene_seguro"
            style={{ fontSize: 14, fontWeight: 500, color: '#0d3d6e', cursor: 'pointer' }}
          >
            El paciente tiene seguro médico
          </label>
        </div>

        {datos.tiene_seguro ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="seguro_nombre" className="ct-label ct-label-req">
                Aseguradora
              </label>
              <input
                id="seguro_nombre"
                name="seguro_nombre"
                type="text"
                value={datos.seguro_nombre}
                onChange={manejarCambio}
                placeholder="Ej. G&T, Seguros Universales..."
                className={`ct-input${errores.seguro_nombre ? ' ct-error' : ''}`}
              />
              {errores.seguro_nombre && (
                <p className="ct-field-error">{errores.seguro_nombre}</p>
              )}
            </div>

            <div>
              <label htmlFor="seguro_poliza" className="ct-label">No. de Póliza</label>
              <input
                id="seguro_poliza"
                name="seguro_poliza"
                type="text"
                value={datos.seguro_poliza}
                onChange={manejarCambio}
                placeholder="Número de póliza"
                className="ct-input"
              />
            </div>

            <div>
              <label htmlFor="seguro_vigencia" className="ct-label">Vigente hasta</label>
              <input
                id="seguro_vigencia"
                name="seguro_vigencia"
                type="date"
                value={datos.seguro_vigencia}
                onChange={manejarCambio}
                className="ct-input"
              />
            </div>
          </div>
        ) : (
          <p style={{ fontSize: 13, color: '#5a8ab0' }}>
            Active la casilla si el paciente cuenta con seguro médico.
          </p>
        )}
      </Seccion>

      {/* ── 4. Información Médica ────────────────────────────────────────── */}
      <Seccion titulo="Información Médica">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TagInput
            etiqueta="Alergias"
            valores={datos.alergias}
            placeholder="Ej. Penicilina, látex..."
            onChange={(v) => manejarArray('alergias', v)}
          />
          <TagInput
            etiqueta="Condiciones Médicas"
            valores={datos.condiciones}
            placeholder="Ej. Diabetes, hipertensión..."
            onChange={(v) => manejarArray('condiciones', v)}
          />
          <TagInput
            etiqueta="Medicamentos Actuales"
            valores={datos.medicamentos}
            placeholder="Ej. Metformina, aspirina..."
            onChange={(v) => manejarArray('medicamentos', v)}
          />
        </div>

        <div className="mt-4">
          <label htmlFor="notas_medicas" className="ct-label">
            Notas Médicas Adicionales
          </label>
          <textarea
            id="notas_medicas"
            name="notas_medicas"
            value={datos.notas_medicas}
            onChange={manejarCambio}
            placeholder="Observaciones, antecedentes relevantes, notas del dentista..."
            className="ct-textarea"
            rows={3}
          />
        </div>
      </Seccion>

      {/* ── Acciones ────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingBottom: 32 }}>
        <button
          type="button"
          className="ct-btn ct-btn-secondary"
          onClick={() => router.push('/pacientes')}
          disabled={guardando}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="ct-btn ct-btn-primary"
          disabled={guardando}
        >
          {guardando ? 'Guardando...' : 'Registrar Paciente'}
        </button>
      </div>
    </form>
  )
}
