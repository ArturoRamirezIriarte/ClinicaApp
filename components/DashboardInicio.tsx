'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { EMPRESA_ID } from '@/lib/config'

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface CitaAgenda {
  id: string
  fecha_hora: string
  duracion_min: number
  estado: string
  precio_acordado: number | null
  paciente_id: string
  dentista_id: string | null
  tratamiento_id: string | null
  paciente: { primer_nombre: string; segundo_nombre: string | null; primer_apellido: string; segundo_apellido: string | null } | null
  tratamiento: { nombre: string; color: string | null } | null
  dentista: { nombre: string; apellido: string | null } | null
}

interface AlertaInventario {
  item_id: string
  nombre: string
  stock_actual: number
  stock_minimo: number
  unidad_medida: string
  estado_alerta: string
}

interface KPIs {
  citasHoy: number
  pacientesActivos: number
  cobrosHoy: number
  felPendientes: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function hoy(): { inicio: string; fin: string; label: string } {
  const ahora = new Date()
  const inicio = new Date(ahora)
  inicio.setHours(0, 0, 0, 0)
  const fin = new Date(ahora)
  fin.setHours(23, 59, 59, 999)
  const label = ahora.toLocaleDateString('es-GT', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  })
  return { inicio: inicio.toISOString(), fin: fin.toISOString(), label }
}

function formatHora(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function nombrePaciente(p: CitaAgenda['paciente']): string {
  if (!p) return 'Paciente'
  return [p.primer_nombre, p.segundo_nombre, p.primer_apellido, p.segundo_apellido]
    .filter(Boolean).join(' ')
}

const CONFIG_ESTADO: Record<string, { etiqueta: string; bg: string; color: string }> = {
  agendada:    { etiqueta: 'Agendada',    bg: '#fff8e8', color: '#7a5500' },
  confirmada:  { etiqueta: 'Confirmada',  bg: '#e8f4ff', color: '#0d3d6e' },
  en_curso:    { etiqueta: 'En curso',    bg: '#e8f4ff', color: '#1a6bbd' },
  completada:  { etiqueta: 'Completada',  bg: '#e8fff5', color: '#0a5535' },
  cancelada:   { etiqueta: 'Cancelada',   bg: '#fff0f0', color: '#7a1a1a' },
  no_asistio:  { etiqueta: 'No asistió',  bg: '#fff0f0', color: '#7a1a1a' },
  reprogramada:{ etiqueta: 'Reprogramada',bg: '#f5e8ff', color: '#5a1a8a' },
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function TarjetaKPI({
  icono, etiqueta, valor, color, cargando,
}: {
  icono: string; etiqueta: string; valor: string | number; color: string; cargando: boolean
}) {
  return (
    <div style={{
      background: '#fff', border: '0.5px solid #c5ddf5', borderRadius: 12,
      padding: '16px 20px', flex: 1, minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{
          width: 36, height: 36, background: '#f0f7ff', borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
        }}>{icono}</span>
        <span style={{ fontSize: 12, color: '#5a8ab0', fontWeight: 500 }}>{etiqueta}</span>
      </div>
      {cargando ? (
        <div style={{ height: 32, background: '#f0f7ff', borderRadius: 6, width: '60%' }} />
      ) : (
        <div style={{ fontSize: 28, fontWeight: 600, color }}>{valor}</div>
      )}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function DashboardInicio() {
  const router = useRouter()
  const diaHoy = hoy()

  const [kpis, setKpis]               = useState<KPIs | null>(null)
  const [cargandoKpis, setCargandoKpis] = useState(true)
  const [citasHoy, setCitasHoy]       = useState<CitaAgenda[]>([])
  const [cargandoCitas, setCargandoCitas] = useState(true)
  const [alertasInv, setAlertasInv]   = useState<AlertaInventario[]>([])
  const [citasSinConfirmar, setCitasSinConfirmar] = useState<number>(0)
  const [cobrosFelPend, setCobrosFelPend] = useState<number>(0)
  const [actualizando, setActualizando]   = useState<string | null>(null)
  const [citasCobradas, setCitasCobradas] = useState<Set<string>>(new Set())

  // ── Cargar KPIs ─────────────────────────────────────────────────────────────

  useEffect(() => {
    async function cargarKpis() {
      setCargandoKpis(true)
      const [
        { count: citas },
        { count: pacientes },
        cobrosData,
        { count: felPend },
      ] = await Promise.all([
        supabase.from('citas').select('*', { count: 'exact', head: true })
          .eq('empresa_id', EMPRESA_ID)
          .gte('fecha_hora', diaHoy.inicio)
          .lte('fecha_hora', diaHoy.fin),
        supabase.from('pacientes').select('*', { count: 'exact', head: true })
          .eq('empresa_id', EMPRESA_ID)
          .eq('activo', true),
        supabase.from('cobros').select('total')
          .eq('empresa_id', EMPRESA_ID)
          .eq('estado', 'pagado')
          .eq('fecha_cobro', new Date().toISOString().split('T')[0]),
        supabase.from('cobros').select('*', { count: 'exact', head: true })
          .eq('empresa_id', EMPRESA_ID)
          .eq('fel_estado', 'pendiente'),
      ])

      const totalCobros = cobrosData.data
        ? cobrosData.data.reduce((s: number, r: { total: number }) => s + Number(r.total ?? 0), 0)
        : 0

      setKpis({
        citasHoy:          citas ?? 0,
        pacientesActivos:  pacientes ?? 0,
        cobrosHoy:         totalCobros,
        felPendientes:     felPend ?? 0,
      })
      setCargandoKpis(false)
    }
    cargarKpis()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Cargar agenda del día ────────────────────────────────────────────────────

  const cargarCitas = useCallback(async () => {
    setCargandoCitas(true)
    const { data } = await supabase
      .from('citas')
      .select(`
        id, fecha_hora, duracion_min, estado, precio_acordado, paciente_id, dentista_id, tratamiento_id,
        paciente:pacientes!paciente_id(primer_nombre, segundo_nombre, primer_apellido, segundo_apellido),
        tratamiento:tratamiento_tipos!tratamiento_id(nombre, color),
        dentista:usuarios!dentista_id(nombre, apellido)
      `)
      .eq('empresa_id', EMPRESA_ID)
      .gte('fecha_hora', diaHoy.inicio)
      .lte('fecha_hora', diaHoy.fin)
      .not('estado', 'in', '(cancelada,no_asistio)')
      .order('fecha_hora')
    setCitasHoy((data as unknown as CitaAgenda[]) ?? [])
    const sinConfirmar = (data ?? []).filter((c: { estado: string }) => c.estado === 'agendada').length
    setCitasSinConfirmar(sinConfirmar)

    // Verificar qué citas ya tienen cobro registrado (no anulado)
    const citaIds = (data ?? []).map((c: { id: string }) => c.id)
    if (citaIds.length > 0) {
      const { data: cobrosData } = await supabase
        .from('cobros')
        .select('cita_id')
        .in('cita_id', citaIds)
        .neq('estado', 'anulado')
      setCitasCobradas(new Set(
        (cobrosData ?? [])
          .map((c: { cita_id: string | null }) => c.cita_id)
          .filter((id): id is string => id !== null)
      ))
    } else {
      setCitasCobradas(new Set())
    }

    setCargandoCitas(false)
  }, [diaHoy.inicio, diaHoy.fin])

  useEffect(() => { cargarCitas() }, [cargarCitas])

  // ── Cargar alertas ───────────────────────────────────────────────────────────

  useEffect(() => {
    async function cargarAlertas() {
      const [alertasData, cobrosFel] = await Promise.all([
        supabase.from('v_alertas_inventario')
          .select('item_id, nombre, stock_actual, stock_minimo, unidad_medida, estado_alerta')
          .eq('empresa_id', EMPRESA_ID)
          .order('estado_alerta'),
        supabase.from('cobros').select('*', { count: 'exact', head: true })
          .eq('empresa_id', EMPRESA_ID)
          .eq('fel_estado', 'pendiente')
          .eq('estado', 'pagado'),
      ])
      setAlertasInv((alertasData.data as AlertaInventario[]) ?? [])
      setCobrosFelPend(cobrosFel.count ?? 0)
    }
    cargarAlertas()
  }, [])

  // ── Cambiar estado de cita ───────────────────────────────────────────────────

  async function cambiarEstado(citaId: string, nuevoEstado: string) {
    setActualizando(citaId)
    try {
      const { error } = await supabase
        .from('citas')
        .update({ estado: nuevoEstado, actualizado_en: new Date().toISOString() })
        .eq('id', citaId)
        .eq('empresa_id', EMPRESA_ID)
      if (error) throw error
      // Actualizar local
      setCitasHoy((prev) =>
        prev.map((c) => c.id === citaId ? { ...c, estado: nuevoEstado } : c)
      )
      if (nuevoEstado !== 'cancelada') {
        setCitasSinConfirmar((prev) => {
          const era = citasHoy.find((c) => c.id === citaId)?.estado
          if (era === 'agendada' && nuevoEstado !== 'agendada') return Math.max(0, prev - 1)
          return prev
        })
      }
    } catch (err) {
      console.error('Error al cambiar estado:', err)
    } finally {
      setActualizando(null)
    }
  }

  // ── Agrupar citas por hora ───────────────────────────────────────────────────

  const HORAS = Array.from({ length: 11 }, (_, i) => i + 8) // 8..18

  function citasEnHora(h: number): CitaAgenda[] {
    return citasHoy.filter((c) => new Date(c.fecha_hora).getHours() === h)
  }

  const totalAlertas = alertasInv.length + (citasSinConfirmar > 0 ? 1 : 0) + (cobrosFelPend > 0 ? 1 : 0)

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 1200 }}>

      {/* Encabezado */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: '#0d3d6e', margin: '0 0 4px' }}>
          Inicio
        </h1>
        <div style={{ fontSize: 14, color: '#5a8ab0', textTransform: 'capitalize' }}>
          {diaHoy.label}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <TarjetaKPI
          icono="📅" etiqueta="Citas hoy"
          valor={kpis?.citasHoy ?? 0}
          color="#0d3d6e" cargando={cargandoKpis}
        />
        <TarjetaKPI
          icono="👤" etiqueta="Pacientes activos"
          valor={kpis?.pacientesActivos ?? 0}
          color="#1a6bbd" cargando={cargandoKpis}
        />
        <TarjetaKPI
          icono="💳" etiqueta="Cobros hoy (Q)"
          valor={kpis ? `Q ${Number(kpis.cobrosHoy).toLocaleString('es-GT', { minimumFractionDigits: 2 })}` : 'Q 0.00'}
          color="#0a5535" cargando={cargandoKpis}
        />
        <TarjetaKPI
          icono="🧾" etiqueta="FEL pendientes"
          valor={kpis?.felPendientes ?? 0}
          color={kpis && kpis.felPendientes > 0 ? '#e84040' : '#0d3d6e'}
          cargando={cargandoKpis}
        />
      </div>

      {/* Contenido principal: agenda + panel lateral */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>

        {/* Agenda del día */}
        <div style={{ background: '#fff', border: '0.5px solid #c5ddf5', borderRadius: 12 }}>
          <div style={{
            padding: '16px 20px', borderBottom: '0.5px solid #e0eef8',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#0d3d6e' }}>
              Agenda del día
              {citasHoy.length > 0 && (
                <span style={{
                  marginLeft: 8, background: '#e8f4ff', color: '#1a6bbd',
                  borderRadius: 20, padding: '2px 8px', fontSize: 12,
                }}>
                  {citasHoy.length} cita{citasHoy.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <Link href="/citas" className="ct-btn ct-btn-primary ct-btn-sm">
              + Nueva cita
            </Link>
          </div>

          {cargandoCitas ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#5a8ab0', fontSize: 14 }}>
              Cargando agenda...
            </div>
          ) : citasHoy.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: '#5a8ab0', fontSize: 14 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
              No hay citas programadas para hoy.
            </div>
          ) : (
            <div>
              {HORAS.map((hora) => {
                const citas = citasEnHora(hora)
                return (
                  <div key={hora}>
                    {/* Separador de hora */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '6px 20px',
                      background: '#f7faff',
                      borderBottom: '0.5px solid #e0eef8',
                    }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#5a8ab0', width: 42, flexShrink: 0 }}>
                        {hora.toString().padStart(2, '0')}:00
                      </span>
                      <div style={{ flex: 1, height: '0.5px', background: '#e0eef8' }} />
                      {citas.length === 0 && (
                        <span style={{ fontSize: 11, color: '#c5ddf5' }}>libre</span>
                      )}
                    </div>

                    {/* Citas en esta hora */}
                    {citas.map((cita) => {
                      const cfg = CONFIG_ESTADO[cita.estado] ?? CONFIG_ESTADO.agendada
                      const finCita = new Date(new Date(cita.fecha_hora).getTime() + cita.duracion_min * 60000)
                      const esActualizando = actualizando === cita.id
                      const tratColor = (cita.tratamiento as unknown as { color?: string } | null)?.color ?? '#c5ddf5'

                      return (
                        <div
                          key={cita.id}
                          style={{
                            display: 'flex', gap: 0,
                            borderBottom: '0.5px solid #e0eef8',
                            borderLeft: `3px solid ${tratColor}`,
                          }}
                        >
                          {/* Columna hora */}
                          <div style={{
                            width: 62, flexShrink: 0, padding: '12px 10px 12px 16px',
                            fontSize: 11, color: '#5a8ab0', fontWeight: 500,
                            display: 'flex', flexDirection: 'column', gap: 2,
                          }}>
                            <span>{formatHora(cita.fecha_hora)}</span>
                            <span style={{ color: '#c5ddf5' }}>↓</span>
                            <span>{formatHora(finCita.toISOString())}</span>
                          </div>

                          {/* Info cita */}
                          <div style={{ flex: 1, padding: '12px 12px 12px 0', minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                              <span style={{ fontSize: 14, fontWeight: 600, color: '#0d3d6e' }}>
                                {nombrePaciente(cita.paciente)}
                              </span>
                              <span style={{
                                display: 'inline-block', padding: '1px 8px', borderRadius: 20,
                                background: cfg.bg, color: cfg.color, fontSize: 11, fontWeight: 600,
                              }}>
                                {cfg.etiqueta}
                              </span>
                            </div>
                            <div style={{ fontSize: 12, color: '#5a8ab0', marginBottom: 6 }}>
                              {cita.tratamiento
                                ? <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <span style={{
                                      width: 8, height: 8, borderRadius: '50%',
                                      background: tratColor, flexShrink: 0, display: 'inline-block',
                                    }} />
                                    {(cita.tratamiento as unknown as { nombre: string }).nombre}
                                  </span>
                                : 'Sin tratamiento'}
                              {cita.dentista && (
                                <span style={{ marginLeft: 10 }}>
                                  · Dr(a). {(cita.dentista as unknown as { nombre: string; apellido: string | null }).nombre}{' '}
                                  {(cita.dentista as unknown as { apellido: string | null }).apellido ?? ''}
                                </span>
                              )}
                            </div>

                            {/* Acciones rápidas */}
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              {cita.estado === 'agendada' && (
                                <button
                                  onClick={() => cambiarEstado(cita.id, 'confirmada')}
                                  disabled={esActualizando}
                                  style={{
                                    height: 28, padding: '0 12px', fontSize: 12, fontWeight: 500,
                                    borderRadius: 6, border: '1px solid #1a6bbd',
                                    background: '#fff', color: '#1a6bbd', cursor: 'pointer',
                                    opacity: esActualizando ? 0.5 : 1,
                                  }}
                                >
                                  Confirmar
                                </button>
                              )}
                              {cita.estado === 'confirmada' && (
                                <button
                                  onClick={() => cambiarEstado(cita.id, 'en_curso')}
                                  disabled={esActualizando}
                                  style={{
                                    height: 28, padding: '0 12px', fontSize: 12, fontWeight: 500,
                                    borderRadius: 6, border: 'none',
                                    background: '#1a6bbd', color: '#fff', cursor: 'pointer',
                                    opacity: esActualizando ? 0.5 : 1,
                                  }}
                                >
                                  Iniciar
                                </button>
                              )}
                              {cita.estado === 'en_curso' && (
                                <button
                                  onClick={() => cambiarEstado(cita.id, 'completada')}
                                  disabled={esActualizando}
                                  style={{
                                    height: 28, padding: '0 12px', fontSize: 12, fontWeight: 500,
                                    borderRadius: 6, border: 'none',
                                    background: '#2ecc8a', color: '#fff', cursor: 'pointer',
                                    opacity: esActualizando ? 0.5 : 1,
                                  }}
                                >
                                  Completar
                                </button>
                              )}
                              {cita.estado === 'completada' && (
                                citasCobradas.has(cita.id) ? (
                                  <span style={{
                                    height: 28, padding: '0 12px', fontSize: 12, fontWeight: 600,
                                    borderRadius: 6, display: 'inline-flex', alignItems: 'center',
                                    background: '#e8fff5', color: '#0a5535',
                                  }}>
                                    ✓ Cobrado
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => router.push(`/cobros/nuevo?cita_id=${cita.id}&paciente_id=${cita.paciente_id}`)}
                                    style={{
                                      height: 28, padding: '0 12px', fontSize: 12, fontWeight: 500,
                                      borderRadius: 6, border: 'none',
                                      background: '#0d3d6e', color: '#fff', cursor: 'pointer',
                                    }}
                                  >
                                    💳 Cobrar
                                  </button>
                                )
                              )}
                              {(cita.estado === 'agendada' || cita.estado === 'confirmada') && (
                                <button
                                  onClick={() => cambiarEstado(cita.id, 'cancelada')}
                                  disabled={esActualizando}
                                  style={{
                                    height: 28, padding: '0 12px', fontSize: 12, fontWeight: 500,
                                    borderRadius: 6, border: '1px solid #e84040',
                                    background: '#fff', color: '#e84040', cursor: 'pointer',
                                    opacity: esActualizando ? 0.5 : 1,
                                  }}
                                >
                                  Cancelar
                                </button>
                              )}
                              {esActualizando && (
                                <span style={{ fontSize: 11, color: '#5a8ab0', alignSelf: 'center' }}>
                                  Actualizando...
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Precio */}
                          {cita.precio_acordado != null && (
                            <div style={{
                              padding: '12px 16px 12px 0', flexShrink: 0,
                              fontSize: 13, fontWeight: 600, color: '#0d3d6e',
                              display: 'flex', alignItems: 'flex-start',
                            }}>
                              Q {Number(cita.precio_acordado).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Panel lateral derecho */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Accesos rápidos */}
          <div style={{ background: '#fff', border: '0.5px solid #c5ddf5', borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#0d3d6e', marginBottom: 12 }}>
              Accesos rápidos
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Link
                href="/citas"
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                  background: '#f0f7ff', borderRadius: 8, border: '0.5px solid #c5ddf5',
                  color: '#0d3d6e', textDecoration: 'none', fontSize: 13, fontWeight: 500,
                  transition: 'background 0.15s',
                }}
              >
                <span style={{ fontSize: 16 }}>📅</span> + Nueva cita
              </Link>
              <Link
                href="/pacientes/nuevo"
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                  background: '#f0f7ff', borderRadius: 8, border: '0.5px solid #c5ddf5',
                  color: '#0d3d6e', textDecoration: 'none', fontSize: 13, fontWeight: 500,
                }}
              >
                <span style={{ fontSize: 16 }}>👤</span> + Nuevo paciente
              </Link>
              <Link
                href="/cobros/nuevo"
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                  background: '#f0f7ff', borderRadius: 8, border: '0.5px solid #c5ddf5',
                  color: '#0d3d6e', textDecoration: 'none', fontSize: 13, fontWeight: 500,
                }}
              >
                <span style={{ fontSize: 16 }}>💳</span> + Nuevo cobro
              </Link>
            </div>
          </div>

          {/* Alertas */}
          <div style={{ background: '#fff', border: '0.5px solid #c5ddf5', borderRadius: 12, padding: '16px 20px' }}>
            <div style={{
              fontSize: 14, fontWeight: 600, color: '#0d3d6e', marginBottom: 12,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              Alertas
              {totalAlertas > 0 && (
                <span style={{
                  background: '#e84040', color: '#fff', borderRadius: 20,
                  padding: '1px 7px', fontSize: 11, fontWeight: 700,
                }}>
                  {totalAlertas}
                </span>
              )}
            </div>

            {citasSinConfirmar > 0 && (
              <div style={{
                background: '#fff8e8', border: '0.5px solid #f0c040', borderRadius: 8,
                padding: '10px 12px', marginBottom: 8,
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#7a5500', marginBottom: 2 }}>
                  📅 {citasSinConfirmar} cita{citasSinConfirmar !== 1 ? 's' : ''} sin confirmar
                </div>
                <Link href="/citas" style={{ fontSize: 11, color: '#1a6bbd', textDecoration: 'underline' }}>
                  Ver citas de hoy
                </Link>
              </div>
            )}

            {cobrosFelPend > 0 && (
              <div style={{
                background: '#fff8e8', border: '0.5px solid #f0c040', borderRadius: 8,
                padding: '10px 12px', marginBottom: 8,
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#7a5500', marginBottom: 2 }}>
                  🧾 {cobrosFelPend} factura{cobrosFelPend !== 1 ? 's' : ''} FEL pendiente{cobrosFelPend !== 1 ? 's' : ''}
                </div>
                <Link href="/cobros" style={{ fontSize: 11, color: '#1a6bbd', textDecoration: 'underline' }}>
                  Ver cobros
                </Link>
              </div>
            )}

            {alertasInv.length > 0 && (
              <div style={{
                background: '#fff0f0', border: '0.5px solid #e84040', borderRadius: 8,
                padding: '10px 12px', marginBottom: 8,
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#7a1a1a', marginBottom: 6 }}>
                  📦 Inventario bajo mínimo
                </div>
                {alertasInv.slice(0, 4).map((a) => (
                  <div key={a.item_id} style={{
                    fontSize: 11, color: '#7a1a1a', display: 'flex',
                    justifyContent: 'space-between', marginBottom: 2,
                  }}>
                    <span>{a.nombre}</span>
                    <span style={{ fontWeight: 600 }}>
                      {a.stock_actual} {a.unidad_medida}
                    </span>
                  </div>
                ))}
                {alertasInv.length > 4 && (
                  <div style={{ fontSize: 11, color: '#7a1a1a', marginTop: 4 }}>
                    +{alertasInv.length - 4} más...
                  </div>
                )}
                <Link href="/inventario" style={{ fontSize: 11, color: '#e84040', textDecoration: 'underline', display: 'block', marginTop: 6 }}>
                  Ver inventario
                </Link>
              </div>
            )}

            {totalAlertas === 0 && (
              <div style={{ fontSize: 13, color: '#5a8ab0', textAlign: 'center', padding: '16px 0' }}>
                ✓ Sin alertas pendientes
              </div>
            )}
          </div>

          {/* Resumen del día */}
          {!cargandoCitas && citasHoy.length > 0 && (
            <div style={{ background: '#fff', border: '0.5px solid #c5ddf5', borderRadius: 12, padding: '16px 20px' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#0d3d6e', marginBottom: 12 }}>
                Resumen del día
              </div>
              {(['agendada', 'confirmada', 'en_curso', 'completada'] as const).map((estado) => {
                const cnt = citasHoy.filter((c) => c.estado === estado).length
                if (cnt === 0) return null
                const cfg = CONFIG_ESTADO[estado]
                return (
                  <div key={estado} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: 8,
                  }}>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: 20,
                      background: cfg.bg, color: cfg.color, fontSize: 11, fontWeight: 600,
                    }}>
                      {cfg.etiqueta}
                    </span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: '#0d3d6e' }}>{cnt}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

