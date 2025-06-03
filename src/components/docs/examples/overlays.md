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
#### Salida o URL del Overlay
puede utilizar tanto la url local como la url remota
- url local : `localhost:9001/widgets/overlay`
- url remota : `https://nglmercer.github.io/multistreamASTRO/widgets/overlay/?host=http://localhost:9001`
