import { NextResponse } from 'next/server'

// Esta ruta fue reemplazada por /api/pacientes
// El módulo de pacientes ahora usa el cliente de Supabase directamente desde el frontend
export async function POST() {
  return NextResponse.json({ error: 'Use /api/pacientes' }, { status: 410 })
}
