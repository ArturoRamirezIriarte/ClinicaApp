'use client'

import { useState, KeyboardEvent } from 'react'

// ── Tipos exportados ────────────────────────────────────────────────────────

export interface DatosPaciente {
  primer_nombre: string
  segundo_nombre: string
  primer_apellido: string
  segundo_apellido: string
  fecha_nacimiento: string
  dpi: string
  genero: 'M' | 'F' | 'otro' | ''
  telefono: string
  telefono_alt: string
  email: string
  direccion: string
  como_nos_conocio: string
  referido_nombre: string
  tiene_seguro: boolean
  seguro_nombre: string
  seguro_poliza: string
  seguro_vigencia: string
  alergias: string[]
  condiciones: string[]
  medicamentos: string[]
  notas_medicas: string
}

export interface ErroresCampo {
  [campo: string]: string
}

// ── Constantes exportadas ───────────────────────────────────────────────────

export const ESTADO_INICIAL: DatosPaciente = {
  primer_nombre:    '',
  segundo_nombre:   '',
  primer_apellido:  '',
  segundo_apellido: '',
  fecha_nacimiento: '',
  dpi:              '',
  genero:           '',
  telefono:         '',
  telefono_alt:     '',
  email:            '',
  direccion:        '',
  como_nos_conocio: '',
  referido_nombre:  '',
  tiene_seguro:     false,
  seguro_nombre:    '',
  seguro_poliza:    '',
  seguro_vigencia:  '',
  alergias:         [],
  condiciones:      [],
  medicamentos:     [],
  notas_medicas:    '',
}

export const COMO_NOS_CONOCIO_OPCIONES: { valor: string; etiqueta: string }[] = [
  { valor: '',                  etiqueta: 'Seleccione...' },
  { valor: 'referido_paciente', etiqueta: 'Referido por paciente' },
  { valor: 'referido_medico',   etiqueta: 'Referido por médico' },
  { valor: 'redes_sociales',    etiqueta: 'Redes sociales' },
  { valor: 'google',            etiqueta: 'Google / Internet' },
  { valor: 'walk_in',           etiqueta: 'Visita directa' },
  { valor: 'publicidad',        etiqueta: 'Publicidad' },
  { valor: 'otro',              etiqueta: 'Otro' },
]

export const MUESTRA_REFERIDO = ['referido_paciente', 'referido_medico']

// ── Campo de texto ──────────────────────────────────────────────────────────
// Definido a nivel de módulo para evitar remount en cada render

interface CampoProps {
  id: string
  etiqueta: string
  valor: string
  error?: string
  onChange: React.ChangeEventHandler<HTMLInputElement>
  requerido?: boolean
  tipo?: string
  placeholder?: string
  maxLen?: number
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
}

export function Campo({
  id,
  etiqueta,
  valor,
  error,
  onChange,
  requerido = false,
  tipo = 'text',
  placeholder,
  maxLen,
  inputMode,
}: CampoProps) {
  return (
    <div>
      <label htmlFor={id} className={`ct-label${requerido ? ' ct-label-req' : ''}`}>
        {etiqueta}
      </label>
      <input
        id={id}
        name={id}
        type={tipo}
        value={valor}
        onChange={onChange}
        placeholder={placeholder}
        maxLength={maxLen}
        inputMode={inputMode}
        className={`ct-input${error ? ' ct-error' : ''}`}
      />
      {error && <p className="ct-field-error">{error}</p>}
    </div>
  )
}

// ── TagInput ────────────────────────────────────────────────────────────────

export function TagInput({
  etiqueta,
  valores,
  placeholder,
  onChange,
}: {
  etiqueta: string
  valores: string[]
  placeholder?: string
  onChange: (v: string[]) => void
}) {
  const [texto, setTexto] = useState('')

  function confirmar() {
    const limpio = texto.trim()
    if (limpio && !valores.includes(limpio)) onChange([...valores, limpio])
    setTexto('')
  }

  function manejarTecla(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); confirmar() }
    if (e.key === 'Backspace' && texto === '' && valores.length > 0)
      onChange(valores.slice(0, -1))
  }

  return (
    <div>
      <label className="ct-label">{etiqueta}</label>
      <div
        style={{
          minHeight: 40,
          padding: '4px 8px',
          background: '#ffffff',
          border: '0.5px solid #c5ddf5',
          borderRadius: 8,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          alignItems: 'center',
          cursor: 'text',
        }}
        onClick={() => document.getElementById(`ti-${etiqueta}`)?.focus()}
      >
        {valores.map((v, i) => (
          <span key={i} className="ct-tag">
            {v}
            <button
              type="button"
              onClick={() => onChange(valores.filter((_, j) => j !== i))}
              aria-label={`Eliminar ${v}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          id={`ti-${etiqueta}`}
          type="text"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={manejarTecla}
          onBlur={confirmar}
          placeholder={valores.length === 0 ? (placeholder ?? 'Escriba y presione Enter...') : ''}
          style={{
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: 14,
            color: '#0d3d6e',
            flexGrow: 1,
            minWidth: 140,
            fontFamily: 'Inter, sans-serif',
          }}
        />
      </div>
      <p style={{ fontSize: 12, color: '#5a8ab0', marginTop: 3 }}>
        Enter o coma para agregar · Backspace para eliminar el último
      </p>
    </div>
  )
}

// ── Sección ─────────────────────────────────────────────────────────────────

export function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="ct-card" style={{ marginBottom: 20 }}>
      <div className="ct-card-header">{titulo}</div>
      {children}
    </div>
  )
}
