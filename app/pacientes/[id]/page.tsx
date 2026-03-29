import PerfilPaciente from '@/components/PerfilPaciente'

export default async function PaginaPerfilPaciente({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <PerfilPaciente pacienteId={id} />
}
