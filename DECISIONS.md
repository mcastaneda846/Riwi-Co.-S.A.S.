# Registro de Decisiones Técnicas - Riwi Messenger

En este documento se detallan y justifican las decisiones técnicas tomadas durante el desarrollo de la plataforma de mensajería interna Riwi Messenger, detallando el contexto y la justificación de cada elección.

---

## 1. Seguridad de Datos con Row Level Security (RLS) en PostgreSQL
* **Contexto:** Se requiere garantizar de forma estricta que ningún usuario pueda leer o buscar datos de canales privados a los que no pertenece.
* **Decisión:** Implementar Row Level Security (RLS) directamente en PostgreSQL. Cada transacción se ejecuta bajo una variable de sesión temporal (`app.current_user_id`), validando la membresía del usuario en la base de datos antes de retornar cualquier registro.
* **Justificación:** Centralizar la seguridad a nivel de base de datos evita fugas accidentales de información por parte del backend o consultas directas de la API de búsqueda vectorial del copiloto, lo que garantiza una protección a nivel de datos nativa y robusta.

---

## 2. Paginación Keyset por Cursores (sin OFFSET)
* **Contexto:** Cargar el historial de mensajes de forma incremental sin comprometer el rendimiento en bases de datos con volumen de datos creciente.
* **Decisión:** Implementar paginación Keyset usando cursores basados en fecha de creación e identificador único del último mensaje cargado.
* **Justificación:** A diferencia de la paginación con `OFFSET`, la cual ralentiza las consultas de forma lineal al tener que escanear y descartar registros anteriores en memoria, Keyset salta directamente a la sección indexada requerida, manteniendo un consumo óptimo de recursos y evitando saltos de scroll inesperados en la UI.

---

## 3. Arquitectura Resiliente del Copiloto RAG (Cascada Gemini -> OpenAI -> Mock)
* **Contexto:** El copiloto de IA necesita buscar contexto relevante y contestar preguntas del usuario de forma ininterrumpida.
* **Decisión:** Implementar un patrón de fallback en cascada para la generación del LLM. El sistema intenta primero comunicarse con Google Gemini (usando fetch directo a AI Studio), con fallback automático al SDK de OpenAI, y finalmente un mock local offline si no hay conexión o falta configurar llaves de API.
* **Justificación:** Esto asegura que la plataforma sea 100% tolerante a fallos de red y límites de cuota, garantizando que el copiloto siempre responda al usuario sin interrumpir la experiencia de uso.

---

## 4. Consolidación de la Interfaz en `MainShell.tsx`
* **Contexto:** Minimizar los renderizados innecesarios en React y estructurar la comunicación del estado en tiempo real de forma directa.
* **Decisión:** Unificar las tres secciones de la UI principal (Sidebar de canales, Panel del chat y Panel del Copiloto) dentro del componente principal `MainShell.tsx` en combinación con React Contexts.
* **Justificación:** Reducir la fragmentación excesiva del estado local simplifica la sincronización de eventos de envío y actualización en tiempo real, garantizando una UX fluida y predecible sin flujos complejos de props o re-renderizados accidentales.

---

## 5. Salida de Logs y Pruebas en Texto Plano
* **Contexto:** Evitar problemas de visualización en terminales de desarrollo y servidores de integración.
* **Decisión:** Reemplazar emojis y caracteres Unicode específicos en consola (`🤖`, `🔒`, `✅`) por marcas de texto estándar (`[RLS]`, `[PASSED]`, `[ERROR]`).
* **Justificación:** Los caracteres especiales y emojis a menudo no son compatibles con consolas de comandos Unix en servidores de despliegue remotos o Docker logs, provocando caracteres rotos. El formato en texto plano garantiza la máxima portabilidad y legibilidad multiplataforma.
