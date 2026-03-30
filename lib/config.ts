// empresa_id y rol activo — en producción vienen del JWT/sesión de Supabase Auth
// Para desarrollo, configurar estas variables en .env.local
export const EMPRESA_ID   = process.env.NEXT_PUBLIC_EMPRESA_ID   ?? ''
export const SUCURSAL_ID  = process.env.NEXT_PUBLIC_SUCURSAL_ID  ?? ''
export const ROL_USUARIO  = process.env.NEXT_PUBLIC_ROL_USUARIO  ?? 'admin'
