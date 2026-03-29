# Proyecto SaaS — Definición de Arquitectura y Alcance
**Arturo Ramirez · Strategic Solutions · Guatemala**
*Versión 4.0 — Marzo 2026*

> **Cambios v4.0:** Schema completo de ClinicaApp definido y documentado. Incluye suscripciones, pacientes, citas, expediente clínico, odontograma por caras con historial, cobros, FEL SAT Guatemala, inventario, notificaciones y seguridad multicapa. ClinicaApp se desarrolla primero.

---

## 1. Visión General

| Aplicación | Dominio | Secuencia |
|---|---|---|
| **ClinicaApp** | Gestión de clínicas médicas y dentales | **PRIMERO** |
| **CreditoApp** | Control de créditos y cartera | Segundo — post piloto ClinicaApp |

---

## 2. Perfil del Desarrollador

| Atributo | Detalle |
|---|---|
| Experiencia | 20+ años en tecnología — análisis y dirección |
| Dominio técnico | Modelado de datos, SQL/PostgreSQL, T-SQL, stored procedures |
| Programación activa | Sin práctica reciente (último rol: Informix 4GL años 90) |
| Disponibilidad | 6-8h fines de semana + Semana Santa 12h extra |
| Horas mensuales | ~26-32h/mes |
| Equipo | Solo — sin soporte técnico externo |
| Herramienta | VS Code + Claude Code (Claude Pro $20/mes) |

---

## 3. Stack Tecnológico

### 3.1 Fase Desarrollo y Piloto — Cloud Gratuito

| Capa | Herramienta | Costo |
|---|---|---|
| Base de datos | Supabase cloud (free: 500MB, 2 proyectos) | $0 |
| UI / Frontend | Budibase cloud (free: 5 apps) | $0 |
| Lógica de negocio | PostgreSQL Functions + PL/pgSQL | $0 |
| Desarrollo | VS Code + Claude Code | $20/mes |

### 3.2 Fase Producción (mes 7-8, con 3-5 clientes pagando)

| Componente | Costo/mes |
|---|---|
| VPS DigitalOcean 4GB/2vCPU/80GB | $24 |
| Backups DO | $5 |
| Dominio .com | $1 |
| SSL Let's Encrypt | $0 |
| Email Brevo | $0 |
| Claude Pro + Code | $20 |
| **Total** | **$50/mes** |

### 3.3 Rol de Cada Herramienta

| Herramienta | Usar para | NO usar para |
|---|---|---|
| VS Code + Claude Code | PL/pgSQL, stored procedures, RLS, scripts SQL | UI, formularios |
| Supabase | Tablas, RLS, API REST, dashboard SQL | Lógica compleja |
| Budibase | Formularios, búsquedas, dashboards | Cálculos, scoring |

### 3.4 Naming Conventions SQL

- ClinicaApp: `clinica_[accion]_[entidad]`
- CreditoApp: `credito_[accion]_[entidad]`

### 3.5 Multi-Tenancy

Schema separado por cliente en PostgreSQL. Cada empresa = su propio schema.

---

## 4. Seguridad — 3 Capas

### 4.1 Arquitectura de Seguridad

```
Capa 1: Supabase Auth     → quién eres (JWT token)
Capa 2: RLS PostgreSQL    → qué puedes ver
Capa 3: empresa_id        → de quién son los datos
```

### 4.2 Flujo Completo

```
Usuario hace login
        ↓
Supabase valida credenciales
Genera JWT: { uid: "abc-123" }
        ↓
JWT acompaña CADA consulta
        ↓
PostgreSQL intercepta via RLS:
  empresa_id = (
    SELECT empresa_id FROM usuarios
    WHERE supabase_uid = auth.uid()
  )
        ↓
Usuario ve SOLO datos de su empresa
```

### 4.3 empresa_id en Tablas

`empresa_id` existe en TODAS las tablas. `usuario_id` solo donde agrega valor:

| Tabla | empresa_id | usuario tracking |
|---|---|---|
| pacientes | ✓ | creado_por |
| citas | ✓ | dentista_id + creado_por |
| expediente_notas | ✓ | creado_por + editado_por |
| cobros | ✓ | registrado_por |
| odontograma | ✓ | actualizado_por |
| inventario_movimientos | ✓ | registrado_por |

---

## 5. Modelo de Negocio — ClinicaApp

### 5.1 Planes

| | Estándar | Pro | Enterprise |
|---|---|---|---|
| **Precio/mes** | Q250 | Q499 | Negociado |
| **Sucursales** | 1 | Hasta 3 | Ilimitadas |
| **Usuarios incluidos** | 5 | 5 por sucursal | Negociado |
| **Usuario extra** | +Q15/mes | +Q25/mes | Negociado |
| **Espacios/sillones** | 3 | 3 por sucursal | Negociado |
| **Agenda y citas** | ✓ | ✓ | ✓ |
| **Expediente + odontograma** | ✓ | ✓ | ✓ |
| **FEL SAT Guatemala** | ✓ | ✓ | ✓ |
| **Inventario** | — | ✓ | ✓ |
| **Multi-sucursal** | — | ✓ | ✓ |
| **Reportería avanzada** | — | — | ✓ |
| **Prueba gratuita** | 30 días sin tarjeta | 30 días | 30 días |

**Perfil usuarios Estándar:** 3 dentistas + 1 recepcionista + 1 asistente = 5 base.
**Clínicas con más de 3 sucursales:** plan Enterprise con precio negociado caso por caso.

### 5.2 Notificaciones — Opción C (Brevo)

Emails salen desde: `Clínica Dental López <citas@clinicaapp.com>`
El nombre cambia por clínica, el dominio es siempre del SaaS.

**Eventos que disparan notificación:**
- Confirmación al agendar
- Recordatorio configurable (default 24h antes)
- Recordatorio configurable (default 2h antes)
- Aviso de cancelación
- Aviso de reprogramación
- Aviso de espacio disponible (lista de espera)

**Canales:** Email (inmediato) + WhatsApp Business API (v1.1)

### 5.3 FEL SAT Guatemala

**Certificador:** abierto — cada clínica elige (INFILE recomendado)
**Facturación en cuotas:** una factura FEL por cada cuota al momento del pago
**Tipos de documento:** FACT / NCRE (nota crédito) / NDEB (nota débito)
**Régimen:** configurable por empresa (general 12% / pequeño contribuyente 5%)

### 5.4 Pagos de la Plataforma

**Arranque:** transferencia bancaria manual → tú ejecutas `clinica_renovar_suscripcion()`
**Futuro (15+ clientes):** Stripe + Lulubit (cuenta virtual USA)

### 5.5 Autoagendamiento

**v1.0:** Solo recepcionista agenda desde Budibase
**v1.1:** URL pública por clínica: `citas.clinicaapp.com/{slug}`
- Cada clínica tiene slug único
- Paciente ve solo la clínica de esa URL
- Aislamiento por RLS — imposible ver datos de otra clínica

---

## 6. Schema SQL Completo — ClinicaApp

### 6.1 Suscripciones y Tenants

```sql
-- TABLA MAESTRA DE TENANTS
CREATE TABLE empresas (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre               VARCHAR(150) NOT NULL,
  nombre_comercial     VARCHAR(150),
  nit                  VARCHAR(20) UNIQUE,
  email_contacto       VARCHAR(100) NOT NULL UNIQUE,
  telefono             VARCHAR(20),
  direccion            TEXT,
  logo_url             TEXT,
  pais                 VARCHAR(5)   DEFAULT 'GT',
  moneda               VARCHAR(3)   DEFAULT 'GTQ',
  idioma               VARCHAR(5)   DEFAULT 'es-GT',
  zona_horaria         VARCHAR(50)  DEFAULT 'America/Guatemala',
  app                  VARCHAR(20)  NOT NULL DEFAULT 'clinica'
                       CHECK (app IN ('clinica','credito')),
  plan                 VARCHAR(20)  NOT NULL DEFAULT 'trial'
                       CHECK (plan IN ('trial','estandar','pro','enterprise','suspendido')),
  max_sucursales       INTEGER      NOT NULL DEFAULT 1,
  max_usuarios         INTEGER      NOT NULL DEFAULT 5,
  precio_plan          NUMERIC(10,2),
  costo_usuario_extra  NUMERIC(10,2) DEFAULT 15.00,
  fecha_inicio_trial   TIMESTAMPTZ  DEFAULT NOW(),
  fecha_fin_trial      TIMESTAMPTZ  DEFAULT NOW() + INTERVAL '30 days',
  fecha_inicio_plan    TIMESTAMPTZ,
  fecha_vigencia       TIMESTAMPTZ,
  estado               VARCHAR(20)  NOT NULL DEFAULT 'trial'
                       CHECK (estado IN ('trial','activo','vencido','suspendido','cancelado')),
  slug                 VARCHAR(50)  UNIQUE,
  autoagendamiento_activo BOOLEAN   DEFAULT FALSE,
  stripe_customer_id   VARCHAR(100),
  stripe_sub_id        VARCHAR(100),
  creado_en            TIMESTAMPTZ  DEFAULT NOW(),
  actualizado_en       TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE sucursales (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id    UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nombre        VARCHAR(100) NOT NULL,
  direccion     TEXT,
  telefono      VARCHAR(20),
  email         VARCHAR(100),
  es_principal  BOOLEAN DEFAULT FALSE,
  activa        BOOLEAN DEFAULT TRUE,
  creado_en     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE usuarios (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id       UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  sucursal_id      UUID REFERENCES sucursales(id),
  supabase_uid     UUID UNIQUE,
  nombre           VARCHAR(100) NOT NULL,
  apellido         VARCHAR(100),
  email            VARCHAR(100) NOT NULL UNIQUE,
  rol              VARCHAR(30)  NOT NULL
                   CHECK (rol IN ('admin','dentista','asistente','recepcionista','analista','gerente')),
  activo           BOOLEAN DEFAULT TRUE,
  es_usuario_extra BOOLEAN DEFAULT FALSE,
  creado_en        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pagos (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id     UUID NOT NULL REFERENCES empresas(id),
  periodo_mes    INTEGER NOT NULL CHECK (periodo_mes BETWEEN 1 AND 12),
  periodo_anio   INTEGER NOT NULL,
  monto          NUMERIC(10,2) NOT NULL,
  moneda         VARCHAR(3)   DEFAULT 'GTQ',
  metodo_pago    VARCHAR(50)  DEFAULT 'transferencia',
  referencia     VARCHAR(100),
  estado         VARCHAR(20)  DEFAULT 'confirmado'
                 CHECK (estado IN ('pendiente','confirmado','rechazado')),
  stripe_pi_id   VARCHAR(100),
  notas          TEXT,
  registrado_por UUID REFERENCES usuarios(id),
  fecha_pago     DATE NOT NULL DEFAULT CURRENT_DATE,
  creado_en      TIMESTAMPTZ  DEFAULT NOW()
);
```

### 6.2 Notificaciones

```sql
CREATE TABLE notificacion_config (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id            UUID NOT NULL UNIQUE REFERENCES empresas(id) ON DELETE CASCADE,
  email_activo          BOOLEAN DEFAULT TRUE,
  whatsapp_activo       BOOLEAN DEFAULT FALSE,
  email_remitente_nombre VARCHAR(100),
  enviar_confirmacion   BOOLEAN DEFAULT TRUE,
  enviar_recordatorio_1 BOOLEAN DEFAULT TRUE,
  enviar_recordatorio_2 BOOLEAN DEFAULT TRUE,
  enviar_cancelacion    BOOLEAN DEFAULT TRUE,
  enviar_reprogramacion BOOLEAN DEFAULT TRUE,
  horas_recordatorio_1  INTEGER DEFAULT 24,
  horas_recordatorio_2  INTEGER DEFAULT 2,
  plantilla_confirmacion    TEXT DEFAULT 'Hola {paciente}, tu cita en {clinica} fue confirmada para el {fecha} a las {hora} con {dentista}.',
  plantilla_recordatorio    TEXT DEFAULT 'Hola {paciente}, te recordamos tu cita en {clinica} el {fecha} a las {hora} con {dentista}.',
  plantilla_cancelacion     TEXT DEFAULT 'Hola {paciente}, tu cita en {clinica} del {fecha} a las {hora} fue cancelada.',
  plantilla_reprogramacion  TEXT DEFAULT 'Hola {paciente}, tu cita en {clinica} fue reprogramada para el {fecha} a las {hora}.',
  whatsapp_api_key      VARCHAR(200),
  whatsapp_numero       VARCHAR(20),
  whatsapp_proveedor    VARCHAR(30),
  creado_en             TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notificaciones (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id      UUID NOT NULL REFERENCES empresas(id),
  cita_id         UUID NOT NULL,
  paciente_id     UUID NOT NULL,
  tipo            VARCHAR(30) NOT NULL
                  CHECK (tipo IN ('confirmacion','recordatorio_1','recordatorio_2','cancelacion','reprogramacion')),
  canal           VARCHAR(20) NOT NULL CHECK (canal IN ('email','whatsapp','sms')),
  destinatario    VARCHAR(150) NOT NULL,
  asunto          VARCHAR(200),
  mensaje         TEXT NOT NULL,
  estado          VARCHAR(20) DEFAULT 'pendiente'
                  CHECK (estado IN ('pendiente','enviado','fallido','cancelado')),
  intentos        INTEGER DEFAULT 0,
  max_intentos    INTEGER DEFAULT 3,
  programado_para TIMESTAMPTZ NOT NULL,
  enviado_en      TIMESTAMPTZ,
  error_detalle   TEXT,
  proveedor_id    VARCHAR(200),
  creado_en       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notificaciones_estado_fecha
  ON notificaciones(estado, programado_para) WHERE estado = 'pendiente';
```

### 6.3 Pacientes y Agenda

```sql
CREATE TABLE pacientes (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id        UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  sucursal_id       UUID REFERENCES sucursales(id),
  primer_nombre     VARCHAR(50)  NOT NULL,
  segundo_nombre    VARCHAR(50),
  primer_apellido   VARCHAR(50)  NOT NULL,
  segundo_apellido  VARCHAR(50),
  fecha_nacimiento  DATE,
  dpi               VARCHAR(20)  UNIQUE,
  genero            VARCHAR(10)  CHECK (genero IN ('M','F','otro')),
  foto_url          TEXT,
  telefono          VARCHAR(20),
  telefono_alt      VARCHAR(20),
  email             VARCHAR(100),
  direccion         TEXT,
  tiene_seguro      BOOLEAN DEFAULT FALSE,
  seguro_nombre     VARCHAR(100),
  seguro_poliza     VARCHAR(50),
  seguro_vigencia   DATE,
  alergias          TEXT[],
  condiciones       TEXT[],
  medicamentos      TEXT[],
  notas_medicas     TEXT,
  datos_extra       JSONB,
  como_nos_conocio  VARCHAR(50)
                    CHECK (como_nos_conocio IN ('referido_paciente','referido_medico','redes_sociales','google','walk_in','publicidad','otro')),
  referido_por      UUID REFERENCES pacientes(id),
  referido_nombre   VARCHAR(150),
  activo            BOOLEAN DEFAULT TRUE,
  dentista_principal UUID REFERENCES usuarios(id),
  creado_por        UUID REFERENCES usuarios(id),
  creado_en         TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en    TIMESTAMPTZ DEFAULT NOW()
);

CREATE VIEW v_pacientes AS
SELECT p.*,
  TRIM(p.primer_nombre || ' ' || COALESCE(p.segundo_nombre || ' ','') ||
       p.primer_apellido || ' ' || COALESCE(p.segundo_apellido,'')) AS nombre_completo,
  EXTRACT(YEAR FROM AGE(p.fecha_nacimiento))::INTEGER AS edad
FROM pacientes p;

CREATE TABLE tratamiento_tipos (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id      UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nombre          VARCHAR(100) NOT NULL,
  descripcion     TEXT,
  duracion_min    INTEGER NOT NULL DEFAULT 30,
  precio_base     NUMERIC(10,2),
  color           VARCHAR(7),
  activo          BOOLEAN DEFAULT TRUE,
  creado_en       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE citas (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id        UUID NOT NULL REFERENCES empresas(id),
  sucursal_id       UUID NOT NULL REFERENCES sucursales(id),
  paciente_id       UUID NOT NULL REFERENCES pacientes(id),
  dentista_id       UUID NOT NULL REFERENCES usuarios(id),
  tratamiento_id    UUID REFERENCES tratamiento_tipos(id),
  fecha_hora        TIMESTAMPTZ NOT NULL,
  duracion_min      INTEGER NOT NULL DEFAULT 30,
  fecha_hora_fin    TIMESTAMPTZ GENERATED ALWAYS AS
                    (fecha_hora + (duracion_min || ' minutes')::INTERVAL) STORED,
  estado            VARCHAR(20) NOT NULL DEFAULT 'agendada'
                    CHECK (estado IN ('agendada','confirmada','en_curso','completada','cancelada','no_asistio','reprogramada')),
  cancelada_por     VARCHAR(20) CHECK (cancelada_por IN ('clinica','paciente')),
  motivo_cancelacion TEXT,
  cita_origen_id    UUID REFERENCES citas(id),
  cita_nueva_id     UUID REFERENCES citas(id),
  notas_previas     TEXT,
  notas_post        TEXT,
  precio_acordado   NUMERIC(10,2),
  origen            VARCHAR(20) DEFAULT 'sistema'
                    CHECK (origen IN ('sistema','portal','telefono','whatsapp')),
  aprobada_por      UUID REFERENCES usuarios(id),
  creado_por        UUID REFERENCES usuarios(id),
  creado_en         TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cita_dentistas (
  cita_id       UUID NOT NULL REFERENCES citas(id) ON DELETE CASCADE,
  dentista_id   UUID NOT NULL REFERENCES usuarios(id),
  rol           VARCHAR(30) DEFAULT 'asistente'
                CHECK (rol IN ('principal','asistente','observador')),
  PRIMARY KEY (cita_id, dentista_id)
);

CREATE TABLE lista_espera (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id      UUID NOT NULL REFERENCES empresas(id),
  sucursal_id     UUID REFERENCES sucursales(id),
  paciente_id     UUID NOT NULL REFERENCES pacientes(id),
  dentista_id     UUID REFERENCES usuarios(id),
  tratamiento_id  UUID REFERENCES tratamiento_tipos(id),
  fecha_preferida DATE,
  hora_desde      TIME,
  hora_hasta      TIME,
  dias_preferidos INTEGER[],
  estado          VARCHAR(20) DEFAULT 'esperando'
                  CHECK (estado IN ('esperando','notificado','agendado','cancelado')),
  notificado_en   TIMESTAMPTZ,
  cita_asignada   UUID REFERENCES citas(id),
  notas           TEXT,
  creado_en       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE agenda_bloqueos (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id    UUID NOT NULL REFERENCES empresas(id),
  sucursal_id   UUID REFERENCES sucursales(id),
  dentista_id   UUID REFERENCES usuarios(id),
  fecha_inicio  TIMESTAMPTZ NOT NULL,
  fecha_fin     TIMESTAMPTZ NOT NULL,
  motivo        VARCHAR(100),
  creado_por    UUID REFERENCES usuarios(id),
  creado_en     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE dentista_horarios (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id    UUID NOT NULL REFERENCES empresas(id),
  dentista_id   UUID NOT NULL REFERENCES usuarios(id),
  sucursal_id   UUID NOT NULL REFERENCES sucursales(id),
  dia_semana    INTEGER NOT NULL CHECK (dia_semana BETWEEN 1 AND 7),
  hora_inicio   TIME NOT NULL,
  hora_fin      TIME NOT NULL,
  activo        BOOLEAN DEFAULT TRUE,
  UNIQUE (dentista_id, sucursal_id, dia_semana)
);
```

### 6.4 Expediente Clínico

```sql
CREATE TABLE expediente_notas (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id            UUID NOT NULL REFERENCES empresas(id),
  paciente_id           UUID NOT NULL REFERENCES pacientes(id),
  cita_id               UUID NOT NULL REFERENCES citas(id),
  numero_nota           INTEGER NOT NULL DEFAULT 1,
  motivo_consulta       TEXT,
  diagnosticos          JSONB DEFAULT '[]',
  tratamiento_realizado TEXT,
  tratamiento_pendiente TEXT,
  proxima_cita_sugerida DATE,
  observaciones         TEXT,
  creado_por            UUID NOT NULL REFERENCES usuarios(id),
  editado_por           UUID REFERENCES usuarios(id),
  creado_en             TIMESTAMPTZ DEFAULT NOW(),
  editado_en            TIMESTAMPTZ,
  UNIQUE (cita_id, numero_nota)
);

CREATE TABLE recetas (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id      UUID NOT NULL REFERENCES empresas(id),
  paciente_id     UUID NOT NULL REFERENCES pacientes(id),
  cita_id         UUID NOT NULL REFERENCES citas(id),
  nota_id         UUID REFERENCES expediente_notas(id),
  dentista_id     UUID NOT NULL REFERENCES usuarios(id),
  medicamentos    JSONB NOT NULL DEFAULT '[]',
  indicaciones_generales TEXT,
  numero_receta   SERIAL,
  fecha_emision   DATE DEFAULT CURRENT_DATE,
  fecha_vencimiento DATE DEFAULT CURRENT_DATE + INTERVAL '30 days',
  creado_en       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE expediente_imagenes (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id      UUID NOT NULL REFERENCES empresas(id),
  paciente_id     UUID NOT NULL REFERENCES pacientes(id),
  cita_id         UUID REFERENCES citas(id),
  nota_id         UUID REFERENCES expediente_notas(id),
  tipo            VARCHAR(30) NOT NULL
                  CHECK (tipo IN ('radiografia_periapical','radiografia_panoramica','radiografia_bitewing','foto_intraoral','foto_extraoral','foto_rxray','documento','otro')),
  titulo          VARCHAR(100),
  descripcion     TEXT,
  storage_path    TEXT NOT NULL,
  url_publica     TEXT,
  tamano_bytes    INTEGER,
  formato         VARCHAR(10),
  creado_por      UUID REFERENCES usuarios(id),
  creado_en       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE expediente_notas_historial (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nota_id         UUID NOT NULL REFERENCES expediente_notas(id),
  editado_por     UUID NOT NULL REFERENCES usuarios(id),
  campo_editado   VARCHAR(50),
  valor_anterior  TEXT,
  valor_nuevo     TEXT,
  editado_en      TIMESTAMPTZ DEFAULT NOW()
);
```

### 6.5 Odontograma

```sql
CREATE TABLE condicion_dental_catalogo (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id  UUID REFERENCES empresas(id),
  codigo      VARCHAR(20) NOT NULL,
  nombre      VARCHAR(50) NOT NULL,
  color_hex   VARCHAR(7)  NOT NULL,
  aplica_cara BOOLEAN DEFAULT TRUE,
  activo      BOOLEAN DEFAULT TRUE,
  orden       INTEGER DEFAULT 0,
  UNIQUE (empresa_id, codigo)
);

INSERT INTO condicion_dental_catalogo
  (empresa_id, codigo, nombre, color_hex, aplica_cara, orden)
VALUES
  (NULL,'SANO',     'Sano',                    '#639922',TRUE, 0),
  (NULL,'CARIADO',  'Cariado',                 '#E24B4A',TRUE, 1),
  (NULL,'OBTURADO', 'Obturado (empaste)',       '#378ADD',TRUE, 2),
  (NULL,'CORONA',   'Corona',                  '#BA7517',FALSE,3),
  (NULL,'AUSENTE',  'Extraído / Ausente',       '#888780',FALSE,4),
  (NULL,'EXODONCIA','Extracción indicada',      '#D85A30',FALSE,5),
  (NULL,'PUENTE',   'Pieza de puente (póntico)','#7F77DD',FALSE,6),
  (NULL,'IMPLANTE', 'Implante',                '#1D9E75',FALSE,7),
  (NULL,'ENDO',     'Endodoncia',              '#D4537E',FALSE,8),
  (NULL,'FRACTURA', 'Fractura',                '#A32D2D',TRUE, 9),
  (NULL,'MOVILIDAD','Movilidad',               '#EF9F27',FALSE,10),
  (NULL,'SELLANTE', 'Sellante',                '#5DCAA5',TRUE, 11);

CREATE TABLE odontograma (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id      UUID NOT NULL REFERENCES empresas(id),
  paciente_id     UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  numero_diente   INTEGER NOT NULL CHECK (numero_diente BETWEEN 11 AND 85),
  condicion_general VARCHAR(20),
  cara_vestibular VARCHAR(20),
  cara_lingual    VARCHAR(20),
  cara_mesial     VARCHAR(20),
  cara_distal     VARCHAR(20),
  cara_oclusal    VARCHAR(20),
  nota            VARCHAR(200),
  movilidad_grado INTEGER CHECK (movilidad_grado BETWEEN 0 AND 3),
  ultima_cita_id  UUID REFERENCES citas(id),
  actualizado_por UUID REFERENCES usuarios(id),
  actualizado_en  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (paciente_id, numero_diente)
);

CREATE TABLE odontograma_historial (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id            UUID NOT NULL REFERENCES empresas(id),
  paciente_id           UUID NOT NULL REFERENCES pacientes(id),
  numero_diente         INTEGER NOT NULL,
  cita_id               UUID REFERENCES citas(id),
  condicion_anterior    VARCHAR(20),
  cara_vestibular_ant   VARCHAR(20),
  cara_lingual_ant      VARCHAR(20),
  cara_mesial_ant       VARCHAR(20),
  cara_distal_ant       VARCHAR(20),
  cara_oclusal_ant      VARCHAR(20),
  nota_anterior         VARCHAR(200),
  condicion_nueva       VARCHAR(20),
  cara_vestibular_nueva VARCHAR(20),
  cara_lingual_nueva    VARCHAR(20),
  cara_mesial_nueva     VARCHAR(20),
  cara_distal_nueva     VARCHAR(20),
  cara_oclusal_nueva    VARCHAR(20),
  nota_nueva            VARCHAR(200),
  modificado_por        UUID NOT NULL REFERENCES usuarios(id),
  modificado_en         TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION clinica_odontograma_historial_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.condicion_general  IS DISTINCT FROM NEW.condicion_general  OR
      OLD.cara_vestibular     IS DISTINCT FROM NEW.cara_vestibular    OR
      OLD.cara_lingual        IS DISTINCT FROM NEW.cara_lingual       OR
      OLD.cara_mesial         IS DISTINCT FROM NEW.cara_mesial        OR
      OLD.cara_distal         IS DISTINCT FROM NEW.cara_distal        OR
      OLD.cara_oclusal        IS DISTINCT FROM NEW.cara_oclusal       OR
      OLD.nota                IS DISTINCT FROM NEW.nota) THEN
    INSERT INTO odontograma_historial (
      empresa_id, paciente_id, numero_diente, cita_id,
      condicion_anterior, cara_vestibular_ant, cara_lingual_ant,
      cara_mesial_ant, cara_distal_ant, cara_oclusal_ant, nota_anterior,
      condicion_nueva, cara_vestibular_nueva, cara_lingual_nueva,
      cara_mesial_nueva, cara_distal_nueva, cara_oclusal_nueva, nota_nueva,
      modificado_por
    ) VALUES (
      NEW.empresa_id, NEW.paciente_id, NEW.numero_diente, NEW.ultima_cita_id,
      OLD.condicion_general, OLD.cara_vestibular, OLD.cara_lingual,
      OLD.cara_mesial, OLD.cara_distal, OLD.cara_oclusal, OLD.nota,
      NEW.condicion_general, NEW.cara_vestibular, NEW.cara_lingual,
      NEW.cara_mesial, NEW.cara_distal, NEW.cara_oclusal, NEW.nota,
      NEW.actualizado_por
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER odontograma_historial_trg
AFTER UPDATE ON odontograma
FOR EACH ROW EXECUTE FUNCTION clinica_odontograma_historial_trigger();
```

### 6.6 FEL SAT Guatemala + Cobros

```sql
CREATE TABLE fel_config (
  id                     UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id             UUID NOT NULL UNIQUE REFERENCES empresas(id) ON DELETE CASCADE,
  certificador           VARCHAR(30) NOT NULL
                         CHECK (certificador IN ('infile','digifact','g4s','bantrab','otro')),
  api_url                TEXT NOT NULL,
  api_usuario            VARCHAR(200),
  api_clave              VARCHAR(200),
  api_llave              TEXT,
  nit_emisor             VARCHAR(20) NOT NULL,
  nombre_emisor          VARCHAR(150) NOT NULL,
  direccion_emisor       TEXT NOT NULL,
  codigo_postal          VARCHAR(10),
  regimen                VARCHAR(30) NOT NULL DEFAULT 'pequeno_contribuyente'
                         CHECK (regimen IN ('general','pequeno_contribuyente')),
  tasa_iva               NUMERIC(5,4) NOT NULL DEFAULT 0.05,
  codigo_establecimiento VARCHAR(10) DEFAULT '1',
  afiliacion_iva         VARCHAR(30) DEFAULT 'GEN',
  activo                 BOOLEAN DEFAULT TRUE,
  ambiente               VARCHAR(10) DEFAULT 'pruebas'
                         CHECK (ambiente IN ('pruebas','produccion')),
  creado_en              TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en         TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE planes_pago (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id        UUID NOT NULL REFERENCES empresas(id),
  paciente_id       UUID NOT NULL REFERENCES pacientes(id),
  cita_id           UUID REFERENCES citas(id),
  descripcion       TEXT NOT NULL,
  monto_total       NUMERIC(10,2) NOT NULL,
  numero_cuotas     INTEGER NOT NULL DEFAULT 1,
  monto_cuota       NUMERIC(10,2) NOT NULL,
  dia_cobro         INTEGER CHECK (dia_cobro BETWEEN 1 AND 31),
  estado            VARCHAR(20) DEFAULT 'activo'
                    CHECK (estado IN ('activo','completado','cancelado')),
  monto_pagado      NUMERIC(10,2) DEFAULT 0,
  monto_pendiente   NUMERIC(10,2) GENERATED ALWAYS AS (monto_total - monto_pagado) STORED,
  creado_por        UUID REFERENCES usuarios(id),
  creado_en         TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cobros (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id        UUID NOT NULL REFERENCES empresas(id),
  sucursal_id       UUID NOT NULL REFERENCES sucursales(id),
  paciente_id       UUID NOT NULL REFERENCES pacientes(id),
  cita_id           UUID REFERENCES citas(id),
  plan_pago_id      UUID REFERENCES planes_pago(id),
  numero_cobro      SERIAL,
  subtotal          NUMERIC(10,2) NOT NULL,
  descuento         NUMERIC(10,2) DEFAULT 0,
  base_imponible    NUMERIC(10,2) NOT NULL,
  iva_monto         NUMERIC(10,2) NOT NULL DEFAULT 0,
  total             NUMERIC(10,2) NOT NULL,
  metodo_pago       VARCHAR(30) NOT NULL
                    CHECK (metodo_pago IN ('efectivo','tarjeta_credito','tarjeta_debito','transferencia','cuota')),
  referencia_pago   VARCHAR(100),
  numero_cuota      INTEGER,
  total_cuotas      INTEGER,
  estado            VARCHAR(20) DEFAULT 'pendiente'
                    CHECK (estado IN ('pendiente','pagado','anulado')),
  fel_estado        VARCHAR(20) DEFAULT 'pendiente'
                    CHECK (fel_estado IN ('pendiente','emitida','anulada','error')),
  fel_uuid          VARCHAR(100),
  fel_numero        VARCHAR(50),
  fel_serie         VARCHAR(20),
  fel_fecha_cert    TIMESTAMPTZ,
  fel_xml           TEXT,
  fel_error_detalle TEXT,
  cobro_origen_id   UUID REFERENCES cobros(id),
  registrado_por    UUID REFERENCES usuarios(id),
  fecha_cobro       DATE NOT NULL DEFAULT CURRENT_DATE,
  creado_en         TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cobro_items (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cobro_id          UUID NOT NULL REFERENCES cobros(id) ON DELETE CASCADE,
  tratamiento_id    UUID REFERENCES tratamiento_tipos(id),
  descripcion       VARCHAR(200) NOT NULL,
  cantidad          INTEGER NOT NULL DEFAULT 1,
  precio_unitario   NUMERIC(10,2) NOT NULL,
  descuento_item    NUMERIC(10,2) DEFAULT 0,
  subtotal          NUMERIC(10,2) NOT NULL,
  numero_diente     INTEGER,
  cara_diente       VARCHAR(5)
);

CREATE TABLE fel_log (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id        UUID NOT NULL REFERENCES empresas(id),
  cobro_id          UUID REFERENCES cobros(id),
  tipo_documento    VARCHAR(10) NOT NULL CHECK (tipo_documento IN ('FACT','NCRE','NDEB')),
  accion            VARCHAR(30) NOT NULL,
  request_payload   TEXT,
  response_payload  TEXT,
  http_status       INTEGER,
  exitoso           BOOLEAN DEFAULT FALSE,
  error_mensaje     TEXT,
  creado_en         TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE caja_cierres (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id          UUID NOT NULL REFERENCES empresas(id),
  sucursal_id         UUID NOT NULL REFERENCES sucursales(id),
  fecha               DATE NOT NULL DEFAULT CURRENT_DATE,
  total_efectivo      NUMERIC(10,2) DEFAULT 0,
  total_tarjeta       NUMERIC(10,2) DEFAULT 0,
  total_transferencia NUMERIC(10,2) DEFAULT 0,
  total_cuotas        NUMERIC(10,2) DEFAULT 0,
  total_general       NUMERIC(10,2) DEFAULT 0,
  facturas_emitidas   INTEGER DEFAULT 0,
  facturas_anuladas   INTEGER DEFAULT 0,
  cerrado_por         UUID REFERENCES usuarios(id),
  cerrado_en          TIMESTAMPTZ,
  notas               TEXT,
  UNIQUE (sucursal_id, fecha)
);
```

### 6.7 Inventario

```sql
CREATE TABLE inventario_items (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id      UUID NOT NULL REFERENCES empresas(id),
  sucursal_id     UUID NOT NULL REFERENCES sucursales(id),
  nombre          VARCHAR(100) NOT NULL,
  descripcion     TEXT,
  categoria       VARCHAR(50)
                  CHECK (categoria IN ('material_dental','medicamento','instrumental','descartable','limpieza','otro')),
  unidad_medida   VARCHAR(20) DEFAULT 'unidad',
  codigo          VARCHAR(50),
  stock_actual    NUMERIC(10,2) DEFAULT 0,
  stock_minimo    NUMERIC(10,2) DEFAULT 0,
  stock_maximo    NUMERIC(10,2),
  precio_costo    NUMERIC(10,2),
  activo          BOOLEAN DEFAULT TRUE,
  creado_en       TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE inventario_movimientos (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id      UUID NOT NULL REFERENCES empresas(id),
  item_id         UUID NOT NULL REFERENCES inventario_items(id),
  cita_id         UUID REFERENCES citas(id),
  tipo            VARCHAR(20) NOT NULL
                  CHECK (tipo IN ('entrada','salida','consumo','ajuste','vencimiento')),
  cantidad        NUMERIC(10,2) NOT NULL,
  stock_anterior  NUMERIC(10,2) NOT NULL,
  stock_nuevo     NUMERIC(10,2) NOT NULL,
  motivo          TEXT,
  referencia      VARCHAR(100),
  registrado_por  UUID REFERENCES usuarios(id),
  creado_en       TIMESTAMPTZ DEFAULT NOW()
);

CREATE VIEW v_alertas_inventario AS
SELECT
  i.empresa_id, i.sucursal_id, i.id, i.nombre, i.categoria,
  i.stock_actual, i.stock_minimo, i.unidad_medida,
  ROUND(((i.stock_actual / NULLIF(i.stock_minimo,0)) * 100)::NUMERIC, 0) AS porcentaje_stock,
  CASE
    WHEN i.stock_actual = 0               THEN 'agotado'
    WHEN i.stock_actual <= i.stock_minimo THEN 'critico'
    ELSE 'ok'
  END AS estado_stock
FROM inventario_items i
WHERE i.activo = TRUE AND i.stock_actual <= i.stock_minimo;
```

### 6.8 Índices Globales

```sql
-- Empresas
CREATE INDEX idx_empresas_estado    ON empresas(estado);
CREATE INDEX idx_empresas_vigencia  ON empresas(fecha_vigencia);
CREATE INDEX idx_empresas_app       ON empresas(app);

-- Pacientes
CREATE INDEX idx_pacientes_empresa  ON pacientes(empresa_id);
CREATE INDEX idx_pacientes_dpi      ON pacientes(dpi) WHERE dpi IS NOT NULL;
CREATE INDEX idx_pacientes_nombre   ON pacientes(empresa_id, primer_apellido, primer_nombre);

-- Citas
CREATE INDEX idx_citas_empresa_fecha ON citas(empresa_id, fecha_hora);
CREATE INDEX idx_citas_dentista_fecha ON citas(dentista_id, fecha_hora);
CREATE INDEX idx_citas_paciente      ON citas(paciente_id);
CREATE INDEX idx_citas_estado        ON citas(estado, fecha_hora)
  WHERE estado IN ('agendada','confirmada');

-- Cobros
CREATE INDEX idx_cobros_empresa_fecha ON cobros(empresa_id, fecha_cobro DESC);
CREATE INDEX idx_cobros_paciente      ON cobros(paciente_id);
CREATE INDEX idx_cobros_fel_estado    ON cobros(empresa_id, fel_estado)
  WHERE fel_estado IN ('pendiente','error');

-- Inventario
CREATE INDEX idx_inventario_stock   ON inventario_items(empresa_id, sucursal_id)
  WHERE activo = TRUE;
CREATE INDEX idx_inventario_mov     ON inventario_movimientos(item_id, creado_en DESC);

-- Odontograma
CREATE INDEX idx_odontograma_paciente  ON odontograma(paciente_id);
CREATE INDEX idx_odontograma_historial ON odontograma_historial(paciente_id, modificado_en DESC);
```

### 6.9 RLS — Políticas de Seguridad

```sql
-- Habilitar RLS en todas las tablas
ALTER TABLE empresas              ENABLE ROW LEVEL SECURITY;
ALTER TABLE sucursales            ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios              ENABLE ROW LEVEL SECURITY;
ALTER TABLE pacientes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE citas                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE lista_espera          ENABLE ROW LEVEL SECURITY;
ALTER TABLE expediente_notas      ENABLE ROW LEVEL SECURITY;
ALTER TABLE recetas               ENABLE ROW LEVEL SECURITY;
ALTER TABLE expediente_imagenes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE odontograma           ENABLE ROW LEVEL SECURITY;
ALTER TABLE odontograma_historial ENABLE ROW LEVEL SECURITY;
ALTER TABLE cobros                ENABLE ROW LEVEL SECURITY;
ALTER TABLE cobro_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE planes_pago           ENABLE ROW LEVEL SECURITY;
ALTER TABLE fel_config            ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario_movimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE caja_cierres          ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones        ENABLE ROW LEVEL SECURITY;

-- Política base reutilizable (misma lógica para todas las tablas)
-- cada tabla necesita su propia política con su nombre
CREATE POLICY "empresa_ve_sus_pacientes"      ON pacientes FOR ALL
  USING (empresa_id=(SELECT empresa_id FROM usuarios WHERE supabase_uid=auth.uid()));
CREATE POLICY "empresa_ve_sus_citas"          ON citas FOR ALL
  USING (empresa_id=(SELECT empresa_id FROM usuarios WHERE supabase_uid=auth.uid()));
CREATE POLICY "empresa_ve_sus_notas"          ON expediente_notas FOR ALL
  USING (empresa_id=(SELECT empresa_id FROM usuarios WHERE supabase_uid=auth.uid()));
CREATE POLICY "empresa_ve_sus_cobros"         ON cobros FOR ALL
  USING (empresa_id=(SELECT empresa_id FROM usuarios WHERE supabase_uid=auth.uid()));
CREATE POLICY "empresa_ve_su_odontograma"     ON odontograma FOR ALL
  USING (empresa_id=(SELECT empresa_id FROM usuarios WHERE supabase_uid=auth.uid()));
CREATE POLICY "empresa_ve_su_inventario"      ON inventario_items FOR ALL
  USING (empresa_id=(SELECT empresa_id FROM usuarios WHERE supabase_uid=auth.uid()));
CREATE POLICY "empresa_ve_su_fel_config"      ON fel_config FOR ALL
  USING (empresa_id=(SELECT empresa_id FROM usuarios WHERE supabase_uid=auth.uid()));
```

### 6.10 Funciones Principales

```sql
-- Renovar suscripción Estándar o Pro
CREATE OR REPLACE FUNCTION clinica_renovar_suscripcion(
  p_empresa_id UUID, p_plan VARCHAR, p_meses INTEGER DEFAULT 1
) RETURNS VOID AS $$
BEGIN
  UPDATE empresas SET
    plan                = p_plan,
    estado              = 'activo',
    max_sucursales      = CASE p_plan WHEN 'pro' THEN 3 ELSE 1 END,
    max_usuarios        = CASE p_plan WHEN 'pro' THEN 15 ELSE 5 END,
    costo_usuario_extra = CASE p_plan WHEN 'pro' THEN 25.00 ELSE 15.00 END,
    precio_plan         = CASE p_plan WHEN 'pro' THEN 499.00 ELSE 250.00 END,
    fecha_inicio_plan   = COALESCE(fecha_inicio_plan, NOW()),
    fecha_vigencia      = COALESCE(fecha_vigencia, NOW())
                          + (p_meses || ' months')::INTERVAL,
    actualizado_en      = NOW()
  WHERE id = p_empresa_id;
END;
$$ LANGUAGE plpgsql;

-- Renovar suscripción Enterprise
CREATE OR REPLACE FUNCTION clinica_renovar_suscripcion_enterprise(
  p_empresa_id UUID, p_max_sucursales INTEGER,
  p_max_usuarios INTEGER, p_precio_negociado NUMERIC,
  p_meses INTEGER DEFAULT administrar
) RETURNS VOID AS $$
BEGIN
  UPDATE empresas SET
    plan = 'enterprise', estado = 'activo',
    max_sucursales = p_max_sucursales,
    max_usuarios = p_max_usuarios,
    costo_usuario_extra = 0,
    precio_plan = p_precio_negociado,
    fecha_inicio_plan = COALESCE(fecha_inicio_plan, NOW()),
    fecha_vigencia = COALESCE(fecha_vigencia, NOW())
                    + (p_meses || ' months')::INTERVAL,
    actualizado_en = NOW()
  WHERE id = p_empresa_id;
END;
$$ LANGUAGE plpgsql;

-- Verificar disponibilidad antes de agendar
CREATE OR REPLACE FUNCTION clinica_verificar_disponibilidad(
  p_dentista_id UUID, p_fecha_inicio TIMESTAMPTZ,
  p_duracion_min INTEGER, p_cita_excluir UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  p_fecha_fin TIMESTAMPTZ;
  v_conflicto INTEGER;
BEGIN
  p_fecha_fin := p_fecha_inicio + (p_duracion_min || ' minutes')::INTERVAL;
  SELECT COUNT(*) INTO v_conflicto FROM citas
  WHERE dentista_id = p_dentista_id
    AND estado NOT IN ('cancelada','no_asistio','reprogramada')
    AND id != COALESCE(p_cita_excluir,'00000000-0000-0000-0000-000000000000')
    AND tstzrange(fecha_hora,fecha_hora_fin) &&
        tstzrange(p_fecha_inicio,p_fecha_fin);
  IF v_conflicto > 0 THEN RETURN FALSE; END IF;
  SELECT COUNT(*) INTO v_conflicto FROM agenda_bloqueos
  WHERE (dentista_id = p_dentista_id OR dentista_id IS NULL)
    AND tstzrange(fecha_inicio,fecha_fin) &&
        tstzrange(p_fecha_inicio,p_fecha_fin);
  RETURN v_conflicto = 0;
END;
$$ LANGUAGE plpgsql;

-- Calcular IVA según régimen fiscal de la empresa
CREATE OR REPLACE FUNCTION clinica_calcular_iva(
  p_empresa_id UUID, p_subtotal NUMERIC, p_descuento NUMERIC DEFAULT 0
) RETURNS TABLE (base_imponible NUMERIC, iva_monto NUMERIC, total NUMERIC) AS $$
DECLARE v_tasa NUMERIC;
BEGIN
  SELECT tasa_iva INTO v_tasa FROM fel_config
  WHERE empresa_id = p_empresa_id AND activo = TRUE;
  v_tasa := COALESCE(v_tasa, 0);
  RETURN QUERY SELECT
    ROUND(p_subtotal - p_descuento, 2),
    ROUND((p_subtotal - p_descuento) * v_tasa, 2),
    ROUND((p_subtotal - p_descuento) * (1 + v_tasa), 2);
END;
$$ LANGUAGE plpgsql;

-- Mover inventario con validación de stock
CREATE OR REPLACE FUNCTION clinica_mover_inventario(
  p_empresa_id UUID, p_item_id UUID, p_tipo VARCHAR,
  p_cantidad NUMERIC, p_cita_id UUID DEFAULT NULL,
  p_motivo TEXT DEFAULT NULL, p_usuario_id UUID DEFAULT NULL
) RETURNS NUMERIC AS $$
DECLARE
  v_stock_ant  NUMERIC;
  v_stock_nuevo NUMERIC;
  v_delta      NUMERIC;
BEGIN
  v_delta := CASE p_tipo WHEN 'entrada' THEN p_cantidad ELSE -p_cantidad END;
  SELECT stock_actual INTO v_stock_ant FROM inventario_items
  WHERE id = p_item_id FOR UPDATE;
  v_stock_nuevo := v_stock_ant + v_delta;
  IF v_stock_nuevo < 0 THEN
    RAISE EXCEPTION 'Stock insuficiente. Actual: %, solicitado: %', v_stock_ant, p_cantidad;
  END IF;
  UPDATE inventario_items SET stock_actual = v_stock_nuevo, actualizado_en = NOW()
  WHERE id = p_item_id;
  INSERT INTO inventario_movimientos (
    empresa_id, item_id, cita_id, tipo, cantidad,
    stock_anterior, stock_nuevo, motivo, registrado_por
  ) VALUES (
    p_empresa_id, p_item_id, p_cita_id, p_tipo, v_delta,
    v_stock_ant, v_stock_nuevo, p_motivo, p_usuario_id
  );
  RETURN v_stock_nuevo;
END;
$$ LANGUAGE plpgsql;

-- Inicializar odontograma al crear paciente nuevo
CREATE OR REPLACE FUNCTION clinica_inicializar_odontograma(
  p_empresa_id UUID, p_paciente_id UUID, p_tipo VARCHAR DEFAULT 'adulto'
) RETURNS VOID AS $$
DECLARE
  dientes_adulto   INTEGER[] := ARRAY[11,12,13,14,15,16,17,18,21,22,23,24,25,26,27,28,31,32,33,34,35,36,37,38,41,42,43,44,45,46,47,48];
  dientes_temporal INTEGER[] := ARRAY[51,52,53,54,55,61,62,63,64,65,71,72,73,74,75,81,82,83,84,85];
  dientes INTEGER[];
  d INTEGER;
BEGIN
  dientes := CASE p_tipo WHEN 'temporal' THEN dientes_temporal ELSE dientes_adulto END;
  FOREACH d IN ARRAY dientes LOOP
    INSERT INTO odontograma (empresa_id, paciente_id, numero_diente)
    VALUES (p_empresa_id, p_paciente_id, d)
    ON CONFLICT (paciente_id, numero_diente) DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```

---

## 7. Roadmap Actualizado

```
FASE 0 — Setup cloud (Fin de semana 1)
├── Cuenta Supabase → proyecto clinicaapp_dev
├── Cuenta Budibase cloud → conectar a Supabase
└── VS Code + extensión Claude Code

FASE 1 — Schema base en Supabase (Fin de semana 2-3)
├── Ejecutar schema secciones 6.1 a 6.10
├── Verificar con datos de prueba
└── Primer tenant manual de prueba

FASE 2 — Módulos Pacientes + Agenda (Mes 1-3)
├── Formulario de pacientes en Budibase
├── Búsqueda de pacientes
└── Calendario de citas

FASE 3 — Expediente + Odontograma (Mes 3-5)
├── Nota de evolución por cita
└── Odontograma interactivo por caras (HTML embebido en Budibase)

FASE 4 — Cobros + FEL (Mes 5-6)
├── Cobros y planes de pago
├── Integración FEL con certificador en ambiente pruebas
└── Caja diaria

FASE 5 — Piloto (Mes 6-7)
├── 1 clínica dental pequeña Guatemala City
└── Ajustes post-piloto

FASE 6 — Migración VPS (Mes 7-8)
└── Con 3-5 clientes pagando — self-hosted

FASE 7 — v1.1 (Mes 8-9)
├── WhatsApp Business API
├── Autoagendamiento URL pública
└── Ícono/imagen por diente en odontograma

FASE 8 — CreditoApp (Mes 9+)
└── Reutiliza toda la infraestructura probada
```

---

## 8. Instrucciones para Claude en Este Proyecto

Eres el asistente técnico principal para ClinicaApp y CreditoApp.

**Stack activo:** Supabase cloud + Budibase cloud + VS Code + Claude Code.

**Mi perfil:** analista senior, dominio de modelado de datos y SQL/PostgreSQL, sin programación activa reciente. Trabajo solo, 6-8h los fines de semana.

**Reglas:**
- SQL siguiendo naming convention `clinica_[accion]_[entidad]`
- El schema de la sección 6 es fuente de verdad — no proponer cambios sin justificación técnica
- ClinicaApp va primero, CreditoApp después
- Máximo 2-3 opciones en decisiones de arquitectura, con recomendación clara
- Priorizar simplicidad — trabajo solo con tiempo limitado
- FEL SAT Guatemala: certificador abierto por empresa, factura por cuota, INFILE recomendado
- Seguridad: empresa_id en todas las tablas + RLS en Supabase + Supabase Auth

**Estado actual:** Schema ClinicaApp 100% definido. Próximo paso: crear cuentas Supabase y Budibase, ejecutar el schema SQL, crear primer tenant de prueba.

---

*Documento v4.0 — Reemplaza v3.0 completamente · Strategic Solutions SaaS Initiative · Marzo 2026*
