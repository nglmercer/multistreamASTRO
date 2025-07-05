# Integración de Overlays

Esta documentación describe cómo integrar overlays.

## Descripción General

Los actions overlay permite enviar a una cola de overlays `tasks []` y se procesan uno por uno.

### Documentación y Pruebas de Reemplazo de Valores

Para más detalles sobre el reemplazo de valores, consulta [Reemplazar Variables](/Setconfig).

- configurar un overlay
[Reemplazar Variables](/Actions)
en el formulario de acciones (Superposición||overlay) se puede configurar tanto imagenes como videos
```yaml
overlay:
    - Fuente  Fuente(s) (IDs/URLs) 
    - Texto Contenido 
    - Duración (segundos) 
    - Volumen (%) 
```
- Fuente(s) (IDs/URLs) : puede ser una imagen o un video:
la url externa solo copia y pega una,O si es local siempre coloca `/media/URL DEL ARCHIVO`
- ejemplos:
   - local : `/media/d:/imagen.jpg` || `/media/home/melser/imagen.jpg`
   - url : `https://example.com/imagen.jpg`