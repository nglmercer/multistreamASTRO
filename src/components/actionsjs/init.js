// /src/pages/events/events.js (o tu ruta)
import { databases, IndexedDBManager, getAllDataFromDatabase } from '@utils/idb.ts';
import Emitter, { emitter } from '@utils/Emitter.ts';
import {
    openDynamicModal,
    initializeTables,
    updateTableData,
    setupModalEventListeners,
    setupTableActionListeners
} from '@components/actionsjs/crudUIHelpers.ts'; // Ajusta ruta
import { getGiftList, mapgifts, geticonfromarray } from '@utils/transform/gifts.ts'; // Ajusta ruta
import { mapUsersToSelectOptions } from '@utils/transform/users.ts'; // Ajusta ruta
import { displayAllUsers } from '@utils/userdata/UserProcessor.ts'; // Ajusta ruta
async function fetchGiftOptions() {
    return getGiftList();
}
 async function fetchUserRoles() {
    return [
        { value: 'any', label: 'Cualquiera' },
        { value: 'sub', label: 'Suscriptor' },
        { value: 'mod', label: 'Moderador' },
        { value: 'gifter', label: 'Regalador' },
        { value: 'usuario', label: 'Usuario exacto' },
    ];
 }
async function getAllActions() {
    try {
        let actions = [];
        const allactionsDb = await getAllDataFromDatabase(databases.ActionsDB);
        if (allactionsDb && Array.isArray(allactionsDb)) {
            actions = allactionsDb.map(item => ({ value: item.id, label: item.name }));
        }
        console.log("getAllActions", actions);
        return actions;
    } catch (error) {
        console.error("Error getting actions:", error);
        return [];
    }
}
getAllActions()
 function comparatorStringOptions() {
    return [
        { value: 'any', label: 'Cualquiera' }, { value: 'equal', label: 'Igual a' },
        { value: 'startsWith', label: 'Comienza con' }, { value: 'endsWith', label: 'Termina con' },
        { value: 'contains', label: 'Contiene' }, { value: 'notStartsWith',label:'no empieza con'},
        { value: 'notIncludes',label:'no contiene'}
    ]
}
async function fetchUsers(){
    const usersmap = mapUsersToSelectOptions(await displayAllUsers());
    console.log("fetchUsers", usersmap);
    return [
        ...usersmap,
        { value: '7339395551567954950', label: 'cristobaltrs'}
    ]
}
const formConfigurations = {
    comment: {
        title: "Configurar Evento de Comentario",
        getInitialData: () => ({
            id: '', name: 'Nuevo Evento Comentario', isActive: true,
            role: 'any', comparator: 'startsWith', value: '', type: 'comment', user: 'any'
        }),
        getFieldConfig: async () => ({
            name: { label: 'Nombre', type: 'text', required: true },
            isActive: { label: 'Activo', type: 'switch' },
            role: { label: 'Rol', type: 'select', options: await fetchUserRoles() },
            usuario: { label: 'Usuario', type: 'select', options: await fetchUsers(), showIf: { field: 'role', value: 'usuario' } },
            comparator: { label: 'Comparador', type: 'select', options: comparatorStringOptions() },
            value: { label: 'Valor Comentario', type: 'text', showIf: { field: 'comparator', value: 'any', negate: true } },
            
            actions: { label: 'Acciones', type: 'select', options: await getAllActions(), multiple: true },
            id: { hidden: true, readonly:"true" }, // Ocultar ID para nuevos
            type: { hidden: true }
        })
    },
    bits: {
        title: "Configurar Evento de Bits",
         getInitialData: () => ({
            id: '', name: 'Nuevo Evento Bits', isActive: true, role: 'any',
            comparator: 'InRange', value: null, lessThan: 10, greaterThan: 50, type: 'bits'
        }),
        getFieldConfig: async () => ({
            name: { label: 'Nombre', type: 'text', required: true },
            isActive: { label: 'Activo', type: 'switch' },
            role: { label: 'Rol', type: 'select', options: await fetchUserRoles() },
            comparator: { label: 'Comparador Bits', type: 'select', options: [
                 { value: 'any', label: 'Cualquiera' }, { value: 'equal', label: 'Igual a' },
                 { value: 'InRange', label: 'En rango' }
            ]},
            value: { label: 'Valor Exacto', type: 'number', showIf: { field: 'comparator', value: 'equal' } },
            lessThan: { label: 'Mínimo (Incl.)', type: 'number', showIf: { field: 'comparator', value: 'InRange' } },
            greaterThan: { label: 'Máximo (Incl.)', type: 'number', showIf: { field: 'comparator', value: 'InRange' } },
            actions: { label: 'Acciones', type: 'select', options: await getAllActions(), multiple: true },
            id: { hidden: false, readonly:"true" },
            type: { hidden: true }
        })
    },
    likes: {
         title: "Configurar Evento de Likes",
         getInitialData: () => ({
             id: '', name: 'Nuevo Evento Likes', isActive: true, role: 'any',
             comparator: 'any', value: null, lessThan: 0, greaterThan: 1000, type: 'likes'
         }),
         getFieldConfig: async () => ({ // Similar a bits, ajusta labels/defaults si es necesario
            name: { label: 'Nombre', type: 'text', required: true },
            isActive: { label: 'Activo', type: 'switch' },
            role: { label: 'Rol', type: 'select', options: await fetchUserRoles() },
            comparator: { label: 'Comparador Likes', type: 'select', options: [
                 { value: 'any', label: 'Cualquiera' }, { value: 'equal', label: 'Igual a' },
                 { value: 'InRange', label: 'En rango' }
            ]},
            value: { label: 'Likes Exactos', type: 'number', showIf: { field: 'comparator', value: 'equal' } },
            lessThan: { label: 'Mínimo Likes (Incl.)', type: 'number', showIf: { field: 'comparator', value: 'InRange' } },
            greaterThan: { label: 'Máximo Likes (Incl.)', type: 'number', showIf: { field: 'comparator', value: 'InRange' } },
            usuario: { label: 'Usuario', type: 'select', options: await fetchUsers(), showIf: { field: 'role', value: 'usuario' } },
            actions: { label: 'Acciones', type: 'select', options: await getAllActions(), multiple: true },
            id: { hidden: false, readonly:"true" },
            type: { hidden: true }
        })
    },
    gift: {
         title: "Configurar Evento de Regalo",
         getInitialData: () => ({
            id: '', name: 'Nuevo Evento Regalo', isActive: true, role: 'any',
            comparator: 'equal', value: '', type: 'gift'
         }),
         getFieldConfig: async () => ({
            name: { label: 'Nombre', type: 'text', required: true },
            isActive: { label: 'Activo', type: 'switch' },
            role: { label: 'Rol', type: 'select', options: await fetchUserRoles() },
            comparator: { label: 'Comparador Regalo', type: 'select', options: [
                { value: 'any', label: 'Cualquiera' }, { value: 'equal', label: 'Regalo Específico' }
            ]},
            // *** Opciones cargadas asíncronamente ***
            value: {
                label: 'Tipo Regalo', type: 'select',
                options: await fetchGiftOptions(), // Llama a la función async
                showIf: { field: 'comparator', value: 'equal' }
            },
            actions: { label: 'Acciones', type: 'select', options: await getAllActions(), multiple: true },
            id: { hidden: false, readonly:"true" },
            type: { hidden: true }
         })
    },
    follow: {
        title: "Configurar Evento de Seguidor",
        getInitialData: () => ({
            id: '', name: 'Nuevo Evento Seguidor', isActive: true, role: 'any',
            comparator: 'any',
            value: 'any',
            type: 'follow'
         }),
         getFieldConfig: async () => ({
            name: { label: 'Nombre', type: 'text', required: true },
            isActive: { label: 'Activo', type: 'switch' },
            role: { label: 'Rol', type: 'select', options: await fetchUserRoles() },
            usuario: { label: 'Usuario', type: 'select', options: await fetchUsers(), showIf: { field: 'role', value: 'usuario' } },
            comparator: { hidden: true},
            actions: { label: 'Acciones', type: 'select', options: await getAllActions(), multiple: true },
            id: { hidden: false, readonly:"true" },
            type: { hidden: true }
         })
    }
};

const pageConfig = {
    modalId: 'modal-container', // Asegúrate que sea el ID correcto
    editorId: 'dynamic-editor',   // Asegúrate que sea el ID correcto
    managerId: 'eventConfigManager',
    eventTypes: ['comment', 'gift', 'bits', 'likes','follow'] // Tipos gestionados en esta página
};

const modalEl = document.getElementById(pageConfig.modalId);
const editorEl = document.getElementById(pageConfig.editorId);
const managerEl = document.getElementById(pageConfig.managerId);

if (!modalEl || !editorEl || !managerEl) {
    console.error("Error: Elementos UI necesarios no encontrados.");
    // Podrías detener aquí o mostrar un error visual
}

const globalEmitter = new Emitter(); // Un Emitter para todos los eventos de esta página

const dbConfigMap = {
  comment: databases.commentEventsDB,
  gift: databases.giftEventsDB,
  bits: databases.bitsEventsDB,
  likes: databases.likesEventsDB,
  like: databases.likesEventsDB,
  follow: databases.followEventsDB
};

const dbManagerMap = {};
pageConfig.eventTypes.forEach(type => {
    if(dbConfigMap[type] && formConfigurations[type]) {
        dbManagerMap[type] = new IndexedDBManager(dbConfigMap[type], globalEmitter);
    } else {
         console.warn(`Configuración de DB o Formulario faltante para el tipo: ${type}`);
    }
});


const tableConfigs = {};
pageConfig.eventTypes.forEach(type => {
    if(dbManagerMap[type]) { // Solo añade si el manager se pudo crear
        tableConfigs[`${type}Events`] = { // Convención: compId = type + "Events"
            title: formConfigurations[type].title || `Eventos ${type}`,
            formConfig: formConfigurations[type],
            dbConfig: dbConfigMap[type]
        };
    }
});


function openModal(type, data = null) {
    openDynamicModal(modalEl, editorEl, type, formConfigurations, data);
}

function refreshTable(compId) {
    const config = tableConfigs[compId];
    if (config) {
        updateTableData(managerEl, compId, config.dbConfig, getAllDataFromDatabase);
    } else {
        console.warn(`No se encontró config para refrescar tabla: ${compId}`);
    }
}

// Listener para botones "Añadir" específicos por tipo
document.body.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-form-type]');
    if (button && pageConfig.eventTypes.includes(button.dataset.formType)) {
        openModal(button.dataset.formType);
    }
});

setupModalEventListeners(
    modalEl,
    editorEl,
    dbManagerMap,
    (type, changedData) => {
        console.log(`Operación modal completada para ${type}:`, changedData);
        const compIdToRefresh = `${type}Events`; // Asume la convención
        if (tableConfigs[compIdToRefresh]) {
             refreshTable(compIdToRefresh);
        } else {
             console.warn(`No se encontró tabla ${compIdToRefresh} para refrescar.`);
        }
    }
);

setupTableActionListeners(
    managerEl,
    openModal,
    dbManagerMap,
    tableConfigs, // Pasa las configuraciones para el mapeo compId -> formType si es necesario
    (compId, deletedItem) => {
        console.log(`Item eliminado desde tabla ${compId}:`, deletedItem);
        refreshTable(compId); // Refresca la tabla específica que cambió
    }
);

// Listener global del Emitter (opcional, si necesitas reaccionar a eventos de DB de forma global)
globalEmitter.onAny((eventName, eventData) => {
    console.log(`Evento DB recibido [${eventName}]:`, eventData);
    // Podrías querer refrescar tablas aquí también, pero cuidado con bucles
    // if (['save', 'update', 'delete'].includes(eventName) && eventData?.config?.name) {
    //     const compId = `${eventData.config.name}Events`; // Asumiendo que config.name es el formType
    //     if (tableConfigs[compId]) {
    //          // refreshTable(compId); // Podría ser redundante si ya se refresca tras la acción
    //     }
    // }
});


document.addEventListener('DOMContentLoaded', () => {
    initializeTables(managerEl, tableConfigs, getAllDataFromDatabase, ["name", "id","isActive", "actions"])
    .then(() => console.log('Gestor de eventos inicializado.'))
    .catch(error => console.error('Error inicializando gestor de eventos:', error));
});