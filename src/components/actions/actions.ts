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
// Elementos DOM globales con validación
const configForm = document.getElementById("fetchForm_config") as HttpRequestConfig;
const actionDatabase = new IndexedDBManager(databases.ActionsDB);
const actionButton = document.getElementById("actionButton");
const ActionModal = document.getElementById("ActionModal") as DialogContainer;

document.addEventListener("DOMContentLoaded", async () => {
  try {
    listenersForm();

    if (actionButton) {
      actionButton.addEventListener("click", () => {
        openModal();
        resetForm();
      });
    } else {
      console.warn("Action button not found");
    }
  } catch (error) {
    console.error("Error during DOM initialization:", error);
  }
});

function openModal(): void {
  if (!ActionModal) {
    console.warn("Action modal not found");
    return;
  }
  ActionModal.show();
}
function closeModal(): void {
  if (!ActionModal) {
    console.warn("Action modal not found");
    return;
  }
  ActionModal.hide();
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
}
const actionsEvents = {
  reset: ()=>{
    resetForm();
    console.log("Form reset");
  },
  submit:async ()=>{
    const formData = getFormData();
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
      closeModal();
      console.log("Form submitted successfully:", result);
      actionEmitter.emit("actionFormSubmit", result);

    }
  },
  export:async ()=>{
    const formData = getFormData();
    if (!formData) {
      console.error("No form data found");
      return;
    }
    if (typeof formData.id === "string"){
      formData.id = parseInt(formData.id, 10);
    }
    const result = await exportarJSON(formData,{mode:'download',filename:formData.name})
    console.log("exportcallback result",formData)
  },
  import: async()=>{
    const result =await seleccionarYParsearJSON()
    console.log("importcallback",result);
    if (!result)return;
    setFormData(result)
  },
}


function getFormData(): Record<string, any> | null {
  try {
    const actionFormElements = document.querySelector("#actionForm");
    if (!actionFormElements) {
      console.warn("Action form not found");
      return null;
    }

    const allFields = actionFormElements.getElementsByTagName("c-input");
    if (allFields.length === 0) {
      console.warn("No input fields found");
      return null;
    }

    const data: Record<string, any> = {};

    // Usar Array.from() en lugar de Object.entries() para HTMLCollection
    Array.from(allFields).forEach((field:CInput) => {
      const fieldName = field.getAttribute("data-field-name");
      if (fieldName) {
        data[fieldName] = (field).value;
      }
    });

    // Obtener elementos adicionales con validación
    const fetchForm = document.querySelector("#fetchForm_check") as HTMLInputElement;
    const fetchConfig = document.querySelector("#fetchForm_config") as HttpRequestConfig;
    const fetchConfigValue = fetchConfig ? (fetchConfig.getConfig() || fetchConfig.value) : {};

    return {
      ...data,
      fetchForm_check: fetchForm?.value || "",
      fetchForm_value: fetchConfigValue || {},
    };
  } catch (error) {
    console.error("Error getting form data:", error);
    return null;
  }
}

function setFormData(data: Record<string, any>): void {
  if (!data || Object.keys(data).length === 0) {
    console.warn("No data provided to setFormData");
    return;
  }

  try {
    const actionFormElements = document.querySelector("#actionForm");
    if (!actionFormElements) {
      console.warn("Action form not found");
      return;
    }

    const allFields = actionFormElements.getElementsByTagName("c-input");

    // Usar Array.from() correctamente
    Array.from(allFields).forEach((field:CInput) => {
      const fieldName = field.getAttribute("data-field-name");
      if (fieldName && data[fieldName] !== undefined) {
        (field).setVal(data[fieldName]);
      }
    });

    console.log("Setting form data:", data);

    // Configurar elementos adicionales con validación
    const fetchForm = document.querySelector("#fetchForm_check") as CInput;
    if (fetchForm) {
      fetchForm.setVal(data.fetchForm_check);
    }

    const fetchConfig = document.querySelector("#fetchForm_config") as HttpRequestConfig;
    if (fetchConfig) {
      fetchConfig.setConfig(data.fetchForm_value || {});
    }

    console.log("Form data set successfully");
  } catch (error) {
    console.error("Error setting form data:", error);
  }
}

function resetForm(): void {
  try {
    const actionFormElements = document.querySelector("#actionForm");
    if (!actionFormElements) {
      console.warn("Action form not found");
      return;
    }

    const allFields = actionFormElements.getElementsByTagName("c-input");

    // Usar Array.from() correctamente
    Array.from(allFields).forEach((field:CInput) => {
      (field).reset();
    });

    // Reset elementos adicionales con validación
    const fetchForm = document.querySelector("#fetchForm_check") as CInput;
    if (fetchForm) {
      fetchForm.setVal(false);
    }

    const fetchConfig = document.querySelector("#fetchForm_config") as HttpRequestConfig;
    if (fetchConfig) {
      fetchConfig.reset();
    }

    console.log("Form reset successfully");
  } catch (error) {
    console.error("Error resetting form:", error);
  }
}

export {
  setFormData,
  openModal,
  resetForm,
  closeModal
};
/*  if (localStorage.getItem("httpRequestConfig")) {
    const config = JSON.parse(
      localStorage.getItem("httpRequestConfig") || "{}"
    );
    configForm.setConfig(config);
    const executor = new HttpRequestExecutor();
    const result = await executor.execute(config);
    console.log("Loading config:", config, result);
  }*/