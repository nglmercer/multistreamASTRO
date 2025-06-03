# Integración de bot de texto a voz

Esta documentación describe cómo integrar bot de texto a voz.

## Descripción General

Existen 3 proveedores de audio integrados:
- StreamElementsApi : [StreamElements](https://streamelements.com/)
- ResponsiveVoiceApi : [ResponsiveVoice](https://responsivevoice.org/)
- webSpeechApi : [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)

tanto StreamElementsApi como ResponsiveVoiceApi son API de terceros tienen limites y siempre consumen datos y trafico en la red, mientras que la webSpeechApi es una API nativa de la web, pero depende del navegador y la compatibilidad del sistema.

## Integracion inicial
por defecto no se habilita ningun proveedor de audio, para habilitarlo haga esto:
- Añada una accion con la opcion de  Texto-a-Voz 
- Añada algun evento y selecciona la accion creada
- si no funciona seleccione algun proveedor de audio diferente
### Documentación y Pruebas de Reemplazo de Valores

Para más detalles sobre el reemplazo de valores, consulta [Reemplazar Variables](/Setconfig).
- recomiendo utilizar `uniqueId dice comment` o directamente solo `comment`
