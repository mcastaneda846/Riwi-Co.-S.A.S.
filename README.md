# Riwi Messenger - Plataforma de Mensajería Interna Segura

Riwi Messenger es una solución de comunicación interna fullstack profesional diseñada para administrar usuarios, canales, mensajes y consultas inteligentes de forma consistente y ultra segura.

La plataforma implementa medidas de seguridad no negociables a nivel de base de datos utilizando **Row Level Security (RLS)** en PostgreSQL, garantizando que ningún usuario pueda leer, buscar o consultar a través de un copiloto de IA información del canal al que no tiene membresía autorizada.

---

## Características Principales

* **Clean Architecture:** Estructura desacoplada y modular que aísla las reglas de negocio del framework y el driver de base de datos.
* **Seguridad a Nivel de Datos (RLS):** Políticas implementadas en PostgreSQL que aíslan de forma nativa los registros según el contexto del usuario autenticado (`app.current_user_id`).
* **Copiloto RAG Multiproveedor:** Recupera contexto relevante de canales autorizados mediante embeddings vectoriales ($1536$ dimensiones), utilizando la API de Google Gemini (AI Studio) con fallback automático al SDK de OpenAI y Mock offline.
* **Paginación Keyset:** Historial de mensajes cargado dinámicamente mediante cursores eficientes en PostgreSQL para evitar sobrecargas de rendimiento.
* **Internacionalización (i18n):** Interfaz multilenguaje en español e inglés, sin textos en duro dentro de los componentes.
* **Consumo de IA Auditado:** Monitoreo y registro acumulado de tokens consumidos por usuario en la base de datos.

---

## Requisitos Previos

Asegúrate de tener instalados los siguientes componentes en tu máquina:

* **Node.js** (Versión 18 o superior)
* **Docker** y **Docker Compose**
* **NPM** (gestor de paquetes de Node)

---

## Guía de Instalación y Configuración Paso a Paso

Sigue estos sencillos pasos para levantar y ejecutar el proyecto completo en cualquier computadora local:

### Paso 1: Clonar el Repositorio
Clona el proyecto e ingresa a la carpeta raíz del workspace:
```bash
git clone <URL_DEL_REPOSITORIO>
cd riwi-messenger
```

### Paso 2: Crear el Archivo de Variables de Entorno
Copia el archivo `.env.example` para crear el archivo `.env` definitivo:
```bash
cp .env.example .env
```

Abre el archivo `.env` recién creado en un editor de texto y define los siguientes valores (o utiliza los valores de prueba por defecto):

```env
# URL de conexión a la base de datos PostgreSQL
DATABASE_URL=postgresql://rw_admin:rw_secure_password_2026@127.0.0.1:5432/bd_riwi_chat_clan

# Clave secreta para firmar y verificar tokens JWT
JWT_SECRET=super_secret_jwt_token_clan_riwi_2026

# Clave de API de Google AI Studio (Gemini) - Reemplaza con tu clave real
RIWI_API_KEY=tu_gemini_api_key_aqui

# Opcional: Clave de API de OpenAI para fallback automático
OPENAI_API_KEY=tu_openai_api_key_aqui
```

### Paso 3: Levantar la Base de Datos con Docker
Inicia el contenedor de PostgreSQL con soporte de vectores utilizando Docker Compose:
```bash
docker compose up -d
```

Este comando levantará la base de datos en el puerto `5432` y creará la base de datos `bd_riwi_chat_clan` ejecutando automáticamente el archivo `init.sql` (que configura tablas, vistas, funciones, triggers y políticas RLS).

### Paso 4: Instalar las Dependencias del Proyecto
Instala las dependencias de Node.js requeridas para el frontend y backend:
```bash
npm install
```

### Paso 5: Cargar los Datos Semilla (Seed)
Para poblar la base de datos con canales, usuarios y mensajes preestablecidos para el desarrollo, ejecuta el script de carga:
```bash
npm run seed
```
*(Este comando ejecutará la carga idempotente mapeando el archivo `seed.json` en la base de datos activa).*

---

## Ejecución del Proyecto

### Iniciar en Servidor de Desarrollo
Para levantar el servidor de Next.js (frontend y API del backend) en modo desarrollo:
```bash
npm run dev
```

Abre tu navegador e ingresa a [http://localhost:3000](http://localhost:3000).

#### Credenciales de Prueba por Defecto
El sistema viene preconfigurado con dos cuentas de usuario para pruebas locales:
* **Usuario Desarrollador (Miembro de canal público y privado):**
  * **Email:** `developer@riwi.com`
  * **Contraseña:** `riwi2026`
* **Usuario Administrador (Miembro de todos los canales):**
  * **Email:** `admin@riwi.com`
  * **Contraseña:** `riwi2026`

---

## Pruebas de Seguridad de RLS (PostgreSQL Real)

El proyecto cuenta con una suite de pruebas automatizadas que se conectan contra la base de datos real para verificar que las restricciones y políticas de RLS funcionan de manera infranqueable.

Para ejecutar las pruebas de seguridad:
```bash
npm run test:security
```

Este test verifica de forma adversarial:
1. Que un usuario común **no pueda leer** mensajes de canales privados ajenos.
2. Que la búsqueda vectorial del Copiloto RAG **no exponga ni procese** información privada de canales ajenos.
3. Que el acceso legítimo para administradores o miembros activos del canal se mantenga operativo.

---

## Estructura del Código y Guías Internas

Si deseas profundizar en la arquitectura limpia y las decisiones del proyecto, puedes consultar los siguientes archivos locales:
* [ARCHITECTURE.md](ARCHITECTURE.md) - Detalle de las capas y dependencias de la aplicación.
* [DECISIONS.md](DECISIONS.md) - Justificación de decisiones técnicas, recortes de alcance y bibliotecas elegidas.
* [init.sql](init.sql) - Archivo DDL donde reside toda la lógica crítica y de seguridad de base de datos.
