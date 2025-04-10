import { databases, IndexedDBManager, Emitter, getAllDataFromDatabase } from '/src/pages/test/idb.js';
const modal = document.getElementById('modal-container');
const editor = document.getElementById('dynamic-editor');
const EventEmitter = new Emitter();
const commentDbmanager = new IndexedDBManager(databases.commentEventsDB, EventEmitter);
const giftDbmanager = new IndexedDBManager(databases.giftEventsDB, EventEmitter);
const bitsDbmanager = new IndexedDBManager(databases.bitsEventsDB, EventEmitter);
const likesDbmanager = new IndexedDBManager(databases.likesEventsDB, EventEmitter);
EventEmitter.onAny((eventName, Data) => {
    switch (eventName) {
        case 'save':
        case 'update':
            const { config, data } = Data;
            if (config) {
                console.log(`Event received EventEmitter: update save`, Data);
                renderizemanager(config.name);
            }
            break;
        case 'delete':
        case 'clear':
            console.log(`Event received EventEmitter: clear delete`, Data);
            break;
        default:
            console.log(`Event received EventEmitter: ${eventName}`, Data);
            break;
    }
    // This listener will be automatically removed after execution
  });
async function fetchGiftOptions() {
    await new Promise(resolve => setTimeout(resolve, 10));
    return [
        { value: '5565', label: 'Rose (Async)' },
        { value: '5566', label: 'Rose Red (Async)' },
        { value: '5567', label: 'Rose Violet (Async)' },
        { value: '5568', label: 'Rose Yellow (Async)' },
        { value: '5569', label: 'Rose White (Async)' },
    ];
}
 async function fetchUserRoles() {
    await new Promise(resolve => setTimeout(resolve, 10));
    return [
        { value: 'any', label: 'Cualquiera' },
        { value: 'sub', label: 'Suscriptor (Async)' },
        { value: 'mod', label: 'Moderador (Async)' },
        { value: 'admin', label: 'Administrador' }
    ];
 }

const formConfigurations = {
    comment: {
        title: "Configurar Evento de Comentario",
        getInitialData: () => ({
            id: '', name: 'Nuevo Evento Comentario', isActive: true,
            role: 'any', comparator: 'any', value: '', type: 'comment' // Añadir tipo
        }),
        getFieldConfig: async () => ({
            name: { label: 'Nombre', type: 'text', required: true },
            isActive: { label: 'Activo', type: 'switch' },
            role: { label: 'Rol', type: 'select', options: await fetchUserRoles() },
            comparator: { label: 'Comparador', type: 'select', options: [
                { value: 'any', label: 'Cualquiera' }, { value: 'equal', label: 'Igual a' },
                { value: 'startsWith', label: 'Comienza con' }, { value: 'endsWith', label: 'Termina con' },
                { value: 'contains', label: 'Contiene' }
            ]},
            value: { label: 'Valor Comentario', type: 'text', showIf: { field: 'comparator', value: 'any', negate: true } },
            id: { hidden: false, readOnly:"true" }, // Ocultar ID para nuevos
            type: { hidden: true }
        })
    },
    bits: {
        title: "Configurar Evento de Bits",
         getInitialData: () => ({
            id: '', name: 'Nuevo Evento Bits', isActive: true, role: 'any',
            comparator: 'InRange', value: null, lessThan: 0, greaterThan: 100, type: 'bits'
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
            id: { hidden: false, readOnly:"true" },
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
            id: { hidden: false, readOnly:"true" },
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
            id: { hidden: false, readOnly:"true" },
            type: { hidden: true }
         })
    }
};

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

document.body.addEventListener('click', (event) => {
    // Busca un botón con data-form-type que sea ancestro del elemento clickeado
    const button = event.target.closest('button[data-form-type]');
    if (button) {
        const formType = button.dataset.formType;
        openModalForType(formType);
    }
});

editor.addEventListener('item-upd', (e) => {
    const databaseByType = {
        comment: commentDbmanager,
        gift: giftDbmanager,
        bits: bitsDbmanager,
        likes: likesDbmanager
    }
    const savedData = e.detail;
    const formType = modal.dataset.currentFormType || 'desconocido'; // Recupera el tipo
    const dbManager = databaseByType[formType];
    console.log(`Evento item-upd (${formType}) recibido:`, savedData, databaseByType[formType]);
    if (dbManager) {
        dbManager.saveData(savedData);
    }
    // AQUÍ: Llama a la función de guardado específica según 'formType'
    // Ejemplo: if (formType === 'comment') saveCommentToDB(savedData);
    // Ejemplo: if (formType === 'banUser') saveBanToDB(savedData);
    modal.hide(); // Cierra el modal al guardar
});

editor.addEventListener('del-item', (e) => {
    const itemToDelete = e.detail;
    const formType = modal.dataset.currentFormType || 'desconocido';
    console.log(`Evento del-item (${formType}) recibido:`, itemToDelete);
     if (confirm(`¿Seguro que quieres eliminar este item de tipo "${formType}"?`)) {
         console.log(
         `Eliminado (${formType}):\n${JSON.stringify(itemToDelete, null, 2)}`
         )
         // AQUÍ: Llama a la función de eliminación específica según 'formType'
         modal.hide();
     }
});
editor.addEventListener('cancel', () => {
    console.log("Cancel Edit");
    modal.hide();
});

 modal.addEventListener('close', () => { 
     console.log("Modal cerrado");
     console.log(
     "Modal cerrado."
     )
     modal.dataset.currentFormType = ''; 
 });
 const dbConfigMap = {
  comment: databases.commentEventsDB,
  gift: databases.giftEventsDB, 
  bits: databases.bitsEventsDB,
  likes: databases.likesEventsDB   
};

const dbManagers = {
  comment: new IndexedDBManager(dbConfigMap.comment, EventEmitter),
  gift: new IndexedDBManager(dbConfigMap.gift, EventEmitter),
  bits: new IndexedDBManager(dbConfigMap.bits, EventEmitter),
  likes: new IndexedDBManager(dbConfigMap.likes, EventEmitter)
};
let manager
 async function initializeEventManager() {
    manager = document.getElementById('eventConfigManager');
  if (!manager) {
      console.error('Elemento grid-manager-lit con ID "eventConfigManager" no encontrado.');
      return;
  }

  manager.clearAll();

  const eventTypes = Object.keys(formConfigurations); 

  for (const type of eventTypes) {
      try {
          const formConfig = formConfigurations[type];
          const dbConfig = dbConfigMap[type];

          if (!formConfig || !dbConfig) {
              console.warn(`Configuración no encontrada para el tipo: ${type}`);
              continue; // Saltar al siguiente tipo
          }

          // 1. Obtener datos de IndexedDB
          const initialData = await getAllDataFromDatabase(dbConfig);

          // 2. Obtener configuración de campos y filtrar claves visibles
          const fieldConfig = await formConfig.getFieldConfig();
          const displayKeys = Object.entries(fieldConfig)
              .filter(([key, field]) => !field.hidden) // Excluir campos ocultos
              .map(([key]) => key); // Obtener solo los nombres de las claves
        console.log(`Datos para ${type}:`, { data: initialData, keys: displayKeys });


          // 3. Añadir el componente (tabla) al Grid Manager
          manager.addComp(`${type}Events`, { // ID único para el componente
              displayType: 'table',         // Mostrar como tabla
              title: formConfig.title,      // Título de la tabla
              keys: displayKeys,            // Columnas a mostrar
              initialData: initialData      // Datos cargados de IDB
              // actions: [], // Opcional: si no quieres los botones por defecto
              // displayOptions: {} // Opciones específicas de display si usas cards/flex
          });

      } catch (error) {
          console.error(`Error al configurar la tabla para el tipo "${type}":`, error);
          // Podrías añadir un componente de error al manager o mostrar un mensaje
      }
  }

  manager.addEventListener('comp-action', async (e) => {
      const { compId, action, item, index } = e.detail;
      console.log('Acción recibida:', e.detail);
    
      const type = compId.replace('Events', '');
      const relevantDbManager = dbManagers[type];
      
      if (!relevantDbManager) {
          console.error(`No se encontró DB Manager para el tipo: ${type}`);
          return;
      }

      if (action === 'edit') {
        openModalForType(type, item);
          // Lógica para editar: Podrías abrir un modal/formulario
          // precargado con 'item' y usar formConfigurations[type]
          // para generar los campos del formulario.
          console.log(`Editar ${type} con ID: ${item.id}`, item);
          // Ejemplo: showEditModal(type, item);
          // Después de editar y guardar en el modal, deberías llamar a:
          // const updatedItem = await relevantDbManager.saveData(newDataFromModal);
          // Y luego actualizar la tabla en el manager:
          // manager.setCompData(compId, await getAllDataFromDatabase(dbConfigMap[type]));

      } else if (action === 'delete') {
          if (confirm(`¿Seguro que quieres eliminar el evento "${item.name}" (ID: ${item.id}) de tipo ${type}?`)) {
            managerdeleteData(compId, item);
          }
      } else {
          // Manejar otras acciones personalizadas si las añades
          console.log(`Acción personalizada "${action}" para ${type}:`, item);
      }
  });
}
async function managerdeleteData(compId, item) {
    const type = compId.replace('Events', '');
    const relevantDbManager = dbManagers[type];
    if (!relevantDbManager) {
        console.error(`No se encontró DB Manager para el tipo: ${type}`);
        return;
    }
    try {
        await relevantDbManager.deleteData(item.id);
        console.log(`Elemento ${item.id} de tipo ${type} eliminado.`);
        renderizemanager(compId);
        // Actualizar la tabla en el manager para reflejar la eliminación
    } catch (error) {
        console.error(`Error al eliminar elemento ${item.id} de tipo ${type}:`, error);
        alert(`Error al eliminar: ${error.message}`);
    }
}
async function renderizemanager(compId) {
    const type = compId.replace('Events', '');
    manager.setCompData(compId, await getAllDataFromDatabase(dbConfigMap[type]));
}
initializeEventManager();