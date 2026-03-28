# ClinicaApp — Guía de Desarrollo para Claude Code

## Contexto del Proyecto

SaaS multi-tenant para gestión de clínicas dentales y médicas en Guatemala.
Stack: Next.js 14 + TypeScript + Tailwind CSS + Supabase (PostgreSQL).
Mercado: Guatemala — español guatemalteco en toda la UI.
Desarrollador: Arturo Monterroso (Visual K) — analista senior, no programador activo.

---

## Identidad Visual — Clinical Trust

### Paleta de Colores

```
Primario:     #1a6bbd  (azul médico — botones principales, nav activo, links)
Primario dark:#0d3d6e  (navbar, headers, hover de primario)
Secundario:   #2ecc8a  (confirmaciones, estados activos, éxito)
Fondo base:   #f7faff  (fondo de páginas)
Fondo card:   #ffffff  (tarjetas y paneles)
Fondo input:  #f0f7ff  (inputs en reposo)
Texto primary:#0d3d6e  (títulos y texto principal)
Texto muted:  #5a8ab0  (labels, placeholders, texto secundario)
Borde:        #c5ddf5  (bordes de inputs y cards)
Warning:      #f0c040  (alertas, pendientes)
Error:        #e84040  (errores, cancelaciones)
```

### Tipografía

```
Fuente principal: Inter (Google Fonts)
Pesos: 400 (body), 500 (labels y subtítulos), 600 (títulos de sección)
Tamaños:
  - Título página:    24px / font-weight: 600
  - Título sección:   18px / font-weight: 600
  - Label campo:      13px / font-weight: 500 / color: #5a8ab0
  - Body / inputs:    14px / font-weight: 400
  - Texto pequeño:    12px / font-weight: 400
```

### Componentes Base

```
Border radius:
  - Botones:    8px
  - Inputs:     8px
  - Cards:      12px
  - Badges:     20px (pill)
  - Modal:      16px

Sombras: NINGUNA — diseño completamente plano
Bordes:  0.5px solid #c5ddf5 (siempre, nunca más grueso excepto focus)
Focus:   box-shadow: 0 0 0 3px rgba(26,107,189,0.15)
```

---

## Reglas de UI Obligatorias

### Navegación lateral (sidebar)
```
Fondo:          #0d3d6e
Texto items:    #a8c8e8 (inactivo) / #ffffff (activo)
Activo fondo:   #1a6bbd
Logo:           texto blanco, ícono azul claro
Ancho:          240px fijo en desktop
Mobile:         drawer overlay
```

### Formularios
```
- Label SIEMPRE arriba del campo, nunca placeholder como label
- Label: 13px / font-weight: 500 / color: #5a8ab0 / margin-bottom: 4px
- Input: altura 40px, border: 0.5px solid #c5ddf5, background: #ffffff
- Input focus: border-color: #1a6bbd, box-shadow: 0 0 0 3px rgba(26,107,189,0.15)
- Input error: border-color: #e84040, mensaje error en rojo debajo del campo
- Campos requeridos: asterisco rojo (*) junto al label
- Grupos de campos: separados por 16px verticalmente
- Secciones de formulario: separadas por 24px con línea divisoria sutil
```

### Botones
```
Primario:    bg:#1a6bbd  texto:#fff  hover:bg:#155a9e  border-radius:8px  h:40px  px:20px
Secundario:  bg:#ffffff  texto:#1a6bbd  border:1px solid #1a6bbd  hover:bg:#f0f7ff
Peligro:     bg:#e84040  texto:#fff  hover:bg:#c03030
Deshabilitado: opacity:0.5 cursor:not-allowed
Tamaño sm:   h:32px px:14px text:13px
Tamaño lg:   h:48px px:24px text:16px
```

### Tablas y Listas
```
Header:      bg:#f0f7ff  texto:#0d3d6e  font-weight:600  text:13px
Filas:       alternadas bg:#ffffff / bg:#f7faff
Hover fila:  bg:#e8f4ff
Borde:       0.5px solid #e0eef8 entre filas
Padding:     12px 16px por celda
```

### Cards / Paneles
```
bg: #ffffff
border: 0.5px solid #c5ddf5
border-radius: 12px
padding: 20px 24px
Header card: font-size:16px font-weight:600 color:#0d3d6e margin-bottom:16px
```

### Badges de Estado
```
Activo/Confirmado:  bg:#e8fff5  texto:#0a5535  
Pendiente:          bg:#fff8e8  texto:#7a5500
Cancelado:          bg:#fff0f0  texto:#7a1a1a
En curso:           bg:#e8f4ff  texto:#0d3d6e
Vencido:            bg:#f5e8ff  texto:#5a1a8a
```

### Métricas / KPI Cards
```
Layout: grid de 3-4 columnas en desktop, 2 en tablet, 1 en mobile
Card métrica: bg:#f0f7ff border:0.5px solid #c5ddf5 border-radius:8px padding:16px
Label métrica: 12px / color:#5a8ab0 / margin-bottom:4px
Número métrica: 28px / font-weight:600 / color:#0d3d6e
Cambio positivo: color:#2ecc8a con ▲
Cambio negativo: color:#e84040 con ▼
```

---

## Convenciones de Código

### Nombres de Archivos y Componentes
```
Componentes: PascalCase en español
  FormularioPaciente.tsx
  ListaCitas.tsx
  CalendarioAgenda.tsx
  TarjetaMetrica.tsx
  ModalConfirmacion.tsx

Páginas (app router):
  app/pacientes/page.tsx
  app/citas/page.tsx
  app/expediente/[id]/page.tsx

Hooks:
  usePacientes.ts
  useCitas.ts
  useEmpresa.ts

Utils:
  formatearFecha.ts
  calcularEdad.ts
  validarDPI.ts
```

### Comentarios y Variables
```
- Comentarios: en español
- Variables y funciones: camelCase en español
  const nombreCompleto = ...
  const fechaNacimiento = ...
  function calcularEdad(fechaNacimiento) ...
- Constantes: SCREAMING_SNAKE_CASE en español
  const ESTADOS_CITA = ['agendada', 'confirmada', 'completada']
```

### Mensajes al Usuario
```
- Todos en español guatemalteco natural
- Éxito: "Paciente registrado correctamente"
- Error genérico: "Ocurrió un error. Por favor intente de nuevo."
- Validación: "Este campo es requerido" / "Formato de DPI inválido"
- Confirmación borrar: "¿Está seguro que desea eliminar este registro?"
- Loading: "Cargando..." / "Guardando..."
- Sin resultados: "No se encontraron resultados"
```

---

## Estructura de Pantallas

### Layout Principal
```
┌─────────────────────────────────────────────┐
│  NAVBAR TOP (60px) — logo + usuario + org   │
├──────────┬──────────────────────────────────┤
│ SIDEBAR  │  CONTENIDO PRINCIPAL             │
│ (240px)  │  padding: 24px                   │
│ #0d3d6e  │  max-width: 1200px               │
│          │  bg: #f7faff                     │
└──────────┴──────────────────────────────────┘
```

### Página típica de módulo
```
1. Breadcrumb (Inicio > Pacientes > Nuevo)
2. Título de página + botón acción principal (derecha)
3. Filtros / búsqueda (si aplica)
4. Contenido (tabla, formulario, o cards)
5. Paginación (si aplica)
```

---

## Integración con Supabase

### Cliente
```typescript
// Siempre usar el cliente de @/lib/supabase
import { supabase } from '@/lib/supabase'

// Para operaciones del servidor usar createServerComponentClient
// Para operaciones del cliente usar createClientComponentClient
```

### Manejo de Errores
```typescript
// Siempre manejar errores de Supabase
const { data, error } = await supabase.from('pacientes').select('*')
if (error) {
  console.error('Error al cargar pacientes:', error)
  // Mostrar toast de error al usuario
  return
}
```

### Multi-tenancy
```
- NUNCA hacer queries sin filtrar por empresa_id
- El empresa_id siempre viene del contexto de autenticación
- RLS de Supabase es la segunda capa de seguridad
- Nunca exponer datos de otras empresas en el frontend
```

---

## Responsive Design

```
Mobile first — breakpoints Tailwind:
  sm:  640px  (tablet pequeña)
  md:  768px  (tablet)
  lg:  1024px (desktop)
  xl:  1280px (desktop grande)

Sidebar: oculto en mobile, drawer en sm/md, fijo en lg+
Tablas: scroll horizontal en mobile
Formularios: 1 columna en mobile, 2 columnas en md+
Grid métricas: 1 col mobile, 2 col sm, 3-4 col lg
```

---

## Lo que NO hacer

```
✗ Nunca usar gradientes en backgrounds
✗ Nunca usar sombras (box-shadow) excepto focus rings
✗ Nunca hardcodear colores fuera de esta guía
✗ Nunca usar inglés en la UI (labels, botones, mensajes)
✗ Nunca hacer queries sin empresa_id
✗ Nunca exponer la secret key de Supabase en el cliente
✗ Nunca usar any en TypeScript — definir tipos explícitos
✗ Nunca crear componentes sin considerar el estado de loading
✗ Nunca dejar formularios sin validación del lado cliente
```

---

## Contexto de Negocio

```
Usuarios del sistema:
  - admin: acceso total a su empresa
  - dentista: ve sus pacientes y agenda
  - recepcionista: agenda citas, registra pagos
  - asistente: acceso limitado a expediente

País: Guatemala
Moneda: Quetzales (Q) — formato: Q 1,250.00
Fechas: DD/MM/YYYY
Hora: 12h con AM/PM
Zona horaria: America/Guatemala (UTC-6, sin cambio de horario)
DPI: 13 dígitos numéricos
NIT: formato ######-# (7 dígitos + verificador)
```

---

*CLAUDE.md v1.0 — ClinicaApp · Visual K · Guatemala · Marzo 2026*
*Reemplazar este archivo cuando cambien las convenciones del proyecto*
