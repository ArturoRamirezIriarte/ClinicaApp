import ExpedienteCita from '@/components/ExpedienteCita'

export default async function PaginaExpedienteCita({
  params,
}: {
  params: Promise<{ cita_id: string }>
}) {
  const { cita_id } = await params
  return <ExpedienteCita citaId={cita_id} />
}
