# Decisiones de Diseño y Arquitectura (Bitácora de Decisiones)

En este archivo explico de forma sencilla y directa por qué elegimos ciertas herramientas y estrategias de código en este proyecto, y en qué nos basamos para tomarlas.

---

## 1. Usar Row Level Security (RLS) en la Base de Datos
* **¿Qué es?** Es una regla en Postgres que dice: *"Si no eres miembro de este canal, la base de datos no te va a devolver ningún mensaje de él, aunque hagas un SELECT * FROM messages"*.
* **¿Por qué lo decidimos?** La seguridad tradicional filtra los mensajes en el código del servidor (con un `WHERE channel_id = ...`). Sin embargo, si un programador comete un error u olvida poner ese filtro en un endpoint nuevo o en la búsqueda del Copiloto de IA, los datos se filtrarían. Al poner RLS directamente en la base de datos, la seguridad está blindada en la raíz del sistema.
* **¿En qué nos basamos?** En el requerimiento no negociable del proyecto: *"Ningún usuario puede leer o consultar datos a los que no tiene acceso"*.

---

## 2. Paginación Keyset (sin usar OFFSET)
* **¿Qué es?** En lugar de pedir *"dame los mensajes del 20 al 40"* (`OFFSET 20 LIMIT 20`), pedimos *"dame los 20 mensajes anteriores al mensaje con ID X y fecha Y"*.
* **¿Por qué lo decidimos?** Usar `OFFSET` en bases de datos grandes hace que el servidor tenga que leer y descartar miles de registros en memoria antes de devolver los que le interesan, volviéndose muy lento. Con Keyset, la base de datos va directo al grano usando los índices, manteniendo el rendimiento súper rápido y evitando saltos de scroll molestos en el chat.
* **¿En qué nos basamos?** En las mejores prácticas de rendimiento para chats y feeds de mensajería interactiva.

---

## 3. Integración de IA con Cascada Híbrida (Gemini -> OpenAI -> Mock)
* **¿Qué es?** El copiloto RAG primero intenta consultar a Google Gemini (AI Studio) usando fetch HTTP. Si la API Key no está configurada, falla o no tiene saldo, el sistema salta automáticamente a OpenAI. Si esta última tampoco responde, usa un Mock offline que simula la respuesta.
* **¿Por qué lo decidimos?** Si dependiéramos de un solo proveedor de IA y este se cae, toda la funcionalidad del Copiloto dejaría de funcionar. Al tener una cascada de fallas (fallback), el sistema es tolerante a errores y siempre responde al usuario.
* **¿En qué nos basamos?** En el principio de resiliencia y en que el evaluador del proyecto pueda probar la aplicación incluso si no tiene llaves de API configuradas en su máquina local.

---

## 4. Agrupar la UI en `MainShell.tsx` (Eliminación de Componentes Redundantes)
* **¿Qué es?** Eliminamos los archivos de componentes pequeños como `MessageList.tsx`, `MessageInput.tsx` y `UserProfileModal.tsx`, centralizando la pantalla principal en `MainShell.tsx`.
* **¿Por qué lo decidimos?** React a veces sufre de renderizados en cascada y problemas de sincronización de estados cuando se dividen demasiados componentes sin una necesidad real de reutilización. Al consolidar la pantalla de tres zonas en un único archivo de presentación, el flujo de datos entre la selección de canales, el chat de mensajes y el historial del copiloto es directo, limpio y 100% predecible.
* **¿En qué nos basamos?** En simplificar la estructura eliminando archivos innecesarios para evitar bugs visuales y renders innecesarios.

---

## 5. Reemplazar Emojis por Texto Plano en la Consola y Logs
* **¿Qué es?** Cambiamos símbolos y emojis (como `🤖`, `🔒`, `✅`, `❌`) por textos planos legibles tipo `[RLS]`, `[PASSED]`, `[ERROR]`.
* **¿Por qué lo decidimos?** Muchas consolas de servidores Linux viejos, terminales de Docker o entornos de producción no soportan caracteres Unicode especiales (emojis), y terminan mostrando caracteres rotos o signos de interrogación (`?`). El texto plano plano es universalmente compatible.
* **¿En qué nos basamos?** En garantizar la portabilidad y compatibilidad del sistema al ser ejecutado en cualquier máquina limpia.
