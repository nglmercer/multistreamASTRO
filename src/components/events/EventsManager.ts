// /src/components/events/EventsManager.ts
import { databases, IndexedDBManager, getAllDataFromDatabase } from '@utils/idb.ts';
import { ObjectTableLit, type EventDetail } from "src/litcomponents/tables.ts";
import { openDynamicModal, type IModalElement, type IEditorElement } from '@components/actionsjs/crudUIHelpers';
import { getGiftList } from '@utils/transform/gifts.ts';
import { mapUsersToSelectOptions } from '@utils/transform/users.ts';
import { displayAllUsers } from '@utils/userdata/UserProcessor.ts';

// Tipos específicos para eventos
export interface EventConfig {
  type: string;
  title: string;
  database: any;
  tableId: string;
  buttonId: string;
  sectionId: string;
  displayKeys: string[];
}

export interface EventFormConfig {
  getInitialData: () => Record<string, any>;
  getFieldConfig: () => Promise<Record<string, any>>;
}

// Configuración de eventos
const EVENT_CONFIGS: Record<string, EventConfig> = {
  comment: {
    type: 'comment',
    title: 'Evento Comentario',
    database: databases.commentEventsDB,
    tableId: 'commentEventsDBConfigManager',
    buttonId: 'CommentButton',
    sectionId: 'comment-section',
    displayKeys: ['name', 'id', 'isActive', 'role', 'comparator']
  },
  gift: {
    type: 'gift',
    title: 'Evento Regalo',
    database: databases.giftEventsDB,
    tableId: 'giftEventsDBConfigManager',
    buttonId: 'GiftButton',
    sectionId: 'gift-section',
    displayKeys: ['name', 'id', 'isActive', 'role', 'comparator']
  },
  bits: {
    type: 'bits',
    title: 'Evento Bits',
    database: databases.bitsEventsDB,
    tableId: 'bitsEventsDBConfigManager',
    buttonId: 'BitsButton',
    sectionId: 'bits-section',
    displayKeys: ['name', 'id', 'isActive', 'role', 'comparator']
  },
  likes: {
    type: 'likes',
    title: 'Evento Likes',
    database: databases.likesEventsDB,
    tableId: 'likesEventsDBConfigManager',
    buttonId: 'LikesButton',
    sectionId: 'likes-section',
    displayKeys: ['name', 'id', 'isActive', 'role', 'comparator']
  },
  follow: {
    type: 'follow',
    title: 'Evento Follow',
    database: databases.followEventsDB,
    tableId: 'followEventsDBConfigManager',
    buttonId: 'FollowButton',
    sectionId: 'follow-section',
    displayKeys: ['name', 'id', 'isActive', 'role']
  }
};

// Funciones auxiliares para opciones de formulario
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
    const allactionsDb = await getAllDataFromDatabase(databases.ActionsDB);
    if (allactionsDb && Array.isArray(allactionsDb)) {
      return allactionsDb.map(item => ({ value: item.id, label: item.name }));
    }
    return [];
  } catch (error) {
    console.error("Error getting actions:", error);
    return [];
  }
}

function comparatorStringOptions() {
  return [
    { value: 'any', label: 'Cualquiera' },
    { value: 'equal', label: 'Igual a' },
    { value: 'startsWith', label: 'Comienza con' },
    { value: 'endsWith', label: 'Termina con' },
    { value: 'contains', label: 'Contiene' },
    { value: 'notStartsWith', label: 'no empieza con' },
    { value: 'notIncludes', label: 'no contiene' }
  ];
}

async function fetchUsers() {
  const users = await displayAllUsers();
  const usersmap = users.map(user => ({
    value: user.userId,
    label: user.uniqueId || user.nickname || 'Usuario sin nombre'
  }));
  return [...usersmap, { value: '7339395551567954950', label: 'cristobaltrs' }];
}

// Configuraciones de formulario para cada tipo de evento
const FORM_CONFIGS: Record<string, EventFormConfig> = {
  comment: {
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
      id: { hidden: true, readonly: "true" },
      type: { hidden: true }
    })
  },
  
  gift: {
    getInitialData: () => ({
      id: '', name: 'Nuevo Evento Regalo', isActive: true, role: 'any',
      comparator: 'equal', value: '', type: 'gift'
    }),
    getFieldConfig: async () => ({
      name: { label: 'Nombre', type: 'text', required: true },
      isActive: { label: 'Activo', type: 'switch' },
      role: { label: 'Rol', type: 'select', options: await fetchUserRoles() },
      comparator: { label: 'Comparador Regalo', type: 'select', options: [
        { value: 'any', label: 'Cualquiera' }, 
        { value: 'equal', label: 'Regalo Específico' }
      ]},
      value: {
        label: 'Tipo Regalo', type: 'select',
        options: await fetchGiftOptions(),
        showIf: { field: 'comparator', value: 'equal' }
      },
      actions: { label: 'Acciones', type: 'select', options: await getAllActions(), multiple: true },
      id: { hidden: true, readonly: "true" },
      type: { hidden: true }
    })
  },

  bits: {
    getInitialData: () => ({
      id: '', name: 'Nuevo Evento Bits', isActive: true, role: 'any',
      comparator: 'InRange', value: null, lessThan: 10, greaterThan: 50, type: 'bits'
    }),
    getFieldConfig: async () => ({
      name: { label: 'Nombre', type: 'text', required: true },
      isActive: { label: 'Activo', type: 'switch' },
      role: { label: 'Rol', type: 'select', options: await fetchUserRoles() },
      comparator: { label: 'Comparador Bits', type: 'select', options: [
        { value: 'any', label: 'Cualquiera' },
        { value: 'equal', label: 'Igual a' },
        { value: 'InRange', label: 'En rango' }
      ]},
      value: { label: 'Valor Exacto', type: 'number', showIf: { field: 'comparator', value: 'equal' } },
      lessThan: { label: 'Mínimo (Incl.)', type: 'number', showIf: { field: 'comparator', value: 'InRange' } },
      greaterThan: { label: 'Máximo (Incl.)', type: 'number', showIf: { field: 'comparator', value: 'InRange' } },
      actions: { label: 'Acciones', type: 'select', options: await getAllActions(), multiple: true },
      id: { hidden: false, readonly: "true" },
      type: { hidden: true }
    })
  },

  likes: {
    getInitialData: () => ({
      id: '', name: 'Nuevo Evento Likes', isActive: true, role: 'any',
      comparator: 'any', value: null, lessThan: 0, greaterThan: 1000, type: 'likes'
    }),
    getFieldConfig: async () => ({
      name: { label: 'Nombre', type: 'text', required: true },
      isActive: { label: 'Activo', type: 'switch' },
      role: { label: 'Rol', type: 'select', options: await fetchUserRoles() },
      comparator: { label: 'Comparador Likes', type: 'select', options: [
        { value: 'any', label: 'Cualquiera' },
        { value: 'equal', label: 'Igual a' },
        { value: 'InRange', label: 'En rango' }
      ]},
      value: { label: 'Likes Exactos', type: 'number', showIf: { field: 'comparator', value: 'equal' } },
      lessThan: { label: 'Mínimo Likes (Incl.)', type: 'number', showIf: { field: 'comparator', value: 'InRange' } },
      greaterThan: { label: 'Máximo Likes (Incl.)', type: 'number', showIf: { field: 'comparator', value: 'InRange' } },
      usuario: { label: 'Usuario', type: 'select', options: await fetchUsers(), showIf: { field: 'role', value: 'usuario' } },
      actions: { label: 'Acciones', type: 'select', options: await getAllActions(), multiple: true },
      id: { hidden: false, readonly: "true" },
      type: { hidden: true }
    })
  },

  follow: {
    getInitialData: () => ({
      id: '', name: 'Nuevo Evento Seguidor', isActive: true, role: 'any',
      comparator: 'any', value: 'any', type: 'follow'
    }),
    getFieldConfig: async () => ({
      name: { label: 'Nombre', type: 'text', required: true },
      isActive: { label: 'Activo', type: 'switch' },
      role: { label: 'Rol', type: 'select', options: await fetchUserRoles() },
      usuario: { label: 'Usuario', type: 'select', options: await fetchUsers(), showIf: { field: 'role', value: 'usuario' } },
      comparator: { hidden: true },
      actions: { label: 'Acciones', type: 'select', options: await getAllActions(), multiple: true },
      id: { hidden: false, readonly: "true" },
      type: { hidden: true }
    })
  }
};

// Clase principal del manejador de eventos
class EventsManager {
  private tables: Map<string, ObjectTableLit> = new Map();
  private dbManagers: Map<string, IndexedDBManager> = new Map();
  private modalEl: IModalElement | null = null;
  private editorEl: IEditorElement | null = null;

  constructor() {
    this.init();
  }

  private init() {
    // Inicializar elementos del modal
    this.modalEl = document.getElementById('modal-container') as IModalElement;
    this.editorEl = document.getElementById('dynamic-editor') as IEditorElement;

    if (!this.modalEl || !this.editorEl) {
      console.error('Modal o Editor no encontrados');
      return;
    }

    // Configurar cada tipo de evento
    Object.values(EVENT_CONFIGS).forEach(config => {
      this.setupEventType(config);
    });

    this.setupModalListeners();
    this.loadAllTables();
  }

  private setupEventType(config: EventConfig) {
    const tableElement = document.getElementById(config.tableId) as ObjectTableLit;
    const buttonElement = document.getElementById(config.buttonId);

    if (!tableElement) {
      console.warn(`Tabla no encontrada: ${config.tableId}`);
      return;
    }

    // Configurar tabla
    this.tables.set(config.type, tableElement);
    
    // Configurar DB Manager
    const dbManager = new IndexedDBManager(config.database);
    this.dbManagers.set(config.type, dbManager);

    // Configurar listeners de tabla
    this.setupTableListeners(config.type, tableElement);

    // Configurar botón de agregar
    if (buttonElement) {
      buttonElement.addEventListener('click', () => {
        this.openModal(config.type);
      });
    }
  }

  private setupTableListeners(eventType: string, table: ObjectTableLit) {
    table.addEventListener('action', async (e) => {
      const { detail } = e as CustomEvent<EventDetail>;
      const { originalAction, item } = detail;

      switch (originalAction) {
        case 'edit':
          this.openModal(eventType, item);
          break;
        
        case 'delete':
          await this.handleDelete(eventType, item);
          break;
        
        case 'Copy':
          await this.handleCopy(eventType, item);
          break;
      }
    });
  }

  private async openModal(eventType: string, data: Record<string, any> | null = null) {
    if (!this.modalEl || !this.editorEl) return;

    const formConfig = FORM_CONFIGS[eventType];
    if (!formConfig) {
      console.error(`Configuración de formulario no encontrada para: ${eventType}`);
      return;
    }

    try {
      await openDynamicModal(
        this.modalEl,
        this.editorEl,
        eventType,
        { [eventType]: { 
          title: EVENT_CONFIGS[eventType].title,
          ...formConfig 
        }},
        data
      );
    } catch (error) {
      console.error(`Error abriendo modal para ${eventType}:`, error);
    }
  }

  private async handleDelete(eventType: string, item: any) {
    const { id, name } = item;
    const result = await (window as any).showDialog(
      `eliminar elemento ${name || 'sin nombre'} con ID: ${id}`, 
      'aceptar', 
      'cancelar'
    );

    if (result) {
      const dbManager = this.dbManagers.get(eventType);
      if (dbManager) {
        await dbManager.deleteData(id);
        await this.refreshTable(eventType);
      }
    }
  }

  private async handleCopy(eventType: string, item: any) {
    const { id, name } = item;
    const result = await (window as any).showDialog(
      `Duplicar elemento ${name || 'sin nombre'}`, 
      'aceptar', 
      'cancelar'
    );

    if (result) {
      const dbManager = this.dbManagers.get(eventType);
      if (dbManager) {
        const newItem = { ...item };
        delete newItem.id;
        newItem.name = `${newItem.name} (Copia)`;
        await dbManager.saveData(newItem);
        await this.refreshTable(eventType);
      }
    }
  }

  private setupModalListeners() {
    if (!this.modalEl || !this.editorEl) return;

    // Listener para guardar
    this.editorEl.addEventListener('item-upd', async (e: Event) => {
      const savedData = (e as CustomEvent).detail;
      const currentFormType = this.modalEl?.dataset.currentFormType;
      
      if (currentFormType) {
        const dbManager = this.dbManagers.get(currentFormType);
        if (dbManager) {
          await dbManager.saveData(savedData);
          this.modalEl?.hide();
          await this.refreshTable(currentFormType);
        }
      }
    });

    // Listener para eliminar desde modal
    this.editorEl.addEventListener('del-item', async (e: Event) => {
      const itemToDelete = (e as CustomEvent).detail;
      const currentFormType = this.modalEl?.dataset.currentFormType;
      
      if (currentFormType && itemToDelete?.id) {
        await this.handleDelete(currentFormType, itemToDelete);
        this.modalEl?.hide();
      }
    });

    // Listener para cancelar
    this.editorEl.addEventListener('cancel', () => {
      this.modalEl?.hide();
    });
  }

  private async loadAllTables() {
    for (const [eventType, table] of this.tables) {
      await this.refreshTable(eventType);
      const config = EVENT_CONFIGS[eventType];
      table.keys = config.displayKeys;
    }
  }

  private async refreshTable(eventType: string) {
    const table = this.tables.get(eventType);
    const dbManager = this.dbManagers.get(eventType);

    if (table && dbManager) {
      const data = await dbManager.getAllData();
      table.data = data;
    }
  }

  // Método público para refrescar una tabla específica
  public async refreshSpecificTable(eventType: string) {
    await this.refreshTable(eventType);
  }

  // Método público para obtener los tipos de eventos disponibles
  public getAvailableEventTypes(): string[] {
    return Object.keys(EVENT_CONFIGS);
  }
}

// Inicialización automática cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  new EventsManager();
});
export {
  EventsManager
}