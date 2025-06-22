# Documentación de la Funcionalidad de Reemplazo Configurable

Este documento describe la funcionalidad de reemplazo configurable implementada en los componentes y clases proporcionados. Permite definir dinámicamente patrones en cadenas de texto (o estructuras de datos anidadas) y reemplazarlos con valores obtenidos de un objeto de datos, utilizando valores por defecto si no se encuentran. La configuración puede guardarse y cargarse localmente.

La funcionalidad principal se compone de los siguientes archivos:

1.  `ReplacerConfig.jsx`: Componente principal de SolidJS que actúa como interfaz de usuario.
2.  `ConfigurableReplacer.ts`: Clase TypeScript que contiene la lógica central del reemplazo.
3.  `ReplacerConfigForm.jsx`: Componente para gestionar la lista de patrones de reemplazo.
4.  `TestReplacer.jsx`: Componente para probar la funcionalidad de reemplazo con datos de ejemplo.
5.  `ReplacementItemForm.jsx` : Componente para un único item de reemplazo en el formulario.
6.  `HighlightedResult.jsx` : Componente para mostrar el resultado de la prueba con resaltado.
7.  `ReplacerConfig.css` : Estilos asociados.

---

## `ReplacerConfig.jsx` - Componente Principal

### Propósito

Es el componente raíz que integra la interfaz de configuración y la herramienta de prueba. Gestiona el estado global de la configuración (lista de reemplazos, opciones) y pasa esta configuración a sus componentes hijos (`TestReplacer` y `ReplacerConfigForm`).

### Estado y Gestión

Utiliza señales de SolidJS (`createSignal`) para manejar el estado de:

*   `instanceId`: Identificador de la instancia de configuración (por defecto, `"default"`). Permite tener múltiples sets de configuraciones guardadas localmente.
*   `removeBackslashes`: Booleano para indicar si se deben eliminar las barras invertidas (`\`) del resultado final.
*   `useLocalStorage`: Booleano para habilitar/deshabilitar la carga y guardado automático en `localStorage`. (Aunque el código sugiere que `loadSavedConfig` y `saveConfig` se llaman solo si `useLocalStorage` es `true` en la instancia de `ConfigurableReplacer`, este flag en el estado del componente parece ser el interruptor principal de la UI).
*   `replacements`: Un array de objetos que representan cada regla de reemplazo configurada (patrón, `dataKey`, `defaultValue`).

### Inicialización (`createEffect`)

Al montarse el componente, un `createEffect` realiza dos acciones:

1.  Inicializa la lista de `replacements` con un set de patrones por defecto obtenidos de `new ConfigurableReplacer().getDefaultReplacements()`.
2.  Llama a `loadSavedConfig()` para intentar cargar una configuración previa desde `localStorage` usando el `instanceId` actual ("default").

### Carga de Configuración Guardada (`loadSavedConfig`)

Este método:

1.  Lee del `localStorage` la clave correspondiente al `instanceId` actual (`configReplacer_default`).
2.  Si encuentra datos guardados, los parsea como JSON.
3.  Actualiza las señales `instanceId`, `removeBackslashes`, `useLocalStorage` y `replacements` con los valores cargados. Los valores `removeBackslashes` y `useLocalStorage` tienen un fallback a `true` si no están definidos en los datos guardados.
4.  Transforma el objeto de `replacements` guardado (donde la clave es el patrón) a la estructura de array que usa el estado del componente, añadiendo un `id` único a cada item.
5.  Incluye manejo de errores para la lectura y parseo.

### Renderizado

Renderiza un contenedor principal (`div.replacer-app-container`) con una "tarjeta" de configuración (`div.config-card`) que contiene:

*   Un encabezado con títulos.
*   Un cuerpo (`div.config-card-body`) que aloja los componentes hijos:
    *   `TestReplacer`: Pasa las señales de estado como props para que el componente de prueba pueda usar la configuración actual.
    *   `ReplacerConfigForm`: Pasa las señales de estado (y funciones para actualizarlas) para que el formulario pueda modificar la configuración y notificar al componente padre.

---

## `ConfigurableReplacer.ts` - Clase Principal de Lógica

### Propósito

Esta clase encapsula la lógica para realizar reemplazos de patrones en cadenas de texto y estructuras de datos anidadas (objetos, arrays). Puede ser configurada con diferentes sets de patrones, opciones de procesamiento y persistencia local.

### Constructor (`constructor(options: ConfigOptions = {})`)

*   Inicializa la configuración de la instancia fusionando valores por defecto con las opciones proporcionadas.
*   Establece `instanceId`, `replacements`, `removeBackslashes`, `useLocalStorage` y `localStorageKeys`. Los reemplazos por defecto (`getDefaultReplacements()`) se usan si no se proveen opciones de reemplazo.
*   Si `useLocalStorage` es `true` en la configuración resultante, llama automáticamente a `loadConfig()` para intentar cargar la configuración persistida para esa `instanceId`.

### Configuración (`interface Config`)

Define la estructura interna de la configuración que maneja la clase:

*   `instanceId: string`: El identificador de la configuración guardada/cargada.
*   `replacements: ReplacementConfig`: Un objeto donde las claves son los patrones a buscar y los valores son objetos `ReplacementOption` (`dataKey`, `defaultValue`).
*   `removeBackslashes: boolean`: Indica si eliminar barras invertidas del resultado.
*   `useLocalStorage: boolean`: Controla la persistencia en `localStorage`.
*   `localStorageKeys: LocalStorageKeys`: Mapeo de nombres de claves lógicas (como `playerName`) a posibles claves en los datos de entrada. (El código proporcionado solo usa `replacements`, `removeBackslashes` y `useLocalStorage` de esta config interna para guardar/cargar, y `localStorageKeys` parece no usarse actualmente en los métodos de reemplazo, aunque está definido).

### Reemplazos por Defecto (`getDefaultReplacements`)

Un método público que devuelve un objeto `ReplacementConfig` con un conjunto predefinido de patrones comunes y sus correspondientes `dataKey` y `defaultValue`. Esto sirve como punto de partida si no se define una configuración personalizada.

### Persistencia Local (`loadConfig`, `saveConfig`)

*   `loadConfig()`: Intenta cargar la configuración desde `localStorage` usando la `instanceId`. Si encuentra datos, fusiona la configuración guardada con la configuración actual de la instancia, dando prioridad a los valores guardados (especialmente en los `replacements`, donde fusiona los patrones guardados sobre los existentes).
*   `saveConfig()`: Guarda el objeto de configuración actual de la instancia (`this.config`) en `localStorage` bajo la clave `configReplacer_${this.config.instanceId}`. Ambas operaciones solo proceden si `this.config.useLocalStorage` es `true`.

### Métodos de Reemplazo

La clase proporciona métodos para realizar el reemplazo, incluyendo manejo de estructuras anidadas y tracking.

*   `replace(input: ProcessableInput, data: ReplacementData = {}): any`:
    *   Método público principal para realizar el reemplazo.
    *   Toma una entrada `input` (que puede ser string, number, boolean, null, array u object) y un objeto `data` con los valores a usar para los reemplazos.
    *   Llama recursivamente a `processRecursively` para manejar estructuras anidadas.
    *   Devuelve el resultado procesado.

*   `replaceWithTracking(input: ProcessableInput, data: ReplacementData = {}): ReplacementResult`:
    *   Similar a `replace`, pero también rastrea qué patrones fueron reemplazados y con qué valores.
    *   Llama recursivamente a `processRecursivelyWithTracking`.
    *   Devuelve un objeto `ReplacementResult` que contiene el `result` procesado y un `replacementMap`.
    *   `replacementMap`: Un `Map` donde la clave es el valor final reemplazado y el valor es un objeto `ReplacementMapping` (`original` pattern, `dataKey`, `replaced` value). **Nota:** Si varios patrones resultan en el mismo valor de reemplazo, el mapa solo retendrá el último. Si un patrón aparece varias veces en el texto, el tracking lo registrará múltiples veces en el bucle interno, pero el `Map` solo tendrá una entrada única por cada *valor final* reemplazado.

*   `processRecursively(input, data)` y `processRecursivelyWithTracking(input, data, replacementMap)`:
    *   Métodos privados que manejan la lógica de recorrer la estructura de entrada (`input`).
    *   Si `input` es un string, llaman a `replaceInString` o `replaceInStringWithTracking`.
    *   Si es un array, itera sobre sus elementos llamándose a sí mismos.
    *   Si es un objeto, itera sobre sus valores llamándose a sí mismos.
    *   Otros tipos de datos se devuelven sin modificar.

*   `replaceInString(text, data)` y `replaceInStringWithTracking(text, data, replacementMap)`:
    *   Métodos privados que realizan el reemplazo real dentro de una sola cadena de texto.
    *   Iteran sobre los `replacements` configurados.
    *   Para cada patrón, determinan el valor a reemplazar usando `data[dataKey]` o `defaultValue`.
    *   Crean una expresión regular (`RegExp`) global a partir del patrón (escapando caracteres especiales).
    *   Usan `string.replace(regex, value)` para realizar el reemplazo.
    *   `replaceInStringWithTracking` adicionalmente recorre el *texto original* para encontrar las ocurrencias del patrón y registrar la información en el `replacementMap`.
    *   Si `config.removeBackslashes` es `true`, eliminan todas las barras invertidas del resultado final del string.

*   `escapeRegExp(string)`:
    *   Método privado utilitario para escapar caracteres especiales dentro de un string de patrón para que pueda ser usado de forma segura en una expresión regular.

---

## `ReplacerConfigForm.jsx` - Formulario de Configuración

### Propósito

Gestiona la interfaz para ver, añadir, modificar y eliminar reglas de reemplazo individuales. También maneja las acciones de guardar, importar y exportar la configuración.

### Estado

Utiliza un `createStore` (`solid-js/store`) para manejar el array de `replacements`. Esto permite actualizaciones granulares a items individuales en el array sin reemplazar todo el array cada vez, lo cual es eficiente para listas largas.

### Sincronización con Props

*   Un `createEffect` inicial sincroniza el store local `replacements` con el array `props.replacements` que viene del componente padre (`ReplacerConfig`). Esto es útil si la lista de reemplazos se carga o cambia externamente (por ejemplo, al importar).
*   Otro `createEffect` monitorea los cambios en el store `replacements` local y llama a `props.onReplacementsChange()` para notificar al componente padre (`ReplacerConfig`) sobre los cambios, manteniendo el estado del padre actualizado.

### Funcionalidad

*   `addReplacement()`: Añade un nuevo objeto de reemplazo vacío al store con un `id` único.
*   `removeReplacement(id)`: Elimina un objeto de reemplazo del store basado en su `id`.
*   `updateReplacement(id, field, value)`: Actualiza un campo específico (`pattern`, `dataKey`, `defaultValue`) de un objeto de reemplazo en el store basado en su `id`. Usa la sintaxis de actualización granular de `solid-js/store`.

### Acciones de Configuración

*   `saveConfiguration()`:
    *   Construye un objeto de configuración (`removeBackslashes`, `useLocalStorage`, `replacements`).
    *   Transforma el array de reemplazos del store de nuevo a la estructura de objeto (`{ pattern: { dataKey, defaultValue } }`). Solo incluye patrones que tengan `pattern` y `dataKey` no vacíos.
    *   Crea una *nueva* instancia de `ConfigurableReplacer` con esta configuración construida.
    *   Llama al método `saveConfig()` de esta nueva instancia.
    *   Guarda la misma configuración bajo la clave `configReplacer_default` directamente en `localStorage` (esto parece redundante si `replacer.saveConfig()` ya usa la instancia 'default' por defecto).
*   `exportConfig()`:
    *   Construye el objeto de configuración de manera similar a `saveConfiguration`.
    *   Añade una marca de tiempo `exportedAt`.
    *   Crea un Blob con el JSON de la configuración.
    *   Crea un enlace de descarga (`<a>`) programáticamente y simula un click para descargar el archivo JSON.
*   `importConfig()`:
    *   Crea un input de tipo `file` programáticamente y simula un click para abrir el diálogo de selección de archivo.
    *   Cuando se selecciona un archivo (`.json`), lo lee.
    *   Parsea el contenido como JSON.
    *   Si el parseo es exitoso, llama a las funciones `on...Change` de las props para actualizar el estado del componente padre (`ReplacerConfig`) con los valores importados (`instanceId` fijado a 'default', `removeBackslashes` y `useLocalStorage` fijados a `true`, y la lista de `replacements` transformada de objeto a array con `id`s).
    *   Muestra mensajes de éxito o error.

### Renderizado

Renderiza una sección con un encabezado y un div para la lista de reemplazos. Utiliza el componente `For` de SolidJS para iterar sobre el store `replacements` y renderizar un `ReplacementItemForm` (no proporcionado) por cada item. Incluye botones para las acciones de añadir, guardar, importar y exportar.

---

## `TestReplacer.jsx` - Área de Pruebas

### Propósito

Proporciona una interfaz para probar la funcionalidad de reemplazo en tiempo real con datos de entrada y datos de reemplazo configurables.

### Estado y Gestión

Utiliza señales de SolidJS (`createSignal`) para manejar:

*   `testInput`: La cadena de texto o JSON a procesar.
*   `testData`: El JSON con los datos a usar para los reemplazos.
*   `testResult`: El resultado del proceso de reemplazo.
*   `replacementMap`: El mapa de tracking de reemplazos obtenido de `replaceWithTracking`.
*   `resultError`: Booleano para indicar si ocurrió un error durante la prueba.

### Instancia Reactiva de `ConfigurableReplacer` (`createMemo`)

*   Utiliza `createMemo` para crear una instancia de `ConfigurableReplacer` que se recalcula cada vez que cambian las props relevantes (`props.replacements`, `props.removeBackslashes`, `props.useLocalStorage`).
*   Dentro del memo, construye el objeto de reemplazos en el formato que espera el constructor de `ConfigurableReplacer` a partir del array `props.replacements`.

### Lógica de Prueba (`testReplace`)

*   Se ejecuta al hacer click en el botón "Probar Reemplazo" y también `onMount`.
*   Intenta parsear `testData` como JSON. Si falla, usa un objeto vacío.
*   Intenta parsear `testInput` como JSON. Si falla (o no es un JSON válido), lo trata como una cadena simple.
*   Obtiene la instancia actual de `ConfigurableReplacer` del memo.
*   Intenta cargar la configuración desde `localStorage` usando `props.instanceId` y, si existe, actualiza la configuración interna de la instancia del replacer (`currentReplacer.config`). **Nota:** Esto sobreescribe la configuración que ya se había pasado al constructor vía props y `createMemo`, lo cual puede ser un comportamiento intencional (siempre probar con la config *guardada* localmente para esa instancia) o una fuente de confusión (si se espera probar siempre con la config *actualmente editada* en el formulario *antes* de guardarla). La lógica actual carga la config guardada al probar.
*   Llama a `currentReplacer.replaceWithTracking()` con la entrada y los datos parseados.
*   Almacena el resultado (`result`) y el mapa de tracking (`replacementMap`) en las señales correspondientes.
*   Formatea el resultado para mostrarlo (JSON con indentación si es un objeto, o la cadena tal cual).
*   Maneja errores, mostrando un mensaje y limpiando el mapa de tracking.

### Renderizado

Presenta dos áreas de texto para "Entrada de Prueba" y "Datos de Prueba (JSON)", un botón para ejecutar la prueba, y un área de "Resultado". Utiliza el componente `HighlightedResult` (si `resultError` es falso y hay `testResult`) para mostrar el resultado procesado, pasándole el `testResult` y el `replacementMap` para que pueda resaltar los reemplazos. Si hay un error, muestra el mensaje de error en un div simple.

---

## Uso para MCPs (Minimum Changeable Products / Desarrolladores)

La funcionalidad está diseñada para ser utilizada de varias maneras:

1.  **Como Componente Completo (`ReplacerConfig`)**: La forma más sencilla es integrar el componente `ReplacerConfig.jsx` directamente en una página o sección de administración de la aplicación. Esto proporciona la interfaz completa para que un usuario configure los patrones, los pruebe y gestione (guarde, importe, exporte) las configuraciones persistidas localmente.

    ```jsx
    import ReplacerConfig from './ReplacerConfig';

    function MyAdminPage() {
      return (
        <div>
          <h2>Administración de Reemplazos</h2>
          <ReplacerConfig />
        </div>
      );
    }
    ```

2.  **Usando la Clase `ConfigurableReplacer` Programáticamente**: La clase `ConfigurableReplacer` puede ser instanciada y utilizada en cualquier parte de la aplicación para realizar reemplazos basados en una configuración.

    ```typescript
    import { ConfigurableReplacer, ReplacementData } from './ConfigurableReplacer';

    // Opción 1: Usar la configuración por defecto o una instancia específica guardada
    const replacer = new ConfigurableReplacer({ instanceId: 'myFeatureConfig', useLocalStorage: true }); // Intentará cargar 'myFeatureConfig'

    // Opción 2: Crear una instancia con una configuración específica en tiempo de ejecución
    const customConfig = {
      replacements: {
        username: { dataKey: 'userName', defaultValue: 'Usuario Anónimo' },
        '{productName}': { dataKey: 'product', defaultValue: 'Item' }
      },
      removeBackslashes: false,
      useLocalStorage: false // No cargar/guardar automáticamente esta instancia
    };
    const customReplacer = new ConfigurableReplacer(customConfig);

    // Datos para el reemplazo
    const data: ReplacementData = {
      userName: 'Alice',
      product: 'Laptop'
    };

    // Entrada a procesar
    const inputText = "Hola, username! Tu {productName} ha sido enviado.";
    const inputObject = {
      title: "Confirmación de Envío para username",
      body: "Tu pedido de {productName} está en camino.",
      details: ["Tracking: ABC\\123", "Producto: {productName}"]
    };

    // Realizar reemplazo
    const resultText = replacer.replace(inputText, data);
    const resultObject = customReplacer.replace(inputObject, data);
    const { result: resultTextTracked, replacementMap } = replacer.replaceWithTracking(inputText, data);


    console.log(resultText); // Salida dependerá de la config cargada/defecto y data
    console.log(resultObject); // Salida dependerá de customConfig y data
    console.log(replacementMap); // Mapa con el tracking de los reemplazos
    ```

### Consideraciones Adicionales:

*   **`instanceId`**: Es crucial si se necesitan diferentes conjuntos de configuraciones persistidas en `localStorage` para distintas partes o usos de la aplicación. Asegúrate de usar un `instanceId` único y consistente para cada propósito.
*   **`ReplacementData`**: El objeto de datos (`data`) pasado a los métodos `replace` debe tener claves que coincidan con los `dataKey` definidos en la configuración de los reemplazos. Los valores pueden ser strings, numbers, o `undefined`.
*   **Estructuras Anidadas**: La clase `ConfigurableReplacer` maneja automáticamente el reemplazo dentro de arrays y objetos anidados.
*   **Tracking**: El método `replaceWithTracking` es útil si necesitas saber *qué* partes del texto original fueron reemplazadas y *con qué* valor final, lo cual es usado por el componente `HighlightedResult`.
*   **Personalización**: Los patrones de reemplazo (`pattern`) pueden ser simples palabras (`uniqueId`) o frases (`{likes}`). La implementación usa expresiones regulares con el flag global (`g`) y escapa caracteres especiales en el patrón para que coincidan literalmente donde aparezcan en el texto.
*   **Componentes Auxiliares**: Para usar completamente la UI proporcionada, necesitarás los componentes `ReplacementItemForm.jsx` y `HighlightedResult.jsx`, que no fueron incluidos pero son necesarios para el formulario de la lista y la visualización resaltada del resultado de la prueba, respectivamente.

---

Este documento cubre la estructura y funcionamiento de los componentes y la clase `ConfigurableReplacer` basándose en el código fuente proporcionado.