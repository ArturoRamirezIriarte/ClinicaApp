'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { EMPRESA_ID } from '@/lib/config'

// ── Tipos ────────────────────────────────────────────────────────────────────

interface Paciente {
  id: string
  primer_nombre: string
  segundo_nombre: string | null
  primer_apellido: string
  segundo_apellido: string | null
}

interface CitaPaciente {
  id: string
  fecha_hora: string
  tratamiento_id: string | null
  precio_acordado: number | null
  tratamiento: { id: string; nombre: string; precio_base: number | null } | null
}

interface Tratamiento {
  id: string
  nombre: string
  precio_base: number | null
}

interface ItemCobro {
  _key: string
  descripcion: string
  tratamiento_id: string
  cantidad: number
  precio_unitario: number
  descuento_item: number
  subtotal: number
}

interface TotalesIVA {
  base_imponible: number
  iva_monto: number
  total: number
}

const METODOS_PAGO = [
  { value: 'efectivo',        label: 'Efectivo'        },
  { value: 'tarjeta_credito', label: 'Tarjeta de crédito' },
  { value: 'tarjeta_debito',  label: 'Tarjeta de débito'  },
  { value: 'transferencia',   label: 'Transferencia bancaria' },
  { value: 'cuota',           label: 'Plan de cuotas'  },
]

function nuevoItem(): ItemCobro {
  return {
    _key: crypto.randomUUID(),
    descripcion: '',
    tratamiento_id: '',
    cantidad: 1,
    precio_unitario: 0,
    descuento_item: 0,
    subtotal: 0,
  }
}

function calcularSubtotalItem(item: ItemCobro): number {
  return Math.max(item.cantidad * item.precio_unitario - item.descuento_item, 0)
}

function nombreCompleto(p: Paciente): string {
  return [p.primer_nombre, p.segundo_nombre, p.primer_apellido, p.segundo_apellido]
    .filter(Boolean).join(' ')
}

function formatQ(n: number): string {
  return `Q ${Number(n).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatFechaHora(iso: string): string {
  return new Date(iso).toLocaleString('es-GT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

// ── Estilo de campo ───────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', height: 40, padding: '0 12px', fontSize: 14,
  border: '0.5px solid #c5ddf5', borderRadius: 8, background: '#ffffff',
  color: '#0d3d6e', outline: 'none', boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 500, color: '#5a8ab0', marginBottom: 4,
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function FormularioNuevoCobro({
  citaIdPrefijado,
  pacienteIdPrefijado,
}: {
  citaIdPrefijado?: string
  pacienteIdPrefijado?: string
}) {
  const router = useRouter()

  // Datos de soporte
  const [pacientes, setPacientes]       = useState<Paciente[]>([])
  const [tratamientos, setTratamientos] = useState<Tratamiento[]>([])
  const [sucursalId, setSucursalId]     = useState<string | null>(null)
  const [usuarioId, setUsuarioId]       = useState<string | null>(null)

  // Selección de paciente
  const [busquedaPaciente, setBusquedaPaciente] = useState('')
  const [pacienteId, setPacienteId]             = useState(pacienteIdPrefijado ?? '')
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<Paciente | null>(null)
  const [mostrarDropPaciente, setMostrarDropPaciente]   = useState(false)

  // Cita opcional
  const [citasPaciente, setCitasPaciente] = useState<CitaPaciente[]>([])
  const [citaId, setCitaId]               = useState(citaIdPrefijado ?? '')

  // Items
  const [items, setItems] = useState<ItemCobro[]>([nuevoItem()])

  // Descuento global
  const [descuentoGlobal, setDescuentoGlobal] = useState(0)

  // Totales (calculados vía RPC)
  const [totales, setTotales]         = useState<TotalesIVA>({ base_imponible: 0, iva_monto: 0, total: 0 })
  const [calculando, setCalculando]   = useState(false)

  // Pago
  const [metodoPago, setMetodoPago]       = useState('efectivo')
  const [referenciaPago, setReferenciaPago] = useState('')

  // Cuotas
  const [numeroCuotas, setNumeroCuotas] = useState(2)
  const [diaCobro, setDiaCobro]         = useState(1)
  const montoCuota = totales.total > 0 && numeroCuotas > 0
    ? Math.round((totales.total / numeroCuotas) * 100) / 100
    : 0

  // Estado de guardado
  const [guardando, setGuardando] = useState(false)
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)

  // ── Carga inicial ────────────────────────────────────────────────────

  useEffect(() => {
    async function cargar() {
      const [{ data: pacs }, { data: tratos }, { data: suc }, { data: usr }] = await Promise.all([
        supabase
          .from('pacientes')
          .select('id, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido')
          .eq('empresa_id', EMPRESA_ID)
          .eq('activo', true)
          .order('primer_apellido')
          .limit(200),
        supabase
          .from('tratamiento_tipos')
          .select('id, nombre, precio_base')
          .eq('empresa_id', EMPRESA_ID)
          .eq('activo', true)
          .order('nombre'),
        supabase
          .from('sucursales')
          .select('id')
          .eq('empresa_id', EMPRESA_ID)
          .limit(1)
          .single(),
        supabase
          .from('usuarios')
          .select('id')
          .eq('empresa_id', EMPRESA_ID)
          .limit(1)
          .single(),
      ])

      setPacientes((pacs as Paciente[]) ?? [])
      setTratamientos((tratos as Tratamiento[]) ?? [])
      if (suc) setSucursalId(suc.id)
      if (usr) setUsuarioId(usr.id)

      // Si viene paciente prefijado, seleccionarlo
      if (pacienteIdPrefijado && pacs) {
        const p = (pacs as Paciente[]).find((x) => x.id === pacienteIdPrefijado)
        if (p) {
          setPacienteSeleccionado(p)
          setBusquedaPaciente(nombreCompleto(p))
        }
      }
    }
    cargar()
  }, [pacienteIdPrefijado])

  // ── Cálculo IVA (RPC) — declarado antes de los useEffects que lo usan ──

  const recalcularTotales = useCallback(async (nuevosItems: ItemCobro[], desc: number) => {
    const subtotal = nuevosItems.reduce((s, i) => s + calcularSubtotalItem(i), 0)
    if (subtotal <= 0) {
      setTotales({ base_imponible: 0, iva_monto: 0, total: 0 })
      return
    }
    setCalculando(true)
    try {
      const { data } = await supabase.rpc('clinica_calcular_iva', {
        p_empresa_id: EMPRESA_ID,
        p_subtotal:   subtotal,
        p_descuento:  desc,
      })
      if (data && data[0]) {
        setTotales({
          base_imponible: Number(data[0].base_imponible),
          iva_monto:      Number(data[0].iva_monto),
          total:          Number(data[0].total),
        })
      }
    } catch (e) {
      console.error('Error al calcular IVA:', e)
    } finally {
      setCalculando(false)
    }
  }, [])

  // ── Citas del paciente seleccionado ─────────────────────────────────

  useEffect(() => {
    if (!pacienteId) { setCitasPaciente([]); return }
    async function cargarCitas() {
      const { data } = await supabase
        .from('citas')
        .select('id, fecha_hora, tratamiento_id, precio_acordado, tratamiento:tratamiento_tipos!tratamiento_id(id, nombre, precio_base)')
        .eq('empresa_id', EMPRESA_ID)
        .eq('paciente_id', pacienteId)
        .in('estado', ['completada', 'en_curso'])
        .order('fecha_hora', { ascending: false })
        .limit(20)
      setCitasPaciente((data as unknown as CitaPaciente[]) ?? [])
    }
    cargarCitas()
  }, [pacienteId])

  // Si viene cita prefijada, precargar paciente + primer ítem
  useEffect(() => {
    if (!citaIdPrefijado) return
    async function cargarCita() {
      const { data } = await supabase
        .from('citas')
        .select('paciente_id, tratamiento_id, precio_acordado, tratamiento:tratamiento_tipos!tratamiento_id(id, nombre, precio_base)')
        .eq('id', citaIdPrefijado)
        .single()
      if (!data) return

      // Solo actualizar pacienteId si no vino prefijado por URL
      if (!pacienteIdPrefijado) setPacienteId(data.paciente_id)

      const trat = data.tratamiento as unknown as { id: string; nombre: string; precio_base: number | null } | null
      if (trat) {
        // precio_acordado tiene prioridad; si es null, usar precio_base del tratamiento
        const precio = data.precio_acordado != null
          ? Number(data.precio_acordado)
          : (trat.precio_base ?? 0)

        const itemPrefijado: ItemCobro = {
          ...nuevoItem(),
          descripcion:     trat.nombre,
          tratamiento_id:  data.tratamiento_id ?? '',
          precio_unitario: precio,
          subtotal:        precio,
        }
        setItems([itemPrefijado])
        recalcularTotales([itemPrefijado], 0)
      }
    }
    cargarCita()
  }, [citaIdPrefijado, pacienteIdPrefijado, recalcularTotales])

  // ── Handlers de items ────────────────────────────────────────────────

  function actualizarItem(key: string, cambios: Partial<ItemCobro>) {
    setItems((prev) => {
      const nuevos = prev.map((item) => {
        if (item._key !== key) return item
        const actualizado = { ...item, ...cambios }
        actualizado.subtotal = calcularSubtotalItem(actualizado)
        return actualizado
      })
      recalcularTotales(nuevos, descuentoGlobal)
      return nuevos
    })
  }

  function seleccionarTratamiento(key: string, tratamientoId: string) {
    const trat = tratamientos.find((t) => t.id === tratamientoId)
    if (!trat) { actualizarItem(key, { tratamiento_id: tratamientoId }); return }
    actualizarItem(key, {
      tratamiento_id:  tratamientoId,
      descripcion:     trat.nombre,
      precio_unitario: trat.precio_base ?? 0,
    })
  }

  function agregarItem() {
    setItems((prev) => [...prev, nuevoItem()])
  }

  function eliminarItem(key: string) {
    setItems((prev) => {
      const nuevos = prev.filter((i) => i._key !== key)
      recalcularTotales(nuevos, descuentoGlobal)
      return nuevos
    })
  }

  // ── Seleccionar cita y auto-rellenar primer ítem ─────────────────────

  function seleccionarCita(id: string) {
    setCitaId(id)
    if (!id) return
    const cita = citasPaciente.find((c) => c.id === id)
    if (!cita || !cita.tratamiento) return
    const precio = cita.precio_acordado != null
      ? Number(cita.precio_acordado)
      : (cita.tratamiento.precio_base ?? 0)
    const itemPrefijado: ItemCobro = {
      ...nuevoItem(),
      descripcion:     cita.tratamiento.nombre,
      tratamiento_id:  cita.tratamiento_id ?? '',
      precio_unitario: precio,
      subtotal:        precio,
    }
    // Reemplaza el primer ítem; conserva los demás si ya existen
    const nuevosItems = [itemPrefijado, ...items.slice(1)]
    setItems(nuevosItems)
    recalcularTotales(nuevosItems, descuentoGlobal)
  }

  function cambiarDescuentoGlobal(valor: number) {
    setDescuentoGlobal(valor)
    recalcularTotales(items, valor)
  }

  // ── Guardar ──────────────────────────────────────────────────────────

  async function guardar() {
    setErrorGeneral(null)

    // Validaciones
    if (!pacienteId) { setErrorGeneral('Debe seleccionar un paciente.'); return }
    if (!sucursalId) { setErrorGeneral('No se encontró sucursal para esta empresa.'); return }
    if (items.length === 0 || items.every((i) => !i.descripcion.trim())) {
      setErrorGeneral('Debe agregar al menos un ítem con descripción.')
      return
    }
    if (totales.total <= 0) { setErrorGeneral('El total debe ser mayor a Q 0.00.'); return }
    if (metodoPago === 'cuota' && numeroCuotas < 2) {
      setErrorGeneral('El plan de cuotas requiere al menos 2 cuotas.')
      return
    }

    setGuardando(true)
    try {
      const subtotalGlobal = items.reduce((s, i) => s + calcularSubtotalItem(i), 0)

      // 1. INSERT cobro
      const { data: cobro, error: errCobro } = await supabase
        .from('cobros')
        .insert({
          empresa_id:     EMPRESA_ID,
          sucursal_id:    sucursalId,
          paciente_id:    pacienteId,
          cita_id:        citaId || null,
          subtotal:       subtotalGlobal,
          descuento:      descuentoGlobal,
          base_imponible: totales.base_imponible,
          iva_monto:      totales.iva_monto,
          total:          totales.total,
          metodo_pago:    metodoPago,
          referencia_pago: referenciaPago.trim() || null,
          numero_cuota:   metodoPago === 'cuota' ? 1 : null,
          total_cuotas:   metodoPago === 'cuota' ? numeroCuotas : null,
          estado:         'pagado',
          registrado_por: usuarioId,
          fecha_cobro:    new Date().toISOString().split('T')[0],
        })
        .select('id, numero_cobro')
        .single()

      if (errCobro) throw errCobro

      // 2. INSERT cobro_items
      const itemsInsert = items
        .filter((i) => i.descripcion.trim())
        .map((i) => ({
          cobro_id:        cobro.id,
          tratamiento_id:  i.tratamiento_id || null,
          descripcion:     i.descripcion.trim(),
          cantidad:        i.cantidad,
          precio_unitario: i.precio_unitario,
          descuento_item:  i.descuento_item,
          subtotal:        calcularSubtotalItem(i),
        }))

      const { error: errItems } = await supabase.from('cobro_items').insert(itemsInsert)
      if (errItems) throw errItems

      // 3. Si es cuota: INSERT planes_pago
      if (metodoPago === 'cuota') {
        const descripcionPlan = items.filter((i) => i.descripcion.trim()).map((i) => i.descripcion).join(', ')
        const { data: plan, error: errPlan } = await supabase
          .from('planes_pago')
          .insert({
            empresa_id:    EMPRESA_ID,
            paciente_id:   pacienteId,
            cita_id:       citaId || null,
            descripcion:   descripcionPlan,
            monto_total:   totales.total,
            numero_cuotas: numeroCuotas,
            monto_cuota:   montoCuota,
            dia_cobro:     diaCobro,
            monto_pagado:  montoCuota,
            creado_por:    usuarioId,
          })
          .select('id')
          .single()

        if (errPlan) throw errPlan

        // Vincular cobro al plan
        await supabase
          .from('cobros')
          .update({ plan_pago_id: plan.id })
          .eq('id', cobro.id)
          .eq('empresa_id', EMPRESA_ID)
      }

      router.push('/cobros')
    } catch (e) {
      console.error('Error al guardar cobro:', e)
      setErrorGeneral('Ocurrió un error al guardar el cobro. Por favor intente de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  // ── Filtro de pacientes en dropdown ──────────────────────────────────

  const pacientesFiltrados = busquedaPaciente.length >= 1
    ? pacientes.filter((p) =>
        nombreCompleto(p).toLowerCase().includes(busquedaPaciente.toLowerCase())
      ).slice(0, 8)
    : []

  const subtotalGlobal = items.reduce((s, i) => s + calcularSubtotalItem(i), 0)

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 16, fontSize: 13, color: '#5a8ab0' }}>
        <a href="/cobros" style={{ color: '#1a6bbd', textDecoration: 'none' }}>Cobros</a>
        {' › '}
        <span style={{ color: '#0d3d6e' }}>Nuevo cobro</span>
      </div>

      <h1 style={{ fontSize: 24, fontWeight: 600, color: '#0d3d6e', margin: '0 0 24px' }}>
        Nuevo Cobro
      </h1>

      {errorGeneral && (
        <div style={{
          background: '#fff0f0', border: '0.5px solid #e84040', borderRadius: 8,
          padding: '12px 16px', color: '#e84040', fontSize: 13, marginBottom: 20,
        }}>
          {errorGeneral}
        </div>
      )}

      <div style={{
        background: '#ffffff', border: '0.5px solid #c5ddf5',
        borderRadius: 12, padding: '24px', marginBottom: 20,
      }}>

        {/* ── Sección paciente ──────────────────────────── */}
        <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: '0.5px solid #e0eef8' }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#0d3d6e', marginBottom: 16 }}>
            Paciente
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Búsqueda de paciente */}
            <div style={{ position: 'relative' }}>
              <label style={labelStyle}>
                Paciente <span style={{ color: '#e84040' }}>*</span>
              </label>
              <input
                type="text"
                value={busquedaPaciente}
                onChange={(e) => {
                  setBusquedaPaciente(e.target.value)
                  setMostrarDropPaciente(true)
                  if (!e.target.value) {
                    setPacienteId('')
                    setPacienteSeleccionado(null)
                    setCitaId('')
                  }
                }}
                onFocus={() => setMostrarDropPaciente(true)}
                placeholder="Buscar paciente por nombre..."
                style={inputStyle}
                autoComplete="off"
              />
              {pacienteSeleccionado && (
                <div style={{
                  marginTop: 4, fontSize: 12, color: '#0a5535',
                  background: '#e8fff5', padding: '3px 8px', borderRadius: 6,
                  display: 'inline-block',
                }}>
                  ✓ {nombreCompleto(pacienteSeleccionado)}
                </div>
              )}
              {mostrarDropPaciente && pacientesFiltrados.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                  background: '#fff', border: '0.5px solid #c5ddf5', borderRadius: 8,
                  boxShadow: '0 4px 16px rgba(13,61,110,0.12)', marginTop: 2, maxHeight: 220, overflowY: 'auto',
                }}>
                  {pacientesFiltrados.map((p) => (
                    <button
                      key={p.id}
                      onMouseDown={() => {
                        setPacienteId(p.id)
                        setPacienteSeleccionado(p)
                        setBusquedaPaciente(nombreCompleto(p))
                        setMostrarDropPaciente(false)
                      }}
                      style={{
                        display: 'block', width: '100%', padding: '9px 14px',
                        background: 'none', border: 'none', cursor: 'pointer',
                        textAlign: 'left', fontSize: 13, color: '#0d3d6e',
                        borderBottom: '0.5px solid #f0f7ff',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f7ff')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                    >
                      {nombreCompleto(p)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Cita opcional */}
            <div>
              <label style={labelStyle}>Cita asociada (opcional)</label>
              <select
                value={citaId}
                onChange={(e) => seleccionarCita(e.target.value)}
                disabled={!pacienteId}
                style={{ ...inputStyle, cursor: pacienteId ? 'pointer' : 'not-allowed', opacity: pacienteId ? 1 : 0.5 }}
              >
                <option value="">— Sin cita específica —</option>
                {citasPaciente.map((c) => (
                  <option key={c.id} value={c.id}>
                    {formatFechaHora(c.fecha_hora)}
                    {c.tratamiento ? ` · ${c.tratamiento.nombre}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ── Sección ítems ─────────────────────────────── */}
        <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: '0.5px solid #e0eef8' }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#0d3d6e', marginBottom: 16 }}>
            Ítems del cobro
          </div>

          {/* Cabecera tabla */}
          <div style={{
            display: 'grid', gap: 8, marginBottom: 8,
            gridTemplateColumns: '2fr 1.5fr 60px 120px 100px 90px 36px',
          }}>
            {['Descripción', 'Tratamiento', 'Cant.', 'Precio (IVA inc.)', 'Descuento', 'Subtotal', ''].map((h) => (
              <div key={h} style={{ fontSize: 11, fontWeight: 700, color: '#5a8ab0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {h}
              </div>
            ))}
          </div>

          {items.map((item) => (
            <div key={item._key} style={{
              display: 'grid', gap: 8, marginBottom: 8, alignItems: 'center',
              gridTemplateColumns: '2fr 1.5fr 60px 120px 100px 90px 36px',
            }}>
              {/* Descripción */}
              <input
                type="text"
                value={item.descripcion}
                onChange={(e) => actualizarItem(item._key, { descripcion: e.target.value })}
                placeholder="Ej: Limpieza dental"
                style={{ ...inputStyle, height: 36 }}
              />
              {/* Tratamiento */}
              <select
                value={item.tratamiento_id}
                onChange={(e) => seleccionarTratamiento(item._key, e.target.value)}
                style={{ ...inputStyle, height: 36, cursor: 'pointer' }}
              >
                <option value="">— Seleccionar —</option>
                {tratamientos.map((t) => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </select>
              {/* Cantidad */}
              <input
                type="number"
                min={1}
                value={item.cantidad}
                onChange={(e) => actualizarItem(item._key, { cantidad: Math.max(1, Number(e.target.value)) })}
                style={{ ...inputStyle, height: 36, textAlign: 'center' }}
              />
              {/* Precio unitario */}
              <input
                type="number"
                min={0}
                step="0.01"
                value={item.precio_unitario}
                onChange={(e) => actualizarItem(item._key, { precio_unitario: Math.max(0, Number(e.target.value)) })}
                style={{ ...inputStyle, height: 36, textAlign: 'right' }}
              />
              {/* Descuento */}
              <input
                type="number"
                min={0}
                step="0.01"
                value={item.descuento_item}
                onChange={(e) => actualizarItem(item._key, { descuento_item: Math.max(0, Number(e.target.value)) })}
                style={{ ...inputStyle, height: 36, textAlign: 'right' }}
              />
              {/* Subtotal (readonly) */}
              <div style={{
                height: 36, display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                fontSize: 14, fontWeight: 600, color: '#0d3d6e',
              }}>
                {formatQ(calcularSubtotalItem(item))}
              </div>
              {/* Eliminar */}
              <button
                onClick={() => eliminarItem(item._key)}
                disabled={items.length === 1}
                style={{
                  height: 36, width: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'none', border: '0.5px solid #e0eef8', borderRadius: 6, cursor: 'pointer',
                  color: '#e84040', fontSize: 16, opacity: items.length === 1 ? 0.3 : 1,
                }}
              >
                ×
              </button>
            </div>
          ))}

          <button
            onClick={agregarItem}
            style={{
              marginTop: 8, padding: '7px 14px', background: 'none',
              border: '0.5px dashed #c5ddf5', borderRadius: 8, cursor: 'pointer',
              fontSize: 13, color: '#1a6bbd', fontWeight: 500,
            }}
          >
            + Agregar ítem
          </button>
        </div>

        {/* ── Sección totales ───────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24, paddingBottom: 24, borderBottom: '0.5px solid #e0eef8' }}>
          <div style={{ width: 340 }}>
            {/* Subtotal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 14 }}>
              <span style={{ color: '#5a8ab0' }}>Subtotal</span>
              <span style={{ fontWeight: 500, color: '#0d3d6e' }}>{formatQ(subtotalGlobal)}</span>
            </div>
            {/* Descuento global */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 14, color: '#5a8ab0' }}>Descuento global (Q)</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={descuentoGlobal}
                onChange={(e) => cambiarDescuentoGlobal(Math.max(0, Number(e.target.value)))}
                style={{ ...inputStyle, width: 120, height: 32, textAlign: 'right', fontSize: 13 }}
              />
            </div>
            {/* Base imponible */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
              <span style={{ color: '#5a8ab0' }}>Base imponible</span>
              <span style={{ color: '#0d3d6e' }}>{calculando ? '...' : formatQ(totales.base_imponible)}</span>
            </div>
            {/* IVA */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 13 }}>
              <span style={{ color: '#5a8ab0' }}>IVA (5% incluido)</span>
              <span style={{ color: '#0d3d6e' }}>{calculando ? '...' : formatQ(totales.iva_monto)}</span>
            </div>
            {/* Total */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              paddingTop: 10, borderTop: '1.5px solid #1a6bbd',
            }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: '#0d3d6e' }}>TOTAL</span>
              <span style={{ fontSize: 22, fontWeight: 700, color: '#1a6bbd' }}>
                {calculando ? '...' : formatQ(totales.total)}
              </span>
            </div>
          </div>
        </div>

        {/* ── Sección pago ──────────────────────────────── */}
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#0d3d6e', marginBottom: 16 }}>
            Forma de pago
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Método */}
            <div>
              <label style={labelStyle}>
                Método de pago <span style={{ color: '#e84040' }}>*</span>
              </label>
              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                {METODOS_PAGO.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            {/* Referencia */}
            {metodoPago !== 'efectivo' && (
              <div>
                <label style={labelStyle}>Referencia / No. autorización</label>
                <input
                  type="text"
                  value={referenciaPago}
                  onChange={(e) => setReferenciaPago(e.target.value)}
                  placeholder="Ej: 4520, autorización 12345..."
                  style={inputStyle}
                />
              </div>
            )}
          </div>

          {/* Cuotas */}
          {metodoPago === 'cuota' && (
            <div style={{
              marginTop: 16, padding: '16px', background: '#f0f7ff',
              borderRadius: 8, border: '0.5px solid #c5ddf5',
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#0d3d6e', marginBottom: 14 }}>
                Configuración del plan de cuotas
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>
                    Número de cuotas <span style={{ color: '#e84040' }}>*</span>
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={60}
                    value={numeroCuotas}
                    onChange={(e) => setNumeroCuotas(Math.max(2, Number(e.target.value)))}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Monto por cuota</label>
                  <div style={{
                    height: 40, padding: '0 12px', fontSize: 14, display: 'flex',
                    alignItems: 'center', fontWeight: 600, color: '#1a6bbd',
                    background: '#ffffff', border: '0.5px solid #c5ddf5', borderRadius: 8,
                  }}>
                    {formatQ(montoCuota)}
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Día de cobro (1-31)</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={diaCobro}
                    onChange={(e) => setDiaCobro(Math.max(1, Math.min(31, Number(e.target.value))))}
                    style={inputStyle}
                  />
                </div>
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: '#5a8ab0' }}>
                Se creará un plan de {numeroCuotas} cuotas de {formatQ(montoCuota)} cada una, con cobro el día {diaCobro} de cada mes.
                La primera cuota se registra ahora.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Botones */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <button
          onClick={() => router.push('/cobros')}
          className="ct-btn ct-btn-secondary"
        >
          Cancelar
        </button>
        <button
          onClick={guardar}
          disabled={guardando || !pacienteId || totales.total <= 0}
          className="ct-btn ct-btn-primary"
          style={{ opacity: (guardando || !pacienteId || totales.total <= 0) ? 0.5 : 1 }}
        >
          {guardando ? 'Guardando...' : '💳 Registrar Cobro'}
        </button>
      </div>
    </div>
  )
}
