import {
  databases,
  IndexedDBManager,
} from "../../utils/idb.ts";
import { HttpRequestConfig } from "src/litcomponents/fetchcomponent";
import { HttpRequestExecutor } from "src/fetch/executor";
import { DialogContainer } from "src/litcomponents/custom-modal.js";
import { CInput } from "src/litcomponents/CInput.js";
import { actionEmitter } from "@components/actionsjs/actionemitter.ts";
import { seleccionarYParsearJSON } from "@utils/jsonbackups/import.ts";
import { exportarJSON } from "@utils/jsonbackups/export.ts";
import { safeParse } from "@utils/jsonutils/safeparse.ts";
import { ArrayTemplate,getTemplate,templates } from "@litcomponents/fetch/my-templates.ts";
import { vueFormAdapter } from "@components/form/VueFormAdapter.ts";
// Elementos DOM globales con validación
const configForm = document.getElementById("fetchForm_config") as HttpRequestConfig;
console.log("configForm",configForm)
const actionDatabase = new IndexedDBManager(databases.ActionsDB);
const ActionsDBButton = document.getElementById("ActionsDBButton");
const ActionModal = document.getElementById("ActionModal") as DialogContainer;
const TemplateModal = document.getElementById("TemplateModal") as DialogContainer;
document.addEventListener("DOMContentLoaded", async () => {
  try {
    listenersForm();

    if (ActionsDBButton) {
      ActionsDBButton.addEventListener("click", () => {
        openModal();
        resetForm();
      });
    } else {
      console.warn("Action button not found");
    }
  } catch (error) {
    console.error("Error during DOM initialization:", error);
  }
  const queryParams = new URLSearchParams(window.location.search);
  const queryObject = Object.fromEntries(queryParams.entries())
  if (!queryObject || !queryObject.data) return
  if (queryObject.import === 'action'){
    openModal();
    const querydata = safeParse(queryObject.data)
    setFormData(querydata)
    console.log("queryObject",queryObject,querydata)
  }
});
function openModal(): void {
  vueFormAdapter.openModal();
}

function closeModal(): void {
  vueFormAdapter.closeModal();
}
function listenersForm(): void {
  const actionsContainer = document.querySelector<HTMLElement>(".form-actions");
  if (!actionsContainer) {
    console.warn("Form actions container not found");
    return;
  }

  actionsContainer.addEventListener("click", async function (event) {
    try {
      if (!(event.target instanceof Element)) return;

      const clickedButton = event.target.closest("button[data-action]");
      if (!clickedButton) return;

      const action = clickedButton.getAttribute("data-action");
      if (!action) return;
      if (action in actionsEvents){
          actionsEvents[action as keyof typeof actionsEvents]();
      }
      else {
        console.warn(`Unknown action: ${action}`);
      }

      event.preventDefault();
      event.stopPropagation();
    } catch (error) {
      console.error("Error handling form action:", error);
    }
  });
  const ActionTemplates = document.getElementById("ActionTemplates") as HTMLButtonElement;
  ActionTemplates?.addEventListener("click", () => {
    TemplateModal.show();
  });
  templates.forEach((template) => {
    const templateButton = document.getElementById(template.id);
    if (templateButton) {
      templateButton.addEventListener("click", () => {
        const TemplateData = getTemplate(template.id);
        console.log("template",TemplateData);
        configForm.changeTemplate(TemplateData);
        openModal();
        TemplateModal.hide();
      });
    }
  })
}
const actionsEvents = {
  reset: ()=>{
    vueFormAdapter.resetForm();
    console.log("Form reset");
  },
  submit:async ()=>{
    const formData = vueFormAdapter.getFormData();
    if (!formData) {
      console.error("No form data found");
      return;
    }
    if (typeof formData.id === "string"){
      formData.id = parseInt(formData.id, 10);
    }
    // Operación async con manejo de errores
    const result = await actionDatabase.saveData(formData);
    if (result){
      vueFormAdapter.closeModal();
      console.log("Form submitted successfully:", result);
      actionEmitter.emit("actionFormSubmit", result);
    }
  },
  export:async ()=>{
    await vueFormAdapter.handleExport(vueFormAdapter.getFormData() as any);
  },
  import: async()=>{
    await vueFormAdapter.handleImport();
  },
}


function getFormData(): Record<string, any> | null {
  return vueFormAdapter.getFormData();
}

function setFormData(data: Record<string, any>): void {
  vueFormAdapter.setFormData(data);
}

function resetForm(): void {
  vueFormAdapter.resetForm();
}
async function test() {
  const config = {
    name: "test",
    url: "http://192.168.100.24:3000/timers/1/add",
    method: "PATCH",
    headers: [],
    params: [],
    body: '{"seconds":60}',
    bodyType: "json",
    auth: null
  }
  const executor = new HttpRequestExecutor();
  console.log("fetch test")
  const result = await executor.execute(config as any);
  console.log("Loading config:", config, result);

}
//test();
export {
  setFormData,
  openModal,
  resetForm,
  closeModal
};

