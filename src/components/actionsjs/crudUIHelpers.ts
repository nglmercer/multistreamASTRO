// Primero, definimos las "formas" de nuestros objetos y elementos.
// Esto crea contratos que nuestro código debe seguir.

// --- Interfaces y Tipos ---

// Describe la configuración de un solo campo en un formulario.
export interface IFieldConfig {
    label: string;
    type: 'text' | 'number' | 'switch' | 'select' | 'textarea';
    required?: boolean;
    options?: { value: any; label: string }[];
    multiple?: boolean;
    showIf?: {
        field: string;
        value: any;
        negate?: boolean;
    };
    hidden?: boolean;
    readonly?: boolean | "true"; // Soporta ambos tipos
}

// Describe un generador de configuración para un tipo de formulario.
export interface IFormConfigGenerator {
    title: string;
    getInitialData: () => Record<string, any>;
    getFieldConfig: () => Promise<Record<string, IFieldConfig>>;
}

// Un mapa que asocia un string (formType) a su generador de configuración.
export type TFormConfigs = Record<string, IFormConfigGenerator>;

// Describe la estructura de un DB Manager.
export interface IDbManager {
    saveData: (data: Record<string, any>) => Promise<any>;
    deleteData: (id: string | number) => Promise<any>;
}

// Un mapa que asocia un string (formType) a su DB Manager.
export type TDbManagerMap = Record<string, IDbManager>;

// Describe la configuración de una tabla en el GridManager.
export interface ITableConfig {
    title: string;
    formConfig: IFormConfigGenerator;
    dbConfig: any; // Tipo específico de tu configuración de DB
}

// Un mapa que asocia un compId a la configuración de su tabla.
export type TTableConfigs = Record<string, ITableConfig>;

// Describe un elemento modal con métodos personalizados.
export interface IModalElement extends HTMLElement {
    show: () => void;
    hide: () => void;
    dataset: {
        currentFormType?: string;
    };
}

// Describe un elemento editor con propiedades y métodos personalizados.
export interface IEditorElement extends HTMLElement {
    itm: Record<string, any>;
    fCfg: Record<string, IFieldConfig>;
    hdrKey: string;
    mode: 'edit' | 'create';
    addAct?: (name: string, label: string, className?: string) => void;
    hideAct?: (name: string) => void;
}

// Describe el elemento GridManager.
export interface IGridManagerElement extends HTMLElement {
    clearAll: () => void;
    addComp: (id: string, config: any) => void;
    setCompData: (id: string, data: any[], keys?: string[]) => void;
}

// Describe el detalle del evento 'comp-action'.
export interface ICompActionDetail {
    compId: string;
    action: 'edit' | 'delete' | string; // Permite acciones personalizadas
    item: { id: any; name?: string; [key: string]: any };
}

// Tipo para el resultado de getDBC
export interface IDbcResult {
    formType: string;
    dbManager: IDbManager;
}

// --- Implementación de Funciones Tipadas ---

export async function openDynamicModal(
    modalEl: IModalElement,
    editorEl: IEditorElement,
    formType: string,
    formConfigs: TFormConfigs,
    data: Record<string, any> | null = null,
    onBeforeOpen: ((formType: string, data: any) => void) | null = null,
    onAfterConfig: ((formType: string, itemData: any, fCfg: any) => void) | null = null
): Promise<void> {
    const configGenerator = formConfigs[formType];
    if (!configGenerator) {
        console.error(`Configuración no encontrada para: ${formType}`);
        return;
    }

    modalEl.dataset.currentFormType = formType;
    editorEl.itm = {};
    editorEl.fCfg = {};

    if (onBeforeOpen) onBeforeOpen(formType, data);
    modalEl.show();

    try {
        const [fCfg, initialData] = await Promise.all([
            configGenerator.getFieldConfig(),
            Promise.resolve(configGenerator.getInitialData())
        ]);

        const itemData = data || initialData;
        console.log(`Configurando modal para ${formType}:`, { config: fCfg, data: itemData });
        
        editorEl.fCfg = fCfg;
        editorEl.itm = itemData;
        editorEl.hdrKey = configGenerator.title || `Configurar ${formType}`;
        editorEl.mode = 'edit';

        if (editorEl.addAct) {
            editorEl.addAct('save', 'Guardar', 'fas fa-save');
            editorEl.addAct('cancel', 'Cancelar', 'fas fa-times');
            if (data && data.id && editorEl.addAct) {
                editorEl.addAct('delete', 'Eliminar', 'fas fa-trash-alt');
            } else if (editorEl.hideAct) {
                editorEl.hideAct('delete');
            }
        }

        if (onAfterConfig) onAfterConfig(formType, itemData, fCfg);

    } catch (error) {
        console.error(`Error al cargar configuración para ${formType}:`, error);
    }
}

export async function initializeTables(
    managerEl: IGridManagerElement,
    tableConfigs: TTableConfigs,
    getAllDataFn: (dbConfig: any) => Promise<any[]>,
    displayKeysArray?: string[]
): Promise<void> {
    if (!managerEl) {
        console.error('Elemento Grid Manager no proporcionado.');
        return;
    }
    managerEl.clearAll();

    for (const [compId, config] of Object.entries(tableConfigs)) {
        try {
            if (!config.formConfig || !config.dbConfig) {
                console.warn(`Configuración incompleta para tabla: ${compId}.`);
                continue;
            }

            const initialData = await getAllDataFn(config.dbConfig);
            const fieldConfig = await config.formConfig.getFieldConfig();
            
            const preDefinedKeys = Object.entries(fieldConfig)
                .filter(([, field]) => !field.hidden)
                .map(([key]) => key);

            const displayKeys = isArray({ value: displayKeysArray, defaultvalue: preDefinedKeys });
            
            if (!displayKeys.includes('name') && fieldConfig['name']) displayKeys.unshift('name');
            if (!displayKeys.includes('id') && fieldConfig['id']) displayKeys.push('id');

            managerEl.addComp(compId, {
                displayType: 'table',
                title: config.title,
                keys: displayKeys,
                initialData: initialData,
            });

        } catch (error) {
            console.error(`Error al configurar tabla "${compId}":`, error);
        }
    }
}

export async function updateTableData(
    managerEl: IGridManagerElement,
    compId: string,
    dbConfig: any,
    getAllDataFn: (dbConfig: any) => Promise<any[]>
): Promise<void> {
     if (!managerEl || !compId || !dbConfig || !getAllDataFn) {
         console.error('Faltan parámetros para actualizar tabla.', {managerEl, compId, dbConfig, getAllDataFn});
         return;
     }
     try {
        const freshData = await getAllDataFn(dbConfig);
        managerEl.setCompData(compId, freshData);
        console.log(`Tabla ${compId} actualizada.`);
     } catch(error) {
        console.error(`Error al actualizar tabla ${compId}:`, error);
     }
}

export function setupModalEventListeners(
    modalEl: IModalElement,
    editorEl: IEditorElement,
    dbManagerMap: TDbManagerMap,
    afterSaveOrDelete: (formType: string, changedData: any) => void,
    onCancel: (() => void) | null = null
): void {
    editorEl.addEventListener('item-upd', async (e: Event) => {
        const savedData = (e as CustomEvent).detail;
        const formType = modalEl.dataset.currentFormType;
        if (!formType) return;
        
        const dbManager = dbManagerMap[formType];
        if (!dbManager) {
            console.error('No se pudo determinar DBManager para guardar.', { formType });
            return;
        }

        try {
            const result = await dbManager.saveData(savedData);
            modalEl.hide();
            if (afterSaveOrDelete) afterSaveOrDelete(formType, result);
        } catch (error) {
            console.error(`Error al guardar item tipo ${formType}:`, error);
        }
    });

    editorEl.addEventListener('del-item', async (e: Event) => {
        const itemToDelete = (e as CustomEvent).detail;
        const formType = modalEl.dataset.currentFormType;
        if (!formType) return;

        const dbManager = dbManagerMap[formType];
        if (!dbManager || !itemToDelete || !itemToDelete.id) {
            console.error('Datos insuficientes para eliminar.', { formType, dbManager, itemToDelete });
            return;
        }

        if (confirm(`¿Seguro que quieres eliminar este item de tipo "${formType}" (ID: ${itemToDelete.id})?`)) {
            try {
                await dbManager.deleteData(itemToDelete.id);
                modalEl.hide();
                if (afterSaveOrDelete) afterSaveOrDelete(formType, itemToDelete);
            } catch (error) {
                console.error(`Error al eliminar item tipo ${formType} (ID: ${itemToDelete.id}):`, error);
            }
        }
    });

    editorEl.addEventListener('cancel', () => {
        modalEl.hide();
        if (onCancel) onCancel();
    });

    modalEl.addEventListener('close', () => {
        if(modalEl.dataset.currentFormType) {
            modalEl.dataset.currentFormType = '';
        }
    });
}

export function setupTableActionListeners(
    managerEl: IGridManagerElement,
    openModalFn: (formType: string, data: Record<string, any>) => void,
    dbManagerMap: TDbManagerMap,
    tableConfigs: TTableConfigs,
    afterDelete: (compId: string, deletedItem: any) => void
): void {
    managerEl.addEventListener('comp-action', async (e: Event) => {
        const { compId, action, item } = (e as CustomEvent<ICompActionDetail>).detail;
        
        // Lógica simplificada para encontrar formType, asume convención
        const dbcResult = getDBC(compId, tableConfigs, dbManagerMap);
        
        if (!dbcResult) {
            console.error(`No se pudo determinar un formType o DB Manager válido para compId: ${compId}`);
            return;
        }

        const { formType, dbManager } = dbcResult;

        if (action === 'edit') {
            openModalFn(formType, item);

        } else if (action === 'delete') {
            const { id, name } = item;
            // Asumiendo que window.showDialog existe en el contexto global
            (window as any).showDialog(`eliminar elemento ${name} con ID: ${id}`, 'aceptar', 'cancelar')
                .then(async (result: boolean) => {
                    console.log("Resultado de la confirmación:", result);
                    if (result) {
                        const deleteResult = await dbManager.deleteData(item.id);
                        if (deleteResult) afterDelete(compId, item);
                    }
                })
                .catch((error: any) => {
                    console.error("Error al mostrar el diálogo de confirmación:", error);
                });
        } else {
            console.log(`Acción no manejada "${action}" para ${formType}:`, item);
        }
    });

    managerEl.addEventListener('default-action', async (e: Event) => {
        const compId = (e as CustomEvent).detail;
        const dbcResult = getDBC(compId, tableConfigs, dbManagerMap);
        
        if (!dbcResult) {
            console.error(`No se pudo determinar un formType válido para compId: ${compId}`);
            return;
        }

        const { formType } = dbcResult;
        console.log("compId", compId);
        openModalFn(formType, {});
    });
}

function getDBC(
    compId: string,
    tableConfigs: TTableConfigs,
    dbManagerMap: TDbManagerMap
): IDbcResult | undefined {
    const formType = Object.keys(tableConfigs).find(key => 
        key.startsWith(compId.replace(/Events$/, '')) || key === compId
    )?.replace(/Events$/, '');
        
    if (!formType || !dbManagerMap[formType]) {
        console.error(`No se pudo determinar un formType o DB Manager válido para compId: ${compId}`);
        return undefined;
    }

    const dbManager = dbManagerMap[formType];
    return {
        formType,
        dbManager
    };
}

// --- Función Helper Tipada ---

interface EValue<T> {
    value?: T | T[];
    defaultvalue?: T | T[];
}

type CallbackFunction<T> = (result: T[]) => void;

function isArray<T>(
    evalue: EValue<T>, 
    cb?: CallbackFunction<T>
): T[] {
    const { value, defaultvalue } = evalue;
    let result: T[] = [];
    
    if (Array.isArray(value) && value.length > 0) {
        result = value;
    } else if (Array.isArray(defaultvalue) && defaultvalue.length > 0) {
        result = defaultvalue;
    } else if (value !== undefined && value !== null) {
        result = [value as T];
    } else if (defaultvalue !== undefined && defaultvalue !== null) {
        result = [defaultvalue as T];
    }
    
    if (cb) cb(result);
    return result;
}