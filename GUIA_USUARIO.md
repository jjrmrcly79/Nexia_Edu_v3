# 📘 Guía de Usuario — Nexia Edu v3

> **Plataforma de capacitación inteligente en Lean Manufacturing & Excelencia Operacional**

---

## Tabla de Contenidos

1. [Introducción](#1-introducción)
2. [Requisitos Previos](#2-requisitos-previos)
3. [Instalación y Puesta en Marcha](#3-instalación-y-puesta-en-marcha)
4. [Pantalla de Inicio (Dashboard)](#4-pantalla-de-inicio-dashboard)
5. [Módulo de Habilidades (Skill)](#5-módulo-de-habilidades-skill)
6. [Repaso Diario](#6-repaso-diario)
7. [Glosario](#7-glosario)
8. [Modo de Práctica](#8-modo-de-práctica)
9. [Salón de Entrenamiento — Memorama](#9-salón-de-entrenamiento--memorama)
10. [Mr. Kaizen — Mentor IA](#10-mr-kaizen--mentor-ia)
11. [Sistema de Gamificación](#11-sistema-de-gamificación)
12. [Panel de Administración](#12-panel-de-administración)
13. [Pipeline de Datos](#13-pipeline-de-datos)
14. [Arquitectura Técnica](#14-arquitectura-técnica)
15. [Variables de Entorno](#15-variables-de-entorno)
16. [Preguntas Frecuentes](#16-preguntas-frecuentes)

---

## 1. Introducción

**Nexia Edu** es una plataforma educativa diseñada para capacitar equipos en metodologías **Lean Manufacturing** y **Excelencia Operacional**. Combina:

- 📚 **Contenido estructurado** extraído de documentos certificados (The Toyota Way, Lean Thinking, etc.)
- 🤖 **Inteligencia Artificial** con búsqueda semántica (RAG) para generar explicaciones y respuestas personalizadas
- 🎮 **Gamificación** con puntos, rachas, rangos, insignias y mini-juegos
- 🥋 **Mentor Virtual** (Mr. Kaizen) que guía al estudiante con preguntas socráticas

### ¿Para quién es?

| Rol | Uso principal |
|-----|---------------|
| **Estudiante / Operador** | Aprender conceptos Lean, practicar con quizzes, jugar Memorama, consultar al mentor |
| **Administrador / Instructor** | Monitorear cobertura de contenido, identificar brechas, ejecutar pipelines de generación |

---

## 2. Requisitos Previos

| Componente | Versión mínima |
|-----------|---------------|
| Node.js | 18+ |
| npm | 9+ |
| Python | 3.10+ (solo para pipeline de datos) |
| Supabase | Proyecto activo con esquemas `public` y `learning` |
| OpenAI API Key | Acceso a `gpt-4o-mini`, `gpt-4o` y `text-embedding-3-small` |

---

## 3. Instalación y Puesta en Marcha

### 3.1. Clonar e instalar dependencias

```bash
git clone <URL_DEL_REPOSITORIO>
cd Nexia_Edu_v3
npm install
```

### 3.2. Configurar variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto con las siguientes variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
OPENAI_API_KEY=sk-...
```

> Consulta la sección [Variables de Entorno](#15-variables-de-entorno) para más detalles.

### 3.3. Ejecutar las migraciones de base de datos

Aplica las migraciones en Supabase en orden:

1. `01_schema.sql` — Esquema base de aprendizaje (dominios, conceptos, herramientas, fórmulas, procedimientos, chunks, items)
2. `02_user_domain_progress.sql` — Funciones RPC para progreso por dominio
3. `03_gamification_schema.sql` — Tablas de gamificación (streaks, badges, rangos)
4. `04_vector_search.sql` — Función de búsqueda vectorial para RAG

### 3.4. Iniciar el servidor de desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## 4. Pantalla de Inicio (Dashboard)

**Ruta:** `/`

La pantalla de inicio es tu centro de mando personal. Muestra:

### 4.1. Bienvenida y Rango

- **Saludo personalizado** con el nombre del usuario
- **Rango actual** (ej. "Iniciado Lean") con indicador visual de nivel (1-5 puntos)
- El rango sube automáticamente según tus puntos acumulados

### 4.2. Tarjeta "En Curso"

- Muestra el **dominio activo** (el primer dominio con menos de 4 respuestas correctas)
- **Barra de progreso** indicando avance porcentual
- **Concepto destacado** del dominio actual con su definición
- Botón **"Continuar Práctica"** que te lleva directamente a la página del dominio

### 4.3. Vitrina de Trofeos

- Muestra tus **insignias ganadas** en el Memorama
- Tres niveles: 🥉 Bronce, 🥈 Plata, 🥇 Oro
- Si tienes más de 3, puedes ver la vitrina completa

### 4.4. Accesos Rápidos

| Botón | Descripción | Ruta |
|-------|-------------|------|
| 🎯 **Jugar** | Ir al Salón de Entrenamiento (Memorama) | `/play` |
| ✅ **Repaso** | Sesión de repaso diario con preguntas | `/daily` |
| 📖 **Glosario** | Consultar términos y definiciones | `/glossary` |
| 🥋 **Mr. Kaizen** | Hablar con tu mentor IA | `/mentor` |

### 4.5. Tarjeta de Estadísticas

- **Racha actual** de días consecutivos de estudio 🔥
- **Puntos totales (XP)** acumulados

---

## 5. Módulo de Habilidades (Skill)

**Ruta:** `/skill/[slug]` (ejemplo: `/skill/flujo`)

Esta es la experiencia de aprendizaje profundo de cada dominio. Se organiza en **4 pestañas**:

### 5.1. 📖 Aprender (Pestaña "Learn")

- Lista de **conceptos clave** en formato acordeón expandible
- Cada concepto incluye su título y definición detallada
- Número total de conceptos visibles

### 5.2. ☑️ Verificar (Pestaña "Check")

- **Lista de verificación** de habilidades del dominio
- Los items se marcan como completados automáticamente según tus respuestas correctas
- Indicador de progreso (ej. "2 / 4")

### 5.3. 💬 Evidencia (Pestaña "Evidence")

- **Citas textuales** de documentos fuente (ej. "The Toyota Way, Cap. 4")
- Cada cita muestra la fuente y referencia original
- Proporciona respaldo académico al contenido

### 5.4. 💪 Práctica (Pestaña "Practice")

- Motor de preguntas interactivo con opciones múltiples
- Retroalimentación inmediata (correcto/incorrecto)
- Explicaciones detalladas de cada respuesta

### 5.5. Botón "Lectura IA"

- Disponible en la cabecera de cada skill
- Abre el **TopicSummaryModal** que genera un resumen profundo usando IA
- Utiliza búsqueda semántica vectorial para encontrar fragmentos relevantes de los documentos certificados
- Las respuestas incluyen **citas con fuente y página**

---

## 6. Repaso Diario

**Ruta:** `/daily`

### ¿Cómo funciona?

1. Al entrar, el sistema selecciona automáticamente un **concepto del día** de tu material
2. Se muestra el nombre y definición del concepto
3. Puedes tocar **"Repasar a fondo"** para abrir el modal de investigación profunda con IA
4. Debajo, aparece el **PracticeEngine** con preguntas de repaso

### Beneficios

- Sesiones cortas de ~3 minutos diseñadas para **retención a largo plazo**
- Refuerza conceptos que ya estudiaste previamente
- Suma puntos y mantiene tu racha activa

---

## 7. Glosario

**Ruta:** `/glossary`

El glosario es tu **enciclopedia Lean** interactiva.

### 7.1. Filtros

- **Barra de búsqueda** con búsqueda en tiempo real (debounce de 300ms)
- **Filtro por dominio** (dropdown con todos los dominios disponibles)
- **Pestañas por tipo:** Conceptos | Herramientas | Fórmulas | Procesos

### 7.2. Tarjetas de Términos

Cada tarjeta muestra:
- Nombre del término con icono según tipo (📖 Concepto, ✏️ Herramienta, 🧪 Fórmula, 📋 Procedimiento)
- Badges con los dominios a los que pertenece
- Primera definición como resumen
- Indicador si tiene definiciones alternativas adicionales

### 7.3. Modal de Detalle

Al hacer clic en una tarjeta se abre un modal con:

- **Definición completa** con formato visual destacado
- **Variables** (para fórmulas) con sus descripciones
- **Pasos** (para procedimientos) en lista numerada
- **Evidencia y Fuente** con citas textuales de los documentos originales
- Botón **"Ver Resumen Extenso"** → abre la investigación con IA
- Botón **"Practicar este término"** → te lleva al modo de práctica enfocado en ese término específico

---

## 8. Modo de Práctica

**Ruta:** `/practice?context_type=concept&context_id=UUID&domainId=UUID`

### Motor de Preguntas (PracticeEngine)

El PracticeEngine es el componente central de evaluación:

1. **Carga de preguntas** — Obtiene items desde Supabase filtrados por dominio o concepto específico
2. **Presentación** — Muestra una pregunta con 4 opciones de respuesta
3. **Evaluación** — Al seleccionar una respuesta, valida contra la respuesta correcta normalizada
4. **Retroalimentación visual:**
   - ✅ Verde con confeti para respuestas correctas
   - ❌ Rojo con explicación para respuestas incorrectas
5. **Progreso** — Registra cada respuesta en `user_progress` para actualizar racha, puntos y rango
6. **Navegación** — Botón "Siguiente" para avanzar a la siguiente pregunta

### Tipos de pregunta soportados

- Opción múltiple (A, B, C, D)
- Preguntas contextualizadas a documentos certificados

---

## 9. Salón de Entrenamiento — Memorama

**Ruta:** `/play`

### ¿Cómo funciona?

1. **Selección de dominio** — Elige un dominio de estudio de la lista disponible
2. **Tablero de cartas** — Se genera un tablero de cartas pareadas:
   - Una carta tiene el **nombre del concepto**
   - Su pareja tiene la **definición**
3. **Mecánica de juego:**
   - Voltea dos cartas por turno
   - Si el concepto y su definición coinciden → ¡match! Las cartas se quedan visibles
   - Si no coinciden, se voltean de nuevo después de 1 segundo
4. **Puntuación:**
   - Contador de **intentos** realizados
   - Contador de **pares encontrados**
5. **Victoria:**
   - Al completar todas las parejas → 🎉 explosión de confeti
   - Se otorgan **puntos extra** y una **insignia** al concepto dominado
   - Botón para **jugar de nuevo** con nuevas cartas

### Sistema de Insignias

| Nivel | Criterio |
|-------|----------|
| 🥉 Bronce | Ganar la primera partida con un concepto |
| 🥈 Plata | Acumular 5+ victorias con ese concepto |
| 🥇 Oro | Acumular 15+ victorias con ese concepto |

---

## 10. Mr. Kaizen — Mentor IA

**Ruta:** `/mentor`

### Descripción

Mr. Kaizen es un **Sensei Lean virtual** alimentado por GPT-4o-mini + búsqueda semántica RAG. Su rol no es dar respuestas directas, sino guiarte con el **método socrático**.

### Cómo usarlo

1. Escribe tu pregunta o describe un problema operacional en el campo de texto
2. Mr. Kaizen responderá con:
   - Preguntas reflexivas ("¿Han ido a observar al Gemba?")
   - Referencias a conceptos Lean relevantes
   - Guía basada en los documentos certificados de la plataforma

### Características técnicas

- **Streaming en tiempo real** — Las respuestas se muestran palabra por palabra
- **RAG (Retrieval-Augmented Generation):**
  1. Tu pregunta se convierte en un vector (embedding) con `text-embedding-3-small`
  2. Se buscan los 5 fragmentos más relevantes en Supabase con similitud coseno
  3. Los fragmentos se inyectan como contexto en el prompt del sistema
- **Formato Markdown** — Las respuestas soportan negritas, listas, bloques de código
- **Indicador de escritura** con animación de puntos
- **Borrar historial** con el botón de papelera

### Personalidad

> *"Soy Mr. Kaizen, tu Sensei Lean virtual. Estoy aquí para guiarte a la causa raíz de cualquier problema operacional."*

- Usa términos como "Konnichiwa", "Gemba", "Kaizen"
- Tono respetuoso, formal pero alentador
- Respuestas concisas (máximo 3 párrafos)
- Orientadas a la acción y reflexión

---

## 11. Sistema de Gamificación

### 11.1. Puntos (XP)

Se otorgan al:
- Responder correctamente preguntas de práctica
- Completar el repaso diario
- Ganar partidas de Memorama

### 11.2. Racha (Streak)

- Cuenta los **días consecutivos** de actividad en la plataforma
- Se muestra con el emoji 🔥 en la pantalla de inicio
- Se reinicia si se pierde un día

### 11.3. Rangos

Los rangos se calculan automáticamente según los puntos totales acumulados:

| Rango | Descripción |
|-------|-------------|
| Iniciado Lean | Primer nivel, comenzando el viaje |
| Aprendiz Lean | Nivel intermedio |
| *(Niveles adicionales)* | Se configuran en la base de datos |

### 11.4. Insignias

Se ganan exclusivamente en el **Memorama** (ver sección 9):
- **Bronce** → Primera victoria
- **Plata** → 5 victorias
- **Oro** → 15 victorias
- Cada insignia está vinculada a un **concepto específico**

---

## 12. Panel de Administración

**Ruta:** `/admin`

> Acceso exclusivo para administradores e instructores.

El panel tiene una barra lateral con navegación a 4 secciones:

### 12.1. Dashboard (`/admin`)

Vista general con 4 tarjetas de estadísticas:

| Métrica | Descripción |
|---------|-------------|
| **Total Domains** | Número de áreas de conocimiento activas |
| **Assessment Items** | Total de preguntas generadas |
| **Processed Chunks** | Documentos procesados / total de chunks |
| **System Health** | Estado operacional del sistema |

### 12.2. Coverage Matrix (`/admin/coverage`)

Tabla que muestra el estado de cada dominio:

- **Domain Name** — Nombre del dominio
- **Status** — "Ready" (verde) si tiene items, "Empty" (ámbar) si no
- **Items Generated** — Número de preguntas generadas para ese dominio
- **Actions** — Botón "Generate" para crear preguntas (placeholder)

### 12.3. Fill Gaps (`/admin/fill-gaps`)

Herramienta de diagnóstico para identificar dominios con **habilidades sin preguntas**:

- Tabla con cada dominio y su conteo de skills faltantes
- Estado: "Complete" o "Needs Attention"
- **Comando de reparación** copiable al portapapeles:
  - Individual: `python pipeline/Poblar.py --mode 4 --target <slug>`
  - Global: `python pipeline/Poblar.py --mode 4 --target all`

### 12.4. Settings (`/admin/settings`)

Sección de configuración del sistema (en desarrollo).

---

## 13. Pipeline de Datos

Los scripts Python en la carpeta `pipeline/` se usan para poblar y mantener la base de datos:

| Script | Descripción |
|--------|-------------|
| `Poblar.py` | Script principal de poblado. Genera dominios, habilidades, conceptos, herramientas, fórmulas, procedimientos e items de evaluación a partir de documentos procesados |
| `Poblar_Custom.py` | Versión personalizada para poblar datos específicos |
| `GenerateEmbeddings.py` | Genera vectores de embedding (`text-embedding-3-small`) para los chunks de documentos y los almacena en Supabase |
| `LinkConcepts.py` | Vincula conceptos relacionados entre dominios usando similitud semántica |
| `TranslateGlossary.py` | Traduce términos del glosario |
| `FixCalidadConcepts.py` | Script de corrección para conceptos del dominio "Calidad" |

### Uso típico

```bash
# Instalar dependencias Python
pip install -r pipeline/requirements.txt

# Generar embeddings para búsqueda vectorial
python pipeline/GenerateEmbeddings.py

# Poblar datos de evaluación
python pipeline/Poblar.py --mode 4 --target all

# Vincular conceptos relacionados
python pipeline/LinkConcepts.py
```

---

## 14. Arquitectura Técnica

### Stack tecnológico

```
┌─────────────────────────────────────────┐
│            Frontend (Next.js 15)        │
│  React 19 · TailwindCSS 4 · shadcn/ui  │
│  Framer Motion · ReactMarkdown         │
├─────────────────────────────────────────┤
│           API Routes (Next.js)          │
│  /api/chat     → Mentor IA (RAG)       │
│  /api/research → Investigación Profunda │
├─────────────────────────────────────────┤
│              Servicios IA               │
│  OpenAI GPT-4o-mini  (Chat/Mentor)     │
│  OpenAI GPT-4o       (Research)        │
│  text-embedding-3-small (Vectores)     │
├─────────────────────────────────────────┤
│         Base de Datos (Supabase)        │
│  Schema: learning (dominios, conceptos) │
│  Schema: public (progreso, gamificación)│
│  pgvector (búsqueda semántica)         │
└─────────────────────────────────────────┘
```

### Esquemas de Base de Datos

**Schema `learning`:**
- `domains` — Dominios de conocimiento (ej. Flujo, Calidad, VSM)
- `skills` — Habilidades dentro de cada dominio
- `concepts` — Conceptos con definiciones y evidencia
- `tools` — Herramientas Lean
- `formulas` — Fórmulas con variables
- `procedures` — Procedimientos con pasos
- `items` — Preguntas de evaluación (opción múltiple)
- `chunks` — Fragmentos de documentos con embeddings vectoriales

**Schema `public`:**
- `user_streaks` — Rachas, puntos y rango del usuario
- `user_progress` — Registro de respuestas individuales
- `user_concept_badges` — Insignias del Memorama

### Funciones RPC principales

| Función | Descripción |
|---------|-------------|
| `get_practice_items_rpc` | Obtiene items de práctica filtrados por dominio |
| `get_term_details_rpc` | Detalles completos de un término (concepto/tool/formula/procedure) |
| `get_glossary_terms_rpc` | Lista de términos para el glosario con filtros |
| `get_user_domain_progress_rpc` | Progreso del usuario por dominio |
| `get_domain_full_data_rpc` | Datos completos de un dominio (conceptos, checklist, evidencia) |
| `get_admin_stats_rpc` | Estadísticas globales del sistema |
| `get_domain_coverage_rpc` | Matriz de cobertura de items por dominio |
| `get_domain_gaps_summary_rpc` | Análisis de brechas en skills sin items |
| `match_documents_rpc` | Búsqueda vectorial por similitud coseno |
| `get_all_domains_rpc` | Lista todos los dominios |
| `get_skill_id_by_slug_rpc` | Busca skill ID a partir de un slug |

---

## 15. Variables de Entorno

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL de tu proyecto Supabase | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima (pública) de Supabase | ✅ |
| `OPENAI_API_KEY` | Clave API de OpenAI para GPT y embeddings | ✅ |

---

## 16. Preguntas Frecuentes

### ¿Por qué no se muestran preguntas en el modo de práctica?

Verifica que:
1. El dominio tenga items generados (revisa en `/admin/coverage`)
2. Si están vacíos, ejecuta el pipeline: `python pipeline/Poblar.py --mode 4 --target <slug>`

### ¿Cómo actualizo el contenido de los documentos?

1. Agrega o actualiza los chunks de documentos en la tabla `learning.chunks`
2. Ejecuta `python pipeline/GenerateEmbeddings.py` para generar nuevos vectores
3. Las respuestas de Mr. Kaizen y la investigación profunda se actualizarán automáticamente

### ¿El Memorama siempre muestra los mismos conceptos?

No. Cada vez que juegas, se seleccionan conceptos aleatorios del dominio elegido, asegurando variedad.

### ¿Cómo se calcula mi rango?

El rango se actualiza automáticamente según tus puntos totales. Los umbrales se definen en la función de gamificación en Supabase.

### ¿Puedo usar la app en dispositivos móviles?

Sí. La interfaz está diseñada como **mobile-first** con un ancho máximo de `md` (max-w-md) para la mayoría de las vistas de aprendizaje, y es completamente responsiva.

---

## Créditos

- **Framework:** [Next.js 15](https://nextjs.org)
- **UI:** [shadcn/ui](https://ui.shadcn.com) + [Radix UI](https://radix-ui.com) + [Tailwind CSS](https://tailwindcss.com)
- **Animaciones:** [Framer Motion](https://motion.dev) + [canvas-confetti](https://www.npmjs.com/package/canvas-confetti)
- **IA:** [OpenAI](https://openai.com) (GPT-4o, GPT-4o-mini, text-embedding-3-small)
- **Base de datos:** [Supabase](https://supabase.com) (PostgreSQL + pgvector)
- **Markdown:** [react-markdown](https://github.com/remarkjs/react-markdown)

---

*Guía generada el 6 de marzo de 2026. Versión de la aplicación: `0.1.0`*
