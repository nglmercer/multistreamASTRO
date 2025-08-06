// my-templates.ts
import type { RequestTemplate } from './types';

/**
 * Plantilla para enviar un objeto JSON simple con una clave "text".
 * Esto se renderizará como un campo de entrada de texto en la pestaña Body.
 */
export const simpleTextTemplate: RequestTemplate = {
  // --- Metadatos de la Plantilla ---
  id: 'text-post',
  name: 'Enviar Texto (POST)',
  icon: 'text_snippet',
  description: 'Una plantilla para enviar un objeto JSON con un solo campo de texto.[An Internal Link to a Section Heading](/guides/content/editing-an-existing-page#modifying-front-matter)',

  // --- Configuración Base (valores por defecto) ---
  baseConfig: {
    name: 'Add Message',
    method: 'POST',
    url: 'http://localhost:12393/api/messages/add', // Un buen endpoint para probar
    headers: [
      // El header Content-Type se añade automáticamente, pero puedes poner otros
      { key: 'Accept', value: 'application/json', enabled: true }
    ],
  },

  // --- Restricciones de Campos Principales ---
  constraints: {
    // Hacemos que el método y la URL no se puedan cambiar para esta plantilla
    method: { type: 'readonly' },
  },

  // --- ¡LA PARTE CLAVE! Definición del Cuerpo ---
  bodyTemplate: {
    /**
     * 1. `schema`: Define la estructura y los valores por defecto del JSON.
     *    Aquí, queremos un objeto con una clave "text" y un valor inicial vacío.
     */
    schema: {
      text: 'user: {nickname} message: {comment}' 
    },

    /**
     * 2. `editableFields`: Un array de strings que indica qué campos del `schema`
     *    son editables por el usuario. La ruta es 'text' porque está en el nivel raíz.
     */
    editableFields: ['text'],

    /**
     * 3. `fieldTypes`: Un objeto que mapea cada campo editable a su tipo.
     *    El componente usará esto para renderizar el control de UI adecuado.
     *    Como 'text' es de tipo 'string', renderizará un <input type="text">.
     */
    fieldTypes: {
      text: 'string'
    }
  }
};
export const ArrayTemplate: RequestTemplate = {
    id: 'array-command',
    name: 'Minecraft Commands',
    description: 'A template for sending an array of Minecraft Commands.',
    icon: 'code',
    baseConfig: {
        name: 'Minecraft cmds',
        method: 'POST',
        headers: [
            { key: 'Accept', value: 'application/json', enabled: true }
        ],
    },
    constraints: {
        method: { type: 'readonly' },
    },
    bodyTemplate: {
        schema: {
            cmds: [
              'execute at @p run title @a title {\\\"text\\\":\\\"uniqueId\\\",\\\"color\\\":\\\"gold\\\"}',
              'execute at @p run title @a subtitle {\\\"text\\\":\\\"gifted giftName xrepeatCount\\\",\\\"color\\\":\\\"gold\\\"}',
              'execute at @p run summon zombie ~ ~ ~ {CustomName:\'{\\\"text\\\":\\\"uniqueId\\\",\\\"color\\\":\\\"red\\\"}\',CustomNameVisible:1b}'
            ]
        },
        editableFields: ['cmds'],
        fieldTypes: {
            cmds: 'array'
        }
    }
}
export const templates = [simpleTextTemplate, ArrayTemplate];
export function getTemplate(id: string): RequestTemplate | undefined {
  return templates.find(template => template.id === id);
}