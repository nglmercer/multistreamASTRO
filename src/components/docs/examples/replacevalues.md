# Guía de Uso: Configurador de Reemplazos

Esta herramienta te permite definir reglas para cambiar automáticamente ciertos textos en tus mensajes, scripts o cualquier otro contenido, utilizando información que tú le proporcionas. Es muy útil para crear mensajes personalizados, automatizar la inserción de datos, etc.

Piensa en ella como un "buscar y reemplazar" inteligente y automático, que puede usar datos cambiantes y funcionar incluso dentro de estructuras más complejas como listas o información organizada.

La herramienta se divide principalmente en dos secciones:

1.  **Configuración de Reemplazos**: Aquí defines tus reglas.
2.  **Probar Reemplazos**: Aquí compruebas si tus reglas funcionan como esperas.

---

## 1. Configuración de Reemplazos

En esta sección, creas y administras las reglas que la herramienta usará para realizar los reemplazos. Cada regla se compone de tres partes clave:

*   **Patrón:** El texto exacto (o "palabra clave") que la herramienta debe buscar en tu contenido. Por ejemplo: `uniqueId`, `{likes}`, `comment`, `playername`.
*   **Clave de Datos (`dataKey`):** El nombre de la "etiqueta" donde la herramienta debe buscar el valor de reemplazo en los "Datos de Prueba" o la información que le proporciones. Por ejemplo: si tu información tiene un campo llamado `userId`, pones `userId` aquí.
*   **Valor por Defecto (`defaultValue`):** El texto que se usará si la "Clave de Datos" no se encuentra en la información que proporcionas, o si el valor asociado está vacío. Esto evita que queden huecos sin reemplazar.

### Cómo Funciona:

La herramienta buscará cada "Patrón" definido en tu contenido. Cuando encuentra un "Patrón", irá a tu información proporcionada, buscará la "Clave de Datos" asociada a ese Patrón, y usará el valor que encuentre allí para reemplazar el Patrón original. Si no encuentra la "Clave de Datos" en tu información, usará el "Valor por Defecto" que hayas configurado para ese Patrón.

### Administrando tus Reglas de Reemplazo:

*   **➕ Agregar Reemplazo:** Haz clic en este botón para añadir una nueva fila a la lista. Aquí puedes definir un nuevo "Patrón", su "Clave de Datos" y un "Valor por Defecto".
*   **Editar Regla:** Haz clic en los campos de texto de cada fila para modificar el "Patrón", la "Clave de Datos" o el "Valor por Defecto" de una regla existente.
*   **➖ Eliminar:** Haz clic en el botón rojo en la fila de una regla para eliminarla de tu configuración.
*   **💾 Guardar Configuración:** Es **muy importante** que hagas clic en este botón después de hacer cambios para que tus reglas se guarden y estén disponibles la próxima vez que uses la herramienta (se guarda en tu navegador).
*   **📥 Importar Configuración:** Si alguien te ha compartido un archivo de configuración (un archivo `.json`), puedes usar este botón para cargar esas reglas en la herramienta.
*   **📤 Exportar Configuración:** Si quieres guardar tus reglas actuales o compartirlas con alguien más, usa este botón para descargar un archivo `.json` con toda tu configuración.

---

## 2. Probar Reemplazos

Esta sección te permite ver exactamente cómo funcionarán tus reglas de reemplazo con ejemplos reales.

### Componentes de la Prueba:

*   **Entrada de Prueba:** Aquí escribes o pegas el texto (o incluso información organizada como la de los programas, que a veces se ve como texto entre `{ }` y `[ ]`) en el que quieres realizar los reemplazos. Por ejemplo: `Hola, uniqueId! Tienes {likes} likes.`
*   **Datos de Prueba (JSON):** Aquí proporcionas la información que la herramienta usará para buscar los valores de reemplazo. Esta información debe estar en un formato específico (JSON), que se ve como una lista de "etiquetas" y sus "valores" entre llaves `{}`. Asegúrate de que las "Claves de Datos" que definiste en tus reglas de reemplazo existan aquí. Por ejemplo: `{"uniqueId": "UsuarioEjemplo", "likeCount": "150"}`.
*   **🧪 Probar Reemplazo:** Haz clic en este botón para ejecutar el proceso de reemplazo con la "Entrada de Prueba" y los "Datos de Prueba" que hayas proporcionado.
*   **Resultado:** Aquí verás el resultado después de que la herramienta haya aplicado todas tus reglas de reemplazo. Si usaste la opción de tracking, verás el texto con los cambios resaltados para que sea fácil ver qué partes fueron reemplazadas.

### Cómo Interpretar el Resultado:

El área de "Resultado" te mostrará el texto final después de que todos los "Patrones" encontrados en la "Entrada de Prueba" hayan sido reemplazados por los valores correspondientes de los "Datos de Prueba" (o sus "Valores por Defecto").

Si el resultado aparece resaltado, esto te indica visualmente las partes del texto que fueron modificadas por tus reglas.

---

## Ejemplo Completo:

Imagina que quieres personalizar un mensaje de bienvenida.

1.  **En "Configuración de Reemplazos":**
    *   Agrega una regla:
        *   **Patrón:** `[NOMBRE]`
        *   **Clave de Datos:** `nombreUsuario`
        *   **Valor por Defecto:** `Invitado`
    *   Agrega otra regla:
        *   **Patrón:** `{PUNTOS}`
        *   **Clave de Datos:** `puntuacionActual`
        *   **Valor por Defecto:** `0`
    *   Haz clic en **💾 Guardar Configuración**.

2.  **En "Probar Reemplazos":**
    *   En **Entrada de Prueba**, escribe: `¡Bienvenido, [NOMBRE]! Tienes {PUNTOS} puntos en tu cuenta.`
    *   En **Datos de Prueba (JSON)**, escribe: `{"nombreUsuario": "Ana", "puntuacionActual": "500"}`
    *   Haz clic en **🧪 Probar Reemplazo**.

3.  **En "Resultado", verás:**
    `¡Bienvenido, Ana! Tienes 500 puntos en tu cuenta.` (Y las palabras "Ana" y "500" podrían aparecer resaltadas si la visualización lo soporta).

**Ahora, si cambias los "Datos de Prueba (JSON)" a:**
`{"puntuacionActual": "75"}` (¡Hemos omitido `nombreUsuario`!)

**Al hacer clic en "🧪 Probar Reemplazo" nuevamente, verás:**
`¡Bienvenido, Invitado! Tienes 75 puntos en tu cuenta.`

Como puedes ver, la herramienta usó el "Valor por Defecto" ("Invitado") para el patrón `[NOMBRE]` porque la clave `nombreUsuario` no estaba presente en los nuevos "Datos de Prueba".