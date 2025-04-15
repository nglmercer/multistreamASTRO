// /src/pages/actions/actions.js (o tu ruta)
import { databases, IndexedDBManager, Emitter, getAllDataFromDatabase } from '/src/components/actionsjs/idb.js'; // Ajusta ruta
import {
    openDynamicModal,
    initializeTables,
    updateTableData,
    setupModalEventListeners,
    setupTableActionListeners
} from '/src/components/actionsjs/crudUIHelpers.js'; // Ajusta ruta
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
            id: { hidden: false, readonly:"true" },
            type: { hidden: true }
        })
    },

};
const pageConfig = {
    formType: 'actions',
    modalId: 'Action-modal',
    editorId: 'Action-editor',
    managerId: 'ActionConfigManager',
    addButtonId: 'actionButton',
    dbConfig: databases.ActionsDB,
    baseCompId: 'actionsTable'
};

const modalEl = document.getElementById(pageConfig.modalId);
const editorEl = document.getElementById(pageConfig.editorId);
const managerEl = document.getElementById(pageConfig.managerId);
const addBtn = document.getElementById(pageConfig.addButtonId);

if (!modalEl || !editorEl || !managerEl) {
    console.error("Error: Elementos UI necesarios no encontrados.");
    // Podrías detener aquí o mostrar un error visual
}

const actionEmitter = new Emitter();
const actionDbManager = new IndexedDBManager(pageConfig.dbConfig, actionEmitter);

const dbManagerMap = {
    [pageConfig.formType]: actionDbManager
};

const tableConfigs = {
    [pageConfig.baseCompId]: {
        title: 'Acciones',
        formConfig: formConfigurations[pageConfig.formType],
        dbConfig: pageConfig.dbConfig
    }
};
console.log("tableConfigs:", tableConfigs);
function openModal(type, data = null) {
    openDynamicModal(modalEl, editorEl, type, formConfigurations, data);
}

function refreshTable(compId = pageConfig.baseCompId) {
    const config = tableConfigs[compId];
    if(config) {
      updateTableData(managerEl, compId, config.dbConfig, getAllDataFromDatabase);
    } else {
      console.warn(`No se encontró configuración para refrescar tabla con ID: ${compId}`);
    }
}

if (addBtn) {
    addBtn.addEventListener('click', () => {
        openModal(pageConfig.formType);
    });
}

setupModalEventListeners(
    modalEl,
    editorEl,
    dbManagerMap,
    (type, changedData) => {
        console.log(`Operación modal completada para ${type}:`, changedData);
        // Encuentra el compId asociado al formType para refrescar la tabla correcta
        const compIdToRefresh = Object.keys(tableConfigs).find(id => tableConfigs[id].formConfig === formConfigurations[type]);
        if (compIdToRefresh) {
            refreshTable(compIdToRefresh);
        } else {
            console.warn(`No se encontró tabla asociada al tipo ${type} para refrescar.`);
            // Intenta refrescar la tabla por defecto si solo hay una
             if(Object.keys(tableConfigs).length === 1) refreshTable();
        }
    }
);

setupTableActionListeners(
    managerEl,
    openModal,
    dbManagerMap,
    tableConfigs,
    (compId, deletedItem) => {
        console.log(`Item eliminado desde tabla ${compId}:`, deletedItem);
        refreshTable(compId); // Refresca la tabla específica que cambió
    }
);

document.addEventListener('DOMContentLoaded', () => {
    initializeTables(managerEl, tableConfigs, getAllDataFromDatabase, ["name", "id", "type"])
    .then(() => console.log('Gestor de acciones inicializado.'))
    .catch(error => console.error('Error inicializando gestor de acciones:', error));
    });