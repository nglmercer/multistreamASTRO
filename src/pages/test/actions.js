const actionConfig = {
    minecraft: {
        label: "Acción Minecraft", // Label for the toggle/section
        checkField: 'check', // The field controlling visibility
        fields: {
            command: { label: "Comando Minecraft", type: "text", required: true, placeholder: "/say Hola!" }
        }
    },
    tts: {
        label: "Acción Text-to-Speech (TTS)",
        checkField: 'check',
        fields: {
            text: { label: "Texto a leer", type: "textarea", required: true, rows: 3, placeholder:"Escribe el mensaje..." }
        }
    },
    overlay: {
        label: "Acción Superposición (Overlay)",
        checkField: 'check',
        fields: {
            // Note: 'src' is an array in your example. c-inp might need enhancement
            // for arrays. For now, we'll treat it as text, expecting IDs/URLs separated by comma perhaps?
            // Or better, provide a specific input later. Let's use text for now.
            src: { label: "Fuente(s) (IDs/URLs)", type: "text", required: true, placeholder:"1, 2, https://..." },
            content: { label: "Texto Contenido", type: "text", placeholder:"Texto por defecto" },
            duration: { label: "Duración (segundos)", type: "number", min: 1, step: 1, required: true, default: 60 },
            volume: { label: "Volumen (%)", type: "range", min: 0, max: 100, step: 1, required: true, default: 50 }
        }
    },
    keypress: {
        label: "Acción Pulsación de Tecla (Keypress)",
        checkField: 'check',
        // Note: 'key' is an array. Like 'src', needs special handling. Using text for now.
        fields: {
            key: { label: "Tecla(s)", type: "text", required: true, placeholder: "Ej: ctrl+alt+k, space" }
        }
    }
    // Add other potential actions here following the same structure
  };
  const formConfigurations = {
    actions: {
        title: "Configurar Acción",
        getInitialData: () => ({
            id: '', name: 'Nueva Acción', type: 'Action',
            minecraft_check: false,
            minecraft_command: '/say hola',
            tts_check: false,
            tts_text: 'text to read',
            overlay_check: false,
            overlay_src: 'https://example.com/image.png',
            overlay_content: 'text to display',
            overlay_duration: 60,
            overlay_volume: 50,
            keypress_check: false,
            keypress_key: 'space'
        }),
        getFieldConfig: async () => ({
            name: { label: 'Nombre', type: 'text', required: true },
            minecraft_check: { label: 'Minecraft', type: 'switch' },
            minecraft_command: { label: 'Comando Minecraft', type: 'textarea', showIf: { field: 'minecraft_check', value: 'true' } },
            tts_check: { label: 'Texto-a-Leer', type: 'switch' },
            tts_text: { label: 'Texto a leer', type: 'text', showIf: { field: 'tts_check', value: 'true' } },
            overlay_check: { label: 'Superposición', type: 'switch' },
            overlay_src: { label: 'Fuente(s) (IDs/URLs)', type: 'text', showIf: { field: 'overlay_check', value: 'true' } },
            overlay_content: { label: 'Texto Contenido', type: 'text', showIf: { field: 'overlay_check', value: 'true' } },
            overlay_duration: { label: 'Duración (segundos)', type: 'number', min: 1, step: 1, showIf: { field: 'overlay_check', value: 'true' } },
            overlay_volume: { label: 'Volumen (%)', type: 'range', min: 0, max: 100, step: 1, showIf: { field: 'overlay_check', value: 'true' } },
            keypress_check: { label: 'Pulsación de Tecla', type: 'switch' },
            keypress_key: { label: 'Tecla(s)', type: 'text', showIf: { field: 'keypress_check', value: 'true' } },
            id: { hidden: false, readOnly:"true" },
            type: { hidden: true }
        })
    },

};
/*
{
    "nombre": "1231124124asdasd",
    "id": 0,
    "minecraft": {
        "check": false,
        "command": "/say coloca tu comando"
    },
    "tts": {
        "check": true,
        "text": "te dono una rosa"
    },
    "overlay": {
        "check": true,
        "src": [
            1
        ],
        "content": "default text",
        "duration": 60,
        "volume": 50
    },
    "keypress": {
        "check": false,
        "key": []
    }
}
*/
const modal = document.getElementById('Action-modal');
const editor = document.getElementById('Action-editor');
const actionButton = document.getElementById('actionButton');
async function openModalForType(formType, data) {
    console.log("Open Modal", formType, data);
    const configGenerator = formConfigurations[formType];
    if (!configGenerator) {
        console.error(`Configuración no encontrada para el tipo: ${formType}`);
        console.log(
        `Error: Configuración no encontrada para ${formType}`
        )
        return;
    }

    // Almacena el tipo actual para usarlo al guardar/eliminar
    modal.dataset.currentFormType = formType;
    editor.itm = {}; // Limpia datos anteriores mientras carga
    editor.fCfg = {}; // Limpia config anterior mientras carga
    modal.show(); // Muestra modal (podría estar vacío o con loading)

    try {
        // Carga configuración y datos iniciales en paralelo
         // Usamos Promise.all para esperar ambas (aunque getInitialData sea síncrono)
        const [fCfg, itm] = await Promise.all([
            configGenerator.getFieldConfig(),
            Promise.resolve(configGenerator.getInitialData()) // Asegura que sea promesa
        ]);

        console.log(`Datos iniciales para ${formType}:`, { config: fCfg, data: itm });

        // Configura el editor DENTRO del modal
        editor.fCfg = fCfg;
        editor.itm = data || itm;
        editor.hdrKey = configGenerator.title || `Editar ${formType}`; // Establece título
        editor.mode = 'edit'; // Asegura que esté en modo edición
        // Ocultar botón delete para formularios de "Añadir"
        editor.addAct('cancel', 'Cancelar', "fas fa-times"); // Asegúrate que dyn-obj-disp tenga hideAct
        if (editor.hideAct) editor.hideAct('delete'); // Asegúrate que dyn-obj-disp tenga hideAct

        console.log(
        `Editando ${formType}...` // Actualiza estado
        )

    } catch (error) {
        console.error(`Error al cargar configuración para ${formType}:`, error);
        console.log(
        `Error al cargar ${formType}: ${error.message}`
        )
        // Considera ocultar el modal si la carga falla: modal.hide();
    }
}
if (actionButton) {
    actionButton.addEventListener('click', (e) => {
        openModalForType('actions');
    });
}
if (modal, editor) {
    editor.addEventListener('item-upd', (e) => {
        console.log("Save dispatched:", e.detail);
    });
    editor.addEventListener('cancel', () => {
        console.log("Cancel Edit");
        modal.hide();
    });
}