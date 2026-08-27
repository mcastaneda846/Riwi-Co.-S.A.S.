# Arquitectura del Proyecto (Explicación Sencilla)

Este proyecto está construido usando **Arquitectura Limpia (Clean Architecture)**. La idea principal es organizar el código en "capas" como si fuera una cebolla, donde el centro (el corazón de la aplicación) no sabe nada sobre las herramientas externas (como la base de datos o el framework Next.js). Esto hace que cambiar una herramienta en el futuro sea muy fácil y que el código sea ordenado y fácil de probar.

---

## Estructura de Capas

Aquí te explico de forma muy simple qué hace cada carpeta en el proyecto:

```
src/
├── core/
│   ├── domain/         <-- Capa 1: El Corazón (Modelos y Reglas)
│   └── use-cases/      <-- Capa 2: El Cerebro (Acciones de la aplicación)
├── infrastructure/     <-- Capa 3: Los Brazos (Base de datos y APIs)
└── app/                <-- Capa 4: La Piel (Next.js, API Routes y UI)
```

### 1. Dominio (`src/core/domain/`)
* **¿Qué es?** Es la capa más interna. Aquí definimos cómo lucen nuestros datos.
* **¿Qué contiene?** Las interfaces de TypeScript como `User.ts`, `Message.ts`, `Channel.ts` y `CopilotContext.ts`.
* **Regla de oro:** No importan nada de Next.js, bases de datos ni librerías externas. Son tipos puros.

### 2. Casos de Uso (`src/core/use-cases/`)
* **¿Qué es?** Es la lógica de negocio, es decir, las acciones que nuestra aplicación puede hacer.
* **¿Qué contiene?**
  * `LoginUseCase.ts`: Lógica para validar que el usuario y la contraseña coincidan.
  * `SendMessageUseCase.ts`: Reglas para enviar un mensaje a un canal.
  * `GetChannelMessagesUseCase.ts`: Recuperar los mensajes de un canal específico.
  * `CopilotRagUseCase.ts`: Buscar contexto en la base de datos y pasárselo a la IA (Gemini/OpenAI) para responder preguntas.
* **Explicación:** Si mañana cambiamos Express por Next.js o Postgres por Mongo, esta lógica no cambia en absoluto.

### 3. Infraestructura (`src/infrastructure/`)
* **¿Qué es?** La conexión con el mundo exterior.
* **¿Qué contiene?**
  * `database/postgres.ts`: La configuración del cliente de PostgreSQL y la función `withUserContext` que le avisa a la base de datos qué usuario está haciendo la consulta para que se active el RLS (seguridad).
  * `repositories/`: Clases que hacen los `SELECT` e `INSERT` reales en las tablas de la base de datos (`UserRepository.ts`, `MessageRepository.ts`, `ChannelRepository.ts`).

### 4. Capa de Aplicación y Presentación (`src/app/` y `/components`)
* **¿Qué es?** Lo que el usuario ve y los puntos de entrada (rutas API).
* **¿Qué contiene?**
  * `/api/`: Rutas HTTP que reciben las peticiones del frontend, extraen el usuario del token JWT y llaman al Caso de Uso correspondiente.
  * `/components/layout/MainShell.tsx`: La pantalla de chat con sus tres zonas (sidebar de canales, chat de mensajes y panel del copiloto de IA).
  * `context/`: Proveedores de React (`AuthContext.tsx`, `ChatContext.tsx`, `I18nContext.tsx`) que administran el estado global en el navegador.

---

## ¿Cómo viaja la información? (Flujo de datos)

Cuando escribes un mensaje y le das a "Enviar":
1. El **Componente React** llama a `sendMessage()` del `ChatContext`.
2. El context hace una petición `POST` a `/api/messages` con el token JWT.
3. El archivo de la **API Route** valida el token, saca tu ID de usuario y llama a `SendMessageUseCase.execute()`.
4. El **Caso de Uso** valida que el mensaje no esté vacío y llama al `MessageRepository` pasando la conexión con la base de datos.
5. El **Repositorio** ejecuta la consulta SQL segura.
6. La **Base de Datos (Postgres)** valida las políticas RLS y guarda el mensaje.
7. Todo regresa en cadena y el mensaje se pinta en tu pantalla.