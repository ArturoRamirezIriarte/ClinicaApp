import { supabase } from '@/lib/supabase'
import { permisosVacios, guardarPermisos, type Modulo } from '@/lib/permisos'

export async function cargarYGuardarPermisos(
  empresaId: string,
  rol: string
): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('rol_permisos')
      .select('modulo, permitido')
      .eq('empresa_id', empresaId)
      .eq('rol', rol)
      .eq('accion', 'ver')

    if (error) {
      console.error('Error al cargar permisos:', error)
      return
    }

    const permisos = permisosVacios()
    permisos.rol = rol

    for (const fila of data ?? []) {
      const modulo = fila.modulo as Modulo
      if (modulo in permisos.modulos) {
        permisos.modulos[modulo] = fila.permitido ?? false
      }
    }

    guardarPermisos(permisos)
  } catch (error) {
    console.error('Error inesperado al cargar permisos:', error)
  }
}
