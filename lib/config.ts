// empresa_id activo — en producción viene del contexto de autenticación (JWT/sesión)
// Para desarrollo, configurar NEXT_PUBLIC_EMPRESA_ID en .env.local
export const EMPRESA_ID   = process.env.NEXT_PUBLIC_EMPRESA_ID   ?? ''
export const SUCURSAL_ID  = process.env.NEXT_PUBLIC_SUCURSAL_ID  ?? ''
