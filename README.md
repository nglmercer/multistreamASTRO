# Uso

multistreamASTRO es una plataforma de automatización para streamers que permite crear respuestas automáticas a eventos en tiempo real de plataformas como TikTok y Kick.

## Configuración Inicial

### 1. Conexión a Plataformas

La aplicación se conecta automáticamente a las APIs de streaming a través del login:
- tiktok
- kick

### 2. Interfaz Principal

Accede a la interfaz de configuración de acciones en `/actions` donde encontrarás:

- **Botones de Eventos**: Para crear acciones basadas en diferentes tipos de eventos [2](#0-1) 
- **Tablas de Gestión**: Para ver y editar acciones existentes
- **Formularios Dinámicos**: Para configurar respuestas automáticas

## Creación de Acciones Automáticas

### Tipos de Eventos Disponibles

| Evento | Descripción | Plataforma |
|--------|-------------|------------|
| **Comentario** | Mensajes del chat | TikTok, Kick |
| **Bits** | Donaciones con bits | TikTok |
| **Likes** | Reacciones de corazón | TikTok |
| **Regalo** | Regalos virtuales | TikTok |

### Configuración de Respuestas

Cada acción puede incluir múltiples tipos de respuesta [3](#0-2) :

- **Text-to-Speech (TTS)**: Síntesis de voz para leer mensajes
- **Overlays**: Elementos visuales superpuestos
- **Comandos Minecraft**: Ejecución de comandos en servidor
- **Simulación de Teclas**: Automatización de entrada de teclado

### Ejemplo de Configuración

1. Haz clic en "Evento Comentario"
2. Completa el formulario:
   - **Nombre**: "Saludo Automático"
   - **TTS habilitado**: ✓
   - **Texto TTS**: "¡Hola {username}!"
   - **Overlay habilitado**: ✓
   - **Duración**: 5 segundos
3. Guarda la configuración

## Filtros y Reglas Avanzadas

### Filtros de Contenido

El sistema incluye middlewares para filtrar eventos [4](#0-3) :

- **Palabras Bloqueadas**: Filtra mensajes con contenido prohibido
- **Palabras Requeridas**: Solo procesa mensajes que contengan términos específicos
- **Prevención de Spam**: Evita acciones repetitivas del mismo usuario

### Configuración de Filtros

Los filtros se configuran mediante localStorage:
```javascript
// Palabras bloqueadas para chat
localStorage.setItem('blockedChatKeywords', JSON.stringify(['spam', 'bot']));
```

## Gestión de Datos

### Almacenamiento

- **Configuraciones de Acciones**: IndexedDB (`ActionsDB`)
- **Historial de Eventos**: localStorage (`TiktokEvents`)
- **Filtros**: localStorage (claves específicas)

### Exportar/Importar Configuraciones

Las configuraciones se pueden respaldar accediendo a las herramientas de desarrollador del navegador y exportando los datos de IndexedDB.

## Eventos en Tiempo Real

### Visualización del Chat

Los eventos aparecen en tiempo real en la interfaz de chat [5](#0-4) :

- **Mensajes de Chat**: Con badges de usuario y menús contextuales
- **Regalos**: Con imágenes y contadores de repetición
- **Eventos Especiales**: Follows, suscripciones, etc.

### Monitoreo de Conexiones

El estado de conexión se muestra en la interfaz:
- 🟢 Conectado a TikTok/Kick
- 🔴 Desconectado
- 🟡 Reconectando

## Solución de Problemas

### Problemas Comunes

1. **No se reciben eventos**: Verifica la API key y la conexión a internet
2. **TTS no funciona**: Asegúrate de que ResponsiveVoice esté cargado
3. **Acciones no se ejecutan**: Revisa los filtros y reglas configuradas

### Logs de Depuración

Abre las herramientas de desarrollador (F12) para ver logs detallados del sistema de eventos y conexiones.
#### Test de deploy en [/](https://github.com/nglmercer/multistreamASTRO)

