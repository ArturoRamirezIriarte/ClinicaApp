import FormularioNuevoCobro from '@/components/FormularioNuevoCobro'

export default async function PaginaNuevoCobro({
  searchParams,
}: {
  searchParams: Promise<{ cita_id?: string; paciente_id?: string }>
}) {
  const { cita_id, paciente_id } = await searchParams
  return (
    <FormularioNuevoCobro
      citaIdPrefijado={cita_id}
      pacienteIdPrefijado={paciente_id}
    />
  )
}
