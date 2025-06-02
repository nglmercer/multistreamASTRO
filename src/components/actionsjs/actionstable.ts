// /src/pages/actions/actions.js (o tu ruta)
import {
  databases,
  IndexedDBManager,
  getAllDataFromDatabase,
  EmitEvents
} from "@utils/idb.ts";
import { actionEmitter } from "@components/actionsjs/actionemitter.ts";
import { ObjectTableLit,type EventDetail } from "src/litcomponents/tables.ts";
import {
  setFormData,
  openModal,
  resetForm
} from "@components/actions/actions.ts"
const pageConfig = {
  formType: "actions",
  modalId: "Action-modal",
  editorId: "Action-editor",
  managerId: "ActionConfigManager",
  addButtonId: "actionButton",
  dbConfig: databases.ActionsDB,
  baseCompId: "actionsTable",
};

const editorEl = document.getElementById(pageConfig.editorId);
const managerEl = document.getElementById(
  pageConfig.managerId
) as ObjectTableLit;
const actionDbManager = new IndexedDBManager(
  pageConfig.dbConfig,
  actionEmitter
);

async function initTablelisteners() {
  if (!editorEl || !managerEl) {
    console.error("Error: Elementos UI necesarios no encontrados.");
    // Podrías detener aquí o mostrar un error visual
  }
  managerEl.data = await renderdata();
  managerEl.keys = ["id", "name"];
  console.log("Inicializando listeners de tabla...", editorEl, managerEl);
  managerEl.addEventListener("action", async (e) => {
    const {detail} = e as CustomEvent<EventDetail>;
    if (detail.originalAction === "edit") {
        openModal();
        console.log("Editando elemento:", detail.item);
        setFormData(detail.item)
    }
    if (detail.originalAction === "delete") {
      const {id} = detail.item
      //modal confirm delete
      console.log("Eliminando elemento con ID:", id);
      window.showDialog(`eliminar elemento con ID: ${id}`, 'aceptar', 'cancelar')
      .then(async (result:boolean) => {
        console.log("Resultado de la confirmación:", result);
        if (result){
            const deleteResult = await actionDbManager.deleteData(id);
            actionEmitter.emit("deleteAction", deleteResult);
        }
      })
      .catch((error: boolean) => {
        console.error("Error al mostrar el diálogo de confirmación:", error);
      });
    }
  });
}

actionEmitter.onAny(async(event:string,data) => {
    console.log("event", `Evento emitido: ${event}`, data);
    await refreshTable();
});
setTimeout(() => {
  actionEmitter.emit("exampleEvent", {
    message: "This is an example event",
    timestamp: new Date().toISOString()
  });
}, 5000); // emit exampleEvent after 5 seconds
async function renderdata() {
  const data = await actionDbManager.getAllData();
  return data;
}


async function refreshTable(elementtable = managerEl) {
    const table = elementtable as ObjectTableLit;
    if (!table) {
        console.error(`Error: No se encontró el componente de tabla`, table);
        return;
    }
    table.data = await renderdata();
    return table.data;
}

document.addEventListener("DOMContentLoaded", () => {
  initTablelisteners();
});
