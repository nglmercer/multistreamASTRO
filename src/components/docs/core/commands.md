# Integración de Comandos de Minecraft

Esta documentación describe cómo interactuar con un servidor de Minecraft utilizando una API REST basada en el repositorio [Minecraft-server](https://github.com/nglmercer/server-minecraft-dashboard).

## Descripción General

La API REST permite gestionar servidores de Minecraft mediante diferentes acciones, como iniciar, detener, reiniciar, enviar comandos, obtener logs, información del servidor, jugadores, métricas, y más.

### Documentación y Pruebas de Reemplazo de Valores

Para más detalles sobre el reemplazo de valores, consulta [Reemplazar Variables](/docs/replacevalues).

### API REST

#### Endpoint: `/servermanager/:serverName/:action`

- **Métodos HTTP**: GET, POST

#### Parámetros

- `:serverName`: Nombre del servidor.
- `:action`: Acción a realizar. Las acciones válidas son: `start`, `stop`, `restart`, `send`, `sendMultiple`, `log`, `info`, `players`, `metrics`, `kill`.

### Variables y Constantes

#### Variables Disponibles

- `:serverName`: Nombre del servidor.
- `:action`: Acción a realizar.

#### Constantes Disponibles

```typescript
type actions = 'start' | 'stop' | 'restart' | 'send' | 'sendMultiple' | 'log' | 'info' | 'players' | 'metrics' | 'kill';
```
