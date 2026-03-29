'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { EMPRESA_ID } from '@/lib/config'
import ModalNuevaCita from '@/components/ModalNuevaCita'
import PanelDetalleCita, { type CitaDetalle } from '@/components/PanelDetalleCita'

// ── Constantes de layout ───────────────────────────────────────────────────

const HORA_INICIO   = 8          // 8:00
const HORA_FIN      = 18         // 18:00
const PX_POR_HORA   = 72         // altura de cada hora en píxeles
const TOTAL_HORAS   = HORA_FIN - HORA_INICIO
const ALTURA_GRID   = TOTAL_HORAS * PX_POR_HORA  // 720px

// ── Tipos ──────────────────────────────────────────────────────────────────

interface CitaCalendario {
  id: string
  fecha_hora: string
  duracion_min: number
  estado: string
  precio_acordado: number | null
  notas_previas: string | null
  notas_post: string | null
  paciente_id: string
  dentista_id: string
  tratamiento_id: string | null
  paciente: {
    primer_nombre: string
    segundo_nombre: string | null
    primer_apellido: string
    segundo_apellido: string | null
    telefono: string | null
  } | null
  tratamiento: {
    nombre: string
    color: string | null
  } | null
  dentista: {
    nombre: string
    apellido: string | null
  } | null
}

// ── Helpers de fecha ───────────────────────────────────────────────────────

function lunesDeSemana(fecha: Date): Date {
  const d = new Date(fecha)
  d.setHours(0, 0, 0, 0)
  const dia = d.getDay() // 0=dom
  const diff = dia === 0 ? -6 : 1 - dia
  d.setDate(d.getDate() + diff)
  return d
}

function diasDeSemana(lunes: Date): Date[] {
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(lunes)
    d.setDate(lunes.getDate() + i)
    return d
  })
}

const NOMBRES_DIA  = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const NOMBRES_MES  = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function etiquetaSemana(lunes: Date): string {
  const sabado = new Date(lunes)
  sabado.setDate(lunes.getDate() + 5)
  if (lunes.getMonth() === sabado.getMonth()) {
    return `${lunes.getDate()} – ${sabado.getDate()} ${NOMBRES_MES[lunes.getMonth()]} ${lunes.getFullYear()}`
  }
  return `${lunes.getDate()} ${NOMBRES_MES[lunes.getMonth()]} – ${sabado.getDate()} ${NOMBRES_MES[sabado.getMonth()]} ${lunes.getFullYear()}`
}

function esMismaFecha(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate()
}

function esHoy(fecha: Date): boolean {
  return esMismaFecha(fecha, new Date())
}

// ── Helpers de cita ────────────────────────────────────────────────────────

function topPx(fechaHora: string): number {
  const d = new Date(fechaHora)
  const h = d.getHours() + d.getMinutes() / 60
  return Math.max(0, (h - HORA_INICIO) * PX_POR_HORA)
}

function alturaPx(duracionMin: number): number {
  return Math.max(duracionMin * (PX_POR_HORA / 60), 24)
}

function nombreCortoPaciente(p: CitaCalendario['paciente']): string {
  if (!p) return 'Paciente'
  return `${p.primer_nombre} ${p.primer_apellido}`
}

function formatearHoraCorta(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-GT', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

const COLOR_ESTADO: Record<string, string> = {
  agendada:    '#f0c040',
  confirmada:  '#1a6bbd',
  en_curso:    '#2ecc8a',
  completada:  '#5a8ab0',
  cancelada:   '#e84040',
  no_asistio:  '#e84040',
  reprogramada:'#a070dd',
}

function colorCita(cita: CitaCalendario): string {
  return cita.tratamiento?.color ?? COLOR_ESTADO[cita.estado] ?? '#1a6bbd'
}

// ── Componente principal ───────────────────────────────────────────────────

export default function CalendarioSemana() {
  const [lunes, setLunes]                             = useState<Date>(() => lunesDeSemana(new Date()))
  const [citas, setCitas]                             = useState<CitaCalendario[]>([])
  const [cargando, setCargando]                       = useState(true)
  const [mostrarModal, setMostrarModal]               = useState(false)
  const [citaSeleccionada, setCitaSeleccionada]       = useState<CitaDetalle | null>(null)

  const dias = diasDeSemana(lunes)

  // ── Fetch de citas de la semana ────────────────────────────────────

  const cargarCitas = useCallback(async () => {
    setCargando(true)

    const inicio = new Date(lunes)
    const fin    = new Date(lunes)
    fin.setDate(fin.getDate() + 6)
    fin.setHours(23, 59, 59, 999)

    const { data, error } = await supabase
      .from('citas')
      .select(`
        id, fecha_hora, duracion_min, estado,
        precio_acordado, notas_previas, notas_post,
        paciente_id, dentista_id, tratamiento_id,
        paciente:pacientes!paciente_id(primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, telefono),
        tratamiento:tratamiento_tipos!tratamiento_id(nombre, color),
        dentista:usuarios!dentista_id(nombre, apellido)
      `)
      .eq('empresa_id', EMPRESA_ID)
      .gte('fecha_hora', inicio.toISOString())
      .lte('fecha_hora', fin.toISOString())
      .order('fecha_hora')

    if (!error && data) {
      setCitas(data as unknown as CitaCalendario[])
    }
    setCargando(false)
  }, [lunes])

  useEffect(() => {
    cargarCitas()
  }, [cargarCitas])

  // ── Navegación de semana ────────────────────────────────────────────

  function semanaAnterior() {
    setLunes((prev) => {
      const d = new Date(prev)
      d.setDate(d.getDate() - 7)
      return d
    })
  }

  function semanaSiguiente() {
    setLunes((prev) => {
      const d = new Date(prev)
      d.setDate(d.getDate() + 7)
      return d
    })
  }

  function irAHoy() {
    setLunes(lunesDeSemana(new Date()))
  }

  // ── Citas por día ───────────────────────────────────────────────────

  function citasDeDia(dia: Date): CitaCalendario[] {
    return citas.filter((c) => esMismaFecha(new Date(c.fecha_hora), dia))
  }

  // ── Abrir detalle ───────────────────────────────────────────────────

  function abrirDetalle(cita: CitaCalendario) {
    setCitaSeleccionada(cita as CitaDetalle)
  }

  function actualizarCita(citaActualizada: CitaDetalle) {
    setCitas((prev) =>
      prev.map((c) => (c.id === citaActualizada.id ? (citaActualizada as CitaCalendario) : c))
    )
    setCitaSeleccionada(citaActualizada)
  }

  // ── Horas de la cuadrícula ──────────────────────────────────────────

  const horas = Array.from({ length: TOTAL_HORAS + 1 }, (_, i) => HORA_INICIO + i)

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <div>
      {/* ── Encabezado de página ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20, flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: '#0d3d6e', margin: 0 }}>
            Agenda de Citas
          </h1>
          <div style={{ fontSize: 13, color: '#5a8ab0', marginTop: 4 }}>
            {etiquetaSemana(lunes)}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Navegación de semana */}
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              className="ct-btn ct-btn-secondary ct-btn-sm"
              onClick={semanaAnterior}
              title="Semana anterior"
            >
              ←
            </button>
            <button
              className="ct-btn ct-btn-secondary ct-btn-sm"
              onClick={irAHoy}
            >
              Hoy
            </button>
            <button
              className="ct-btn ct-btn-secondary ct-btn-sm"
              onClick={semanaSiguiente}
              title="Semana siguiente"
            >
              →
            </button>
          </div>

          <button
            className="ct-btn ct-btn-primary"
            onClick={() => setMostrarModal(true)}
          >
            + Nueva Cita
          </button>
        </div>
      </div>

      {/* ── Calendario semanal ── */}
      <div className="ct-card" style={{ padding: 0, overflow: 'hidden' }}>

        {/* Cabecera de días */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '56px repeat(6, 1fr)',
          borderBottom: '0.5px solid #e0eef8',
          background: '#f0f7ff',
        }}>
          {/* Celda vacía esquina */}
          <div style={{ padding: '10px 0', borderRight: '0.5px solid #e0eef8' }} />

          {/* Días */}
          {dias.map((dia, i) => {
            const hoyFlag = esHoy(dia)
            return (
              <div
                key={i}
                style={{
                  padding: '10px 8px',
                  textAlign: 'center',
                  borderRight: i < 5 ? '0.5px solid #e0eef8' : undefined,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 500, color: '#5a8ab0', marginBottom: 2 }}>
                  {NOMBRES_DIA[i]}
                </div>
                <div style={{
                  fontSize: 18, fontWeight: 600,
                  color: hoyFlag ? '#1a6bbd' : '#0d3d6e',
                  width: 32, height: 32, borderRadius: '50%',
                  background: hoyFlag ? '#e8f4ff' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto',
                }}>
                  {dia.getDate()}
                </div>
              </div>
            )
          })}
        </div>

        {/* Cuerpo del calendario (con scroll) */}
        <div style={{ overflowY: 'auto', maxHeight: 600, position: 'relative' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '56px repeat(6, 1fr)',
            height: ALTURA_GRID,
            position: 'relative',
          }}>

            {/* ── Columna de horas ── */}
            <div style={{
              borderRight: '0.5px solid #e0eef8',
              position: 'relative',
              background: '#fafcff',
            }}>
              {horas.map((h) => (
                <div
                  key={h}
                  style={{
                    position: 'absolute',
                    top: (h - HORA_INICIO) * PX_POR_HORA - 8,
                    left: 0, right: 0,
                    textAlign: 'right',
                    paddingRight: 6,
                    fontSize: 11,
                    color: '#5a8ab0',
                    lineHeight: 1,
                  }}
                >
                  {h < 12 ? `${h}:00` : h === 12 ? '12:00' : `${h}:00`}
                </div>
              ))}
            </div>

            {/* ── Columnas de días ── */}
            {dias.map((dia, colIdx) => {
              const citasDelDia = citasDeDia(dia)
              const hoyFlag     = esHoy(dia)

              return (
                <div
                  key={colIdx}
                  style={{
                    position: 'relative',
                    borderRight: colIdx < 5 ? '0.5px solid #e0eef8' : undefined,
                    background: hoyFlag ? '#fafeff' : '#ffffff',
                  }}
                >
                  {/* Líneas horizontales por hora */}
                  {horas.map((h) => (
                    <div
                      key={h}
                      style={{
                        position: 'absolute',
                        top: (h - HORA_INICIO) * PX_POR_HORA,
                        left: 0, right: 0, height: 0,
                        borderTop: `0.5px solid ${h === HORA_INICIO ? 'transparent' : '#e0eef8'}`,
                      }}
                    />
                  ))}

                  {/* Líneas de media hora */}
                  {Array.from({ length: TOTAL_HORAS }, (_, i) => (
                    <div
                      key={i}
                      style={{
                        position: 'absolute',
                        top: (i + 0.5) * PX_POR_HORA,
                        left: 0, right: 0, height: 0,
                        borderTop: '0.5px dashed #f0f4f8',
                      }}
                    />
                  ))}

                  {/* Citas del día */}
                  {citasDelDia.map((cita) => {
                    const top      = topPx(cita.fecha_hora)
                    const altura   = alturaPx(cita.duracion_min)
                    const cancelada = cita.estado === 'cancelada'
                    const color    = cancelada ? '#9ca3af' : colorCita(cita)
                    const esCorta  = altura < 40

                    return (
                      <button
                        key={cita.id}
                        onClick={() => abrirDetalle(cita)}
                        title={`${nombreCortoPaciente(cita.paciente)} — ${cita.tratamiento?.nombre ?? 'Sin tratamiento'}`}
                        style={{
                          position: 'absolute',
                          top: top + 1,
                          left: 3, right: 3,
                          height: altura - 2,
                          background: cancelada ? '#e5e7eb' : `${color}22`,
                          borderTopWidth: 1, borderTopStyle: 'solid', borderTopColor: cancelada ? '#d1d5db' : `${color}44`,
                          borderRightWidth: 1, borderRightStyle: 'solid', borderRightColor: cancelada ? '#d1d5db' : `${color}44`,
                          borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: cancelada ? '#d1d5db' : `${color}44`,
                          borderLeftWidth: 3, borderLeftStyle: 'solid', borderLeftColor: color,
                          borderRadius: 4,
                          padding: esCorta ? '1px 5px' : '4px 6px',
                          cursor: 'pointer',
                          textAlign: 'left',
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'flex-start',
                          gap: 1,
                          opacity: cancelada ? 0.6 : 1,
                          transition: 'filter 0.1s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(0.93)')}
                        onMouseLeave={(e) => (e.currentTarget.style.filter = 'none')}
                      >
                        <span style={{
                          fontSize: 11, fontWeight: 600,
                          color: cancelada ? '#6b7280' : '#0d3d6e',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          lineHeight: 1.3,
                          textDecoration: cancelada ? 'line-through' : 'none',
                        }}>
                          {nombreCortoPaciente(cita.paciente)}
                        </span>
                        {cancelada && (
                          <span style={{
                            fontSize: 9, fontWeight: 600, color: '#6b7280',
                            textTransform: 'uppercase', letterSpacing: '0.04em',
                            lineHeight: 1.2,
                          }}>
                            Cancelada
                          </span>
                        )}
                        {!esCorta && !cancelada && cita.tratamiento && (
                          <span style={{
                            fontSize: 10, color: '#5a8ab0',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            lineHeight: 1.2,
                          }}>
                            {cita.tratamiento.nombre}
                          </span>
                        )}
                        {!esCorta && (
                          <span style={{ fontSize: 10, color: cancelada ? '#9ca3af' : '#5a8ab0', lineHeight: 1.2 }}>
                            {formatearHoraCorta(cita.fecha_hora)}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Cargando */}
      {cargando && (
        <div style={{
          textAlign: 'center', padding: '20px', fontSize: 13, color: '#5a8ab0',
          marginTop: 8,
        }}>
          Cargando citas...
        </div>
      )}

      {/* Sin citas */}
      {!cargando && citas.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '20px', fontSize: 13, color: '#5a8ab0',
          marginTop: 8,
        }}>
          No hay citas programadas esta semana.
        </div>
      )}

      {/* Leyenda de estados */}
      <div style={{
        marginTop: 16, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center',
        fontSize: 12, color: '#5a8ab0',
      }}>
        <span style={{ fontWeight: 500 }}>Estado:</span>
        {[
          { estado: 'agendada',   etiqueta: 'Agendada' },
          { estado: 'confirmada', etiqueta: 'Confirmada' },
          { estado: 'en_curso',   etiqueta: 'En curso' },
          { estado: 'completada', etiqueta: 'Completada' },
        ].map(({ estado, etiqueta }) => (
          <div key={estado} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{
              width: 12, height: 12, borderRadius: 2,
              background: COLOR_ESTADO[estado],
            }} />
            <span>{etiqueta}</span>
          </div>
        ))}
      </div>

      {/* ── Modales ── */}
      {mostrarModal && (
        <ModalNuevaCita
          onClose={() => setMostrarModal(false)}
          onSuccess={() => {
            setMostrarModal(false)
            cargarCitas()
          }}
        />
      )}

      {citaSeleccionada && (
        <PanelDetalleCita
          cita={citaSeleccionada}
          onClose={() => setCitaSeleccionada(null)}
          onUpdate={actualizarCita}
        />
      )}
    </div>
  )
}
