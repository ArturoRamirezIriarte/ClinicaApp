// ── Tipos ──────────────────────────────────────────────────────────────────

export type Modulo =
  | 'dashboard'
  | 'pacientes'
  | 'agenda'
  | 'expediente'
  | 'cobros'
  | 'contabilidad'
  | 'inventario'
  | 'medicos'
  | 'reportes'
  | 'configuracion'

export interface PermisosUsuario {
  rol: string
  modulos: Record<Modulo, boolean>
}

// ── Constantes ─────────────────────────────────────────────────────────────

const TODOS_MODULOS: Modulo[] = [
  'dashboard',
  'pacientes',
  'agenda',
  'expediente',
  'cobros',
  'contabilidad',
  'inventario',
  'medicos',
  'reportes',
  'configuracion',
]

const STORAGE_KEY = 'clinica_permisos'

// ── Funciones exportadas ───────────────────────────────────────────────────

export function permisosVacios(): PermisosUsuario {
  const modulos = Object.fromEntries(
    TODOS_MODULOS.map((m) => [m, false])
  ) as Record<Modulo, boolean>
  return { rol: '', modulos }
}

export function guardarPermisos(permisos: PermisosUsuario): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(permisos))
  } catch {
    // localStorage no disponible (SSR u otros entornos)
  }
}

export function leerPermisos(): PermisosUsuario {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return permisosVacios()
    return JSON.parse(raw) as PermisosUsuario
  } catch {
    return permisosVacios()
  }
}

export function puedeVer(modulo: Modulo): boolean {
  return leerPermisos().modulos[modulo]
}
