# Arquitectura del Proyecto - Riwi Messenger

Este proyecto implementa la arquitectura limpia (**Clean Architecture**) para estructurar de manera desacoplada y robusta la lógica de negocio, separándola de las tecnologías de infraestructura y presentación (base de datos, endpoints y vistas).

## Estructura de Directorios

La estructura real de archivos y carpetas del proyecto se organiza de la siguiente manera:

```
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts
│   │   │   └── refresh/route.ts
│   │   ├── channels/route.ts
│   │   ├── copilot/query/route.ts
│   │   └── messages/
│   │       ├── route.ts
│   │       └── search/route.ts
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   └── layout/
│       └── MainShell.tsx
├── config/
│   └── prompts.json
├── context/
│   ├── AuthContext.tsx
│   ├── ChatContext.tsx
│   └── I18nContext.tsx
├── core/
│   ├── domain/
│   │   ├── Channel.ts
│   │   ├── CopilotContext.ts
│   │   ├── Message.ts
│   │   └── User.ts
│   └── use-cases/
│       ├── CopilotRagUseCase.ts
│       ├── GetChannelMessagesUseCase.ts
│       ├── LoginUseCase.ts
│       ├── SearchMessagesUseCase.ts
│       └── SendMessageUseCase.ts
├── infrastructure/
│   ├── auth/
│   │   └── auth-helper.ts
│   ├── database/
│   │   └── postgres.ts
│   └── repositories/
│       ├── ChannelRepository.ts
│       ├── MessageRepository.ts
│       └── UserRepository.ts
└── scripts/
    ├── load_seed.ts
    ├── seed.sql
    └── test_rls.ts
```

### 1. Capa de Dominio (`src/core/domain/`)

Representa el núcleo del sistema. Aquí definimos las entidades principales y las reglas de tipado del negocio de forma agnóstica. No tiene dependencias de bases de datos ni de librerías de terceros.

- **Componentes principales:** `User.ts`, `Message.ts`, `Channel.ts`, `CopilotContext.ts`.

### 2. Capa de Casos de Uso (`src/core/use-cases/`)

Contiene las reglas de negocio de la aplicación y orquesta el flujo de datos. Consume los repositorios mediante abstracciones de persistencia.

- **Componentes principales:**
  - `LoginUseCase.ts`: Flujo para verificar credenciales de usuarios.
  - `SendMessageUseCase.ts`: Validación e inserción de mensajes en los canales.
  - `GetChannelMessagesUseCase.ts`: Recuperación de historial de mensajería.
  - `CopilotRagUseCase.ts`: Orquestación del proceso RAG de recuperación y generación con inteligencia artificial.

### 3. Capa de Infraestructura (`src/infrastructure/`)

Implementa las interfaces y adaptadores del sistema hacia el exterior, incluyendo la conexión directa con PostgreSQL y la gestión de repositorios de persistencia.

- **Componentes principales:**
  - `database/postgres.ts`: Configuración del pool de conexiones y el contenedor transaccional `withUserContext` para propagar el contexto RLS.
  - `repositories/`: Implementaciones directas de bases de datos (`UserRepository.ts`, `MessageRepository.ts`, `ChannelRepository.ts`).

### 4. Capa de Presentación (`src/app/` y `/components`)

Gestiona la interacción del usuario y la exposición de los servicios del servidor.

- **Backend (Next.js API Routes):** Reciben las peticiones HTTP, validan tokens y delegan la ejecución a los casos de uso correspondientes.
- **Frontend (React Components & Contexts):** Controla el estado global (autenticación y mensajería en tiempo real) y proporciona la interfaz de usuario en `MainShell.tsx`.

---

## Flujo de Datos

El flujo de ejecución de una petición se realiza de la siguiente manera:

1. El usuario interactúa con la interfaz (ej. envía un mensaje).
2. El componente React invoca el método correspondiente expuesto por el `ChatContext`.
3. Se realiza una solicitud HTTP a la API correspondiente (`/api/messages`).
4. El controlador de la API extrae el token JWT, valida la sesión y delega la ejecución al Caso de Uso (`SendMessageUseCase`).
5. El Caso de Uso ejecuta las validaciones de negocio y se comunica con el Repositorio para la inserción.
6. El Repositorio ejecuta la consulta dentro de un bloque de transacción RLS y el motor de base de datos realiza la validación y persistencia física.
