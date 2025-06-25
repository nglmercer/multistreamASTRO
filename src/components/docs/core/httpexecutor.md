# Documentación: Módulo de Peticiones HTTP

Este documento describe un sistema de dos partes diseñado para configurar y ejecutar peticiones HTTP. Está compuesto por un componente web visual (`<http-request-config>`) y una clase lógica (`HttpRequestExecutor`).

## 1. Resumen y Caso de Uso: ¿Para qué sirve este código?

Para responder directamente a tu pregunta: **este código sirve para ambas cosas: guardar la configuración de una petición Y para ejecutarla (hacer tests).**

Imagina que estás construyendo una herramienta como Postman o Insomnia. Necesitas dos cosas fundamentales:

1.  **Una Interfaz de Usuario (UI):** Un formulario donde el usuario pueda definir todos los detalles de una petición HTTP: la URL, el método (GET, POST), los headers, los parámetros, el tipo de autenticación y el cuerpo (body) de la petición.
2.  **Un Motor de Ejecución:** Una vez que el usuario ha definido la petición, necesitas un "motor" que tome esa configuración y la envíe de verdad a un servidor para obtener una respuesta.

Este código te proporciona ambas piezas:

*   **`<http-request-config>` (El Componente Visual):** Es la **interfaz de usuario**. Su propósito es permitir a un usuario crear o modificar la configuración de una petición de forma visual y amigable. Cuando el usuario termina, puedes obtener un objeto JavaScript (`RequestConfig`) que contiene toda esa información.

*   **`HttpRequestExecutor` (La Lógica de Ejecución):** Es el **motor**. Su trabajo es tomar el objeto `RequestConfig` (generado por el componente o creado manualmente) y realizar la petición HTTP real. Devuelve una respuesta estructurada con el estado, los datos, la duración, etc.

### Flujo de Trabajo Típico:

1.  **Configurar:** Muestras el componente `<http-request-config>` en tu aplicación. El usuario rellena los campos.
2.  **Obtener Configuración:** Cuando el usuario hace clic en un botón "Enviar" o "Guardar" en tu aplicación, llamas al método `.getVal()` del componente para obtener el objeto `RequestConfig`.
3.  **Decidir qué hacer:**
    *   **Para Probar/Ejecutar:** Creas una instancia de `HttpRequestExecutor`, le pasas el objeto `RequestConfig` y llamas a `.execute()`. Muestras la respuesta al usuario.
    *   **Para Guardar:** Tomas el objeto `RequestConfig`, lo conviertes a una cadena JSON (`JSON.stringify(config)`) y lo guardas en donde necesites (localStorage, una base de datos, un archivo). Más tarde, puedes cargar esa configuración, pasarla al componente con `.setVal()` para que el usuario la vea o la edite, y volver a ejecutarla.

---

## 2. Interfaces de Datos Compartidas

Estas son las estructuras de datos (objetos) que utilizan tanto el componente como el ejecutor.

### `KeyValue`
Describe un par clave-valor, usado para headers y parámetros.

| Propiedad | Tipo      | Descripción                                   |
|-----------|-----------|-----------------------------------------------|
| `key`     | `string`  | La clave del par (ej. 'Content-Type').        |
| `value`   | `string`  | El valor del par (ej. 'application/json').    |
| `enabled` | `boolean` | Si el par debe ser incluido en la petición.    |

### `AuthConfig`
Describe la configuración de autenticación.

| Propiedad  | Tipo                           | Descripción                                     |
|------------|--------------------------------|-------------------------------------------------|
| `type`     | `'none' \| 'bearer' \| 'basic'` | El tipo de autenticación a utilizar.            |
| `token`    | `string`                       | El token para la autenticación de tipo `bearer`. |
| `username` | `string`                       | El nombre de usuario para `basic` auth.         |
| `password` | `string`                       | La contraseña para `basic` auth.                |

### `RequestConfig`
El objeto principal que define una petición HTTP completa.

| Propiedad  | Tipo                                         | Descripción                                                  |
|------------|----------------------------------------------|--------------------------------------------------------------|
| `name`     | `string`                                     | Un nombre descriptivo para la petición.                      |
| `url`      | `string`                                     | La URL del endpoint al que se hará la petición.              |
| `method`   | `string`                                     | El método HTTP (ej. 'GET', 'POST').                          |
| `headers`  | `KeyValue[]`                                 | Un array de `KeyValue` para los headers de la petición.      |
| `params`   | `KeyValue[]`                                 | Un array de `KeyValue` para los parámetros de la URL (query). |
| `body`     | `string`                                     | El cuerpo de la petición como una cadena de texto.           |
| `bodyType` | `'json' \| 'text' \| 'form' \| 'urlencoded'` | El formato del cuerpo.                                       |
| `auth`     | `AuthConfig`                                 | La configuración de autenticación.                           |

### `RequestResponse`
El objeto que devuelve `HttpRequestExecutor` tras ejecutar una petición.

| Propiedad    | Tipo                     | Descripción                                                              |
|--------------|--------------------------|--------------------------------------------------------------------------|
| `success`    | `boolean`                | `true` si la petición fue exitosa (status 2xx), `false` en caso contrario. |
| `status`     | `number`                 | El código de estado HTTP de la respuesta (ej. 200, 404).                 |
| `statusText` | `string`                 | El texto del estado HTTP (ej. 'OK', 'Not Found').                        |
| `headers`    | `Record<string, string>` | Un objeto con los headers de la respuesta.                               |
| `data`       | `any`                    | El cuerpo de la respuesta, parseado (JSON, texto, blob).                 |
| `error?`     | `string`                 | Un mensaje de error si la petición falló a nivel de red.                 |
| `duration`   | `number`                 | El tiempo que tardó la petición en completarse (en milisegundos).        |
| `size`       | `number`                 | El tamaño del cuerpo de la respuesta (en bytes).                         |

---

## 3. Componente: `<http-request-config>`

Un componente web (basado en Lit) que proporciona una interfaz de usuario para construir un objeto `RequestConfig`.

### Uso Básico

```html
<!-- En tu HTML -->
<http-request-config id="request-builder"></http-request-config>

<script>
  // En tu JavaScript
  const builder = document.getElementById('request-builder');

  // Escuchar cambios en la configuración
  builder.addEventListener('config-change', (event) => {
    console.log('La configuración ha cambiado:', event.detail);
  });

  // Para obtener la configuración actual
  const currentConfig = builder.getVal();

  // Para establecer una configuración desde código
  const myConfig = { /* ... un objeto RequestConfig ... */ };
  builder.setVal(myConfig);
</script>
```

### Propiedades (Properties)

| Atributo / Propiedad | Tipo                               | Descripción                                                                                                 |
|----------------------|------------------------------------|-------------------------------------------------------------------------------------------------------------|
| `value` / `config`   | `RequestConfig`                    | El objeto principal que contiene la configuración de la petición. Puedes leerlo o modificarlo programáticamente. |
| `theme`              | `'auto' \| 'light' \| 'dark'`      | Controla el tema visual del componente. `'auto'` usa la preferencia del sistema. Se puede cambiar dinámicamente. |
| `mode`               | `'create' \| 'edit'`               | (Propiedad declarada) Indica si el componente está en modo creación o edición. Por defecto es `'create'`.        |

### Métodos Públicos

| Método                  | Parámetros                      | Devuelve                      | Descripción                                                         |
|-------------------------|---------------------------------|-------------------------------|---------------------------------------------------------------------|
| `getVal()` / `getConfig()` | `void`                          | `RequestConfig`               | Devuelve una copia del objeto de configuración actual.              |
| `setVal(config)` / `setConfig(config)` | `config: RequestConfig`         | `void`                        | Establece la configuración del componente desde un objeto externo.  |
| `reset()`               | `void`                          | `void`                        | Restablece el formulario a su estado inicial por defecto.           |
| `validate()`            | `void`                          | `{ isValid: boolean, errors: string[] }` | Valida los campos principales (nombre, URL, JSON) y devuelve el resultado. |

### Eventos

| Nombre de Evento  | `event.detail` | Descripción                                                                      |
|-------------------|----------------|----------------------------------------------------------------------------------|
| `config-change`   | `RequestConfig`| Se dispara cada vez que el usuario modifica cualquier parte de la configuración. |

### Características de la Interfaz

*   **Pestañas (Tabs):** Organización clara para `Parámetros`, `Headers`, `Auth` y `Body`.
*   **Editor Clave-Valor:** Permite añadir, eliminar y activar/desactivar `Headers` y `Parámetros` fácilmente.
*   **Manejo de Autenticación:** Soporta `Bearer Token` y `Basic Auth` con campos dedicados.
*   **Visibilidad de Datos Sensibles:** Un botón con un icono de ojo (👁️/🙈) para ocultar o mostrar contraseñas y tokens.
*   **Cuerpo Inteligente:** La pestaña `Body` se deshabilita para métodos como `GET` que no lo soportan.
*   **Tema Claro/Oscuro:** Incluye un botón para alternar el tema y también respeta la configuración del sistema operativo.

---

## 4. Clase: `HttpRequestExecutor`

Una clase de JavaScript/TypeScript pura y sin dependencias externas (salvo la API `fetch` nativa) que ejecuta peticiones HTTP a partir de un objeto `RequestConfig`.

### Uso Básico

```javascript
import { HttpRequestExecutor } from './http-request-executor.js';

// 1. Obtén o crea un objeto de configuración
const config = {
  name: 'Get User Data',
  url: 'https://jsonplaceholder.typicode.com/users/1',
  method: 'GET',
  headers: [],
  params: [],
  body: '',
  bodyType: 'json',
  auth: { type: 'none' }
};

// 2. Crea una instancia del ejecutor
const executor = new HttpRequestExecutor();

// 3. Ejecuta la petición
async function runRequest() {
  console.log('Enviando petición...');
  const response = await executor.execute(config);

  if (response.success) {
    console.log('Respuesta recibida:', response.status, response.statusText);
    console.log('Datos:', response.data);
  } else {
    console.error('Error en la petición:', response.error);
  }
  console.log(`Duración: ${response.duration}ms, Tamaño: ${response.size} bytes`);
}

runRequest();
```

### Métodos Principales

| Método                 | Parámetros                                   | Devuelve                          | Descripción                                                                                                                              |
|------------------------|----------------------------------------------|-----------------------------------|------------------------------------------------------------------------------------------------------------------------------------------|
| `execute(config, timeout?)` | `config: RequestConfig`, `timeout?: number`  | `Promise<RequestResponse>`        | Ejecuta una única petición HTTP. Construye la URL, headers y body a partir del objeto `config`. Maneja timeouts y errores de red.         |
| `executeMultiple(configs)` | `configs: RequestConfig[]`                   | `Promise<RequestResponse[]>`      | Ejecuta múltiples peticiones en paralelo. Devuelve un array de resultados, incluso si algunas peticiones fallan.                      |

### Funciones de Ayuda (Helpers)

| Función                     | Parámetros                      | Devuelve                   | Descripción                                                                 |
|-------------------------------|---------------------------------|----------------------------|-----------------------------------------------------------------------------|
| `executeHttpRequest(config)`  | `config: RequestConfig`         | `Promise<RequestResponse>` | Una función de atajo que crea un `HttpRequestExecutor` y ejecuta una petición. |
| `createHttpExecutor(options)` | `options?: { timeout: number }` | `HttpRequestExecutor`      | Una función "fábrica" para crear una instancia del ejecutor con opciones por defecto, como un `timeout` global. |

### Características Clave

*   **Construcción Automática:** Genera la URL final con parámetros, añade los headers de autenticación y formatea el cuerpo de la petición según `bodyType`.
*   **Manejo de `Content-Type`:** Añade el `Content-Type` correcto para JSON, Texto, etc., si no ha sido especificado por el usuario en los headers.
*   **Parsing Inteligente de Respuesta:** Intenta convertir la respuesta a JSON si el `Content-Type` es `application/json`, a texto para otros tipos, o a Blob para binarios.
*   **Manejo de Errores Robusto:** Captura errores de red (ej. DNS no encontrado) y de timeout, devolviendo un objeto `RequestResponse` con `success: false` y un mensaje de error.
*   **Métricas de Rendimiento:** Calcula y devuelve automáticamente la duración de la petición y el tamaño de la respuesta.