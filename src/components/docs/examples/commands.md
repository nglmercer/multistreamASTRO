# Integración de Comandos de Minecraft

Esta documentación describe cómo interactuar con un servidor de Minecraft utilizando una API REST basada en el repositorio [Minecraft-server](https://github.com/nglmercer/server-minecraft-dashboard).

## Descripción General

La API REST permite gestionar servidores de Minecraft mediante diferentes acciones, como iniciar, detener, reiniciar, enviar comandos, obtener logs, información del servidor, jugadores, métricas, y más.

### Documentación y Pruebas de Reemplazo de Valores

Para más detalles sobre el reemplazo de valores, consulta [Reemplazar Variables](/Setconfig).

### API REST

#### Endpoint: `/servermanager/:serverName/:action`

- **Métodos HTTP**: GET, POST

#### Parámetros

- `:serverName`: Nombre del servidor.
- `:action`: Acción a realizar. Las acciones válidas son: `start`, `stop`, `restart`, `send`, `sendMultiple`, `log`, `info`, `players`, `metrics`, `kill`.

#### Ejemplos de Uso

##### GET

- **Ejemplo para `send`:**
  - URL: `/servermanager/NombreDelServidor/send?cmd=say%20hello`
  - Descripción: Envía el comando `say hello` al servidor especificado.

- **Ejemplo para `sendMultiple`:**
  - URL: `/servermanager/NombreDelServidor/sendMultiple?cmds=["say%20hello", "give%20player1%20diamond"]`
  - Descripción: Envía múltiples comandos al servidor especificado.

##### POST

- **Ejemplo para `send`:**
  - URL: `/servermanager/NombreDelServidor/send`
  - Cuerpo de la solicitud (Body):
    ```json
    {
      "cmd": "say hello"
    }
    ```
  - Descripción: Envía el comando `say hello` al servidor especificado.

- **Ejemplo para `sendMultiple`:**
  - URL: `/servermanager/NombreDelServidor/sendMultiple`
  - Cuerpo de la solicitud (Body):
    ```json
    {
      "cmds": [
        "say uniqueId say hello",
        "say uniqueId say comment",
        "say uniqueId give {likes} likes"
      ]
    }
    ```
  - Descripción: Envía múltiples comandos al servidor especificado.

### Variables y Constantes

#### Variables Disponibles

- `:serverName`: Nombre del servidor.
- `:action`: Acción a realizar.

#### Constantes Disponibles

```typescript
type actions = 'start' | 'stop' | 'restart' | 'send' | 'sendMultiple' | 'log' | 'info' | 'players' | 'metrics' | 'kill';
```