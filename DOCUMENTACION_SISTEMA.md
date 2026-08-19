# Documentación Técnica y Flujo del Sistema: Tumisoft Sync Web

**Versión del Sistema:** 1.0.0  
**Entorno:** Full-Stack (React 18 + Vite + Express + Node.js + Firebase Firestore + Google Sheets API + Tumisoft ERP)  
**Empresa / Sucursal:** ZEYVER IMPORTACIONES S.A.C. (RUC: 20612547131)

---

## 1. Resumen Ejecutivo y Propósito

**Tumisoft Sync Web** es una plataforma empresarial integral diseñada para automatizar, validar y sincronizar en tiempo real los ingresos diarios de mercadería, catálogos de productos, listas de precios y niveles de inventario desde hojas de cálculo de **Google Sheets** y archivos locales hacia el ERP **Tumisoft**.

El sistema opera bajo una arquitectura multicentro / multisede con control de versiones, validación rigurosa de reglas de negocio antes de aplicar cambios, cola de tareas asíncronas con registros de auditoría y pruebas de diagnóstico de conexión directas.

---

## 2. Arquitectura General del Sistema

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   CLIENTE (FRONTEND)                                   │
│  React 18 + TypeScript + Tailwind CSS + Lucide Icons + Google Identity Services (GSI)  │
└───────────────┬───────────────────────────────────────────────────────┬────────────────┘
                │                                                       │
        (Peticiones API / JSON)                              (OAuth2 Token Google API)
                │                                                       │
                ▼                                                       ▼
┌───────────────────────────────────────────────┐       ┌────────────────────────────────┐
│             BACKEND (EXPRESS / NODE)          │       │     GOOGLE APIS (DRIVE / V4)   │
│  • server.ts (Endpoints REST)                 │       │  • sheets.spreadsheets.values  │
│  • server/tumisoftClient.ts (Conector ERP)    │       │  • drive.files.list            │
│  • server/store.ts (Caché & Persistencia)     │       └────────────────────────────────┘
└───────┬───────────────────────────────┬───────┘
        │                               │
 (REST API Auth Bearer)        (Sync / Realtime Events)
        │                               │
        ▼                               ▼
┌───────────────────────────────┐ ┌──────────────────────────────────────────────────────┐
│         TUMISOFT ERP          │ │                  FIREBASE FIRESTORE                  │
│ • Autenticación de Sede       │ │ • Colección 'sedes' (Configuración por sucursal)     │
│ • Catálogo de Productos       │ │ • Colección 'jobs' (Historial de tareas y colas)     │
│ • Creación & Actualización    │ │ • Colección 'logs' (Auditoría de operaciones)        │
│ • Movimientos de Kardex       │ │ • Colección 'products' (Catálogo local consolidado)  │
└───────────────────────────────┘ └──────────────────────────────────────────────────────┘
```

---

## 3. Estructura de Módulos y Archivos

### 3.1. Frontend (`/src`)
- `src/App.tsx`: Componente raíz y orquestador principal del estado global (navegación por pestañas, sede activa, autenticación de usuario, estado de conexión con Google, notificaciones tipo Toast y escucha de eventos de sincronización).
- `src/types.ts`: Modelos de datos TypeScript (`Product`, `Sede`, `SyncJob`, `SyncLog`, `GoogleSheetConfig`, `GoogleDriveFile`, etc.).
- `src/components/SedeSelector.tsx`: Barra superior para conmutar entre sedes, visualizar datos fiscales (RUC, dirección), estado de sesión Google y botón de prueba de conectividad en tiempo real con Tumisoft.
- `src/components/IngresoDia.tsx`: Módulo principal de ingreso diario en 4 pasos (Ingesta, Validación de Reglas, Previsualización/Autorización y Encolado a Tumisoft).
- `src/components/GoogleSheetConfigModal.tsx`: Modal interactivo para vincular/cambiar hojas de cálculo, seleccionar archivos directamente desde Google Drive o mediante URL/ID, configurar pestañas/rangos y realizar pruebas de lectura en vivo.
- `src/components/ActualizacionMasiva.tsx`: Módulo de ajuste masivo de precios y stock con reglas porcentuales o montos fijos, simulación previa de impacto y ejecución por lotes.
- `src/components/ProductCatalog.tsx`: Visor de catálogo maestro con filtros multicriterio (por sede, categoría, búsqueda por SKU/nombre), exportación a CSV/Excel y edición directa.
- `src/components/JobsHistory.tsx`: Panel de control de colas de sincronización (tareas pendientes, en proceso, completadas o fallidas) con barra de progreso y detalle de filas procesadas.
- `src/components/AuditLogs.tsx`: Bitácora inmutable de auditoría con niveles (INFO, WARN, ERROR, SUCCESS), sello de tiempo y usuario autorizador.
- `src/components/SettingsPanel.tsx`: Panel de administración de sedes, credenciales de Tumisoft, vinculación de Sheets por sede y utilidades de reinicio.
- `src/firebase/config.ts`: Inicialización del SDK de Firebase (Firestore & Auth) con fallback inteligente para operar en entornos locales o de desarrollo.

### 3.2. Backend (`/server` y `/server.ts`)
- `server.ts`: Servidor Express con endpoints REST para sedes, lectura de Google Sheets con fallback local, gestión de jobs, catálogo, actualización de stock/precios y logs.
- `server/tumisoftClient.ts`: Conector y adaptador oficial con los servicios de Tumisoft ERP.
- `server/store.ts`: Capa de persistencia local en memoria / JSON con semillas iniciales de sedes y productos.

---

## 4. Flujo de Procesos y Lógica de Negocio

### 4.1. Flujo de Selección y Conexión de Sede
1. El usuario selecciona la sucursal de trabajo activa (ej. *Sede Principal - Lima*, *Miraflores*, *Surco*, etc.).
2. Cada sede contiene:
   - **ID de Sede** y Nombre Comercial.
   - **RUC** fiscal asociado (`20612547131`).
   - **Google Sheet ID** vinculado y Rango predeterminado (`Ingreso!A2:H`).
   - **Token / Credenciales Tumisoft** específicas para la sucursal.
3. El botón **"Probar Conexión"** dispara un diagnóstico (`POST /api/sedes/:id/test-connection`) que evalúa:
   - Conectividad HTTPS con el servidor backend.
   - Validación de credenciales y sesión contra la API de Tumisoft.
   - Lectura de verificación del canal de datos.

---

### 4.2. Flujo de Vinculación de Google Sheets
1. **Autenticación con Google**: El usuario puede conectar su cuenta de Google mediante el cliente de tokens OAuth2 de Google Identity Services (GSI).
2. **Selección de Hoja**:
   - *Vía Google Drive*: Lista automáticamente las hojas de cálculo recientes del usuario usando `drive.files.list`.
   - *Vía Enlace Directo*: Permite pegar una URL completa de Google Drive (`https://docs.google.com/spreadsheets/d/.../edit`) o el ID alfanumérico limpio.
3. **Configuración de Pestaña y Rango**: Define el nombre de la pestaña y celdas (ej. `Ingreso!A2:H` o `LibroDiario!A2:G100`).
4. **Prueba de Lectura en Vivo**: Envía una solicitud de validación con el token OAuth o API key para verificar que el rango devuelva filas con estructura correcta antes de guardar.
5. **Guardado**: Actualiza la configuración en Firestore y en el almacén de sedes.

---

### 4.3. Flujo de Ingreso Diario (Pipeline de 4 Fases)

```
 [1. Ingesta]           [2. Validación]         [3. Previsualización]        [4. Ejecución]
┌──────────────┐       ┌─────────────────┐     ┌─────────────────────┐     ┌────────────────┐
│ Leer Datos   │ ────> │ Aplicar Reglas  │ ──> │ Resumen & Usuario   │ ──> │ Encolar SyncJob │
│ Google Sheet │       │ de Negocio      │     │ Autorizador         │     │ Asíncrono      │
└──────────────┘       └─────────────────┘     └─────────────────────┘     └────────────────┘
```

#### Fase 1: Ingesta de Datos
- Consulta la hoja de Google Sheets configurada vía `GET /api/sheets/data?sedeId=...`.
- Si se dispone de un token de Google activo, utiliza la API oficial de Google Sheets v4; de lo contrario, utiliza los datos en caché con indicador de modo simulación.
- Normaliza las columnas requeridas:
  - Col A: Código / SKU
  - Col B: Descripción / Nombre del Producto
  - Col C: Categoría
  - Col D: Costo Unitario (PEN)
  - Col E: Precio de Venta (PEN)
  - Col F: Cantidad Ingresada (Stock)
  - Col G: Unidad de Medida (NIU, KGM, etc.)
  - Col H: Código de Barras (Opcional)

#### Fase 2: Validación de Reglas de Negocio
El sistema ejecuta las siguientes reglas automáticas:
- **Regla 1 (Campos Obligatorios)**: El SKU y la Descripción no pueden estar vacíos.
- **Regla 2 (Consistencia Numérica)**: El Stock y el Costo deben ser mayores o iguales a 0.
- **Regla 3 (Margen Positivo)**: El Precio de Venta debe ser mayor al Costo Unitario.
- **Regla 4 (Detección de Reingresos vs Nuevos)**: Compara el SKU contra el catálogo existente en Tumisoft.
  - *Producto Nuevo*: Si el SKU no existe, se clasifica como `NUEVO` y se preparan datos para creación.
  - *Reingreso*: Si el SKU ya existe, se clasifica como `REINGRESO` (sumará stock o actualizará precio si difiere).
- **Regla 5 (Filas con Error)**: Filas con datos incongruentes se marcan con error visual y no bloquean el procesamiento del resto del lote.

#### Fase 3: Previsualización y Autorización
- Muestra una ventana modal con el desglose exacto:
  - Cantidad de productos nuevos a crear (`+N productos`).
  - Cantidad de productos a reingresar / actualizar (`+M productos`).
  - Filas omitidas por error.
  - Correo electrónico del usuario autorizador (`userEmail`).

#### Fase 4: Encolado de Tarea Asíncrona (SyncJob)
- Al confirmar, se despacha un `SyncJob` a la cola (`POST /api/jobs`).
- El backend procesa el lote elemento por elemento contra Tumisoft ERP:
  - Crea productos nuevos mediante `POST /api/products`.
  - Actualiza stock y precios de reingresos mediante `PUT /api/products/:id`.
- Emite eventos de progreso en tiempo real (0% a 100%).
- Registra el resultado en la bitácora de auditoría (`AuditLogs`).

---

### 4.4. Flujo de Actualización Masiva de Precios y Stock
1. Permite seleccionar una categoría específica o todo el catálogo de la sede activa.
2. Selección del tipo de ajuste:
   - **Incremento Porcentual de Precio** (ej. +5%, +10%).
   - **Descuento Porcentual de Precio** (ej. -3%, -5%).
   - **Monto Fijo** (ej. +S/ 2.50).
   - **Ajuste de Stock** (+N unidades o establecer valor fijo).
3. **Simulación previa (Dry-Run)**: Tabla comparativa antes/después con cálculo del margen resultante.
4. **Ejecución**: Despacha la actualización por lotes hacia Tumisoft ERP registrando cada cambio en auditoría.

---

## 5. Especificación de Endpoints REST del Backend

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/health` | Verificación de estado del servidor y uptime |
| `GET` | `/api/sedes` | Listado de todas las sucursales configuradas |
| `POST` | `/api/sedes` | Crear una nueva sede de trabajo |
| `PUT` | `/api/sedes/:id` | Actualizar configuración de sede (Google Sheet ID, rango, etc.) |
| `POST` | `/api/sedes/:id/test-connection` | Prueba de diagnóstico y conectividad con Tumisoft |
| `GET` | `/api/sheets/data` | Obtiene las filas de la hoja de Google Sheets de la sede activa |
| `GET` | `/api/products` | Catálogo de productos (soporta filtros por sede y búsqueda) |
| `POST` | `/api/products` | Creación de un producto en Tumisoft |
| `PUT` | `/api/products/:id` | Actualización de stock o precio de un producto existente |
| `GET` | `/api/jobs` | Listado histórico y estado actual de las colas de sincronización |
| `POST` | `/api/jobs` | Crea y encola un nuevo trabajo de sincronización asíncrono |
| `GET` | `/api/logs` | Listado de registros de auditoría del sistema |

---

## 6. Variables de Entorno y Configuración

Las variables del proyecto se definen en el archivo `.env.example`:

```env
# Entorno y Puerto
PORT=3000
NODE_ENV=development

# Credenciales de Tumisoft ERP
TUMISOFT_API_URL=https://api.tumisoft.pe/v1
TUMISOFT_RUC=20612547131
TUMISOFT_USER=906255854
TUMISOFT_TOKEN=tumisoft_sec_token_zeyver_2026_prod

# Google Workspace / Google Sheets API
GOOGLE_CLIENT_ID=
GOOGLE_API_KEY=
```

---

## 7. Próximos Pasos y Roadmap Sugerido

1. **Sincronización Bidireccional Automática**: Mecanismo Webhook o Cron recurrente para escribir el estado de Kardex de Tumisoft de vuelta en Google Sheets.
2. **Alertas por Correo / Notificaciones**: Envío automático de resumen diario al completar cada lote de sincronización.
3. **Gestión Avanzada de Lotes y Vencimientos**: Añadir campos de número de lote y fecha de expiración para productos perecibles o farmacéuticos.
4. **Módulo de Reportes de Rentabilidad**: Gráficos analíticos de margen comercial promedio por categoría y sede.
