import {
  databases,
  IndexedDBManager,
  Emitter,
  getAllDataFromDatabase,
} from "../actionsjs/idb.js"; // Ajusta ruta
import { defaultFormConfig } from "src/config/actionsconfig.js";
import { HttpRequestConfig } from "src/litcomponents/fetchcomponent";
import { HttpRequestExecutor } from "src/fetch/executor";
const configForm = document.getElementById(
  "fetchForm_config"
) as HttpRequestConfig;
const actionDatabase = new IndexedDBManager(databases.ActionsDB);
configForm.addEventListener("config-change", (e) => {
  const { detail } = e as CustomEvent;
  console.log("Config change:", detail);
  const config = configForm.getConfig();
  const validation = configForm.validate();
  console.log("Config validation:", {
    isValid: validation,
    config,
  });
  localStorage.setItem("httpRequestConfig", JSON.stringify(config));
});

document.addEventListener("DOMContentLoaded", async () => {
  if (localStorage.getItem("httpRequestConfig")) {
    const config = JSON.parse(
      localStorage.getItem("httpRequestConfig") || "{}"
    );
    configForm.setConfig(config);
    const executor = new HttpRequestExecutor();
    const result = await executor.execute(config);
    console.log("Loading config:", config, result);
  }
  //configForm.getConfig()
  getFormData();
  listenersForm();
  const testData = await actionDatabase.getDataById(0);
  if (testData) {
    console.log("Test data found:", testData);
    // setFormData(testData);
  }
});
function listenersForm() {
  const actionsContainer = document.querySelector<HTMLElement>(".form-actions");
  if (!actionsContainer) return;
  actionsContainer.addEventListener("click", function (event) {
    if (!(event.target && event.target instanceof Element)) return;
    const clickedButton = event.target.closest("button[data-action]");
    if (!clickedButton) return;
    const action = clickedButton.getAttribute("data-action");
    if (action === "reset") {
    } else if (action === "submit") {
      const formData = getFormData();
      if (!formData) {
        console.error("No form data found");
        return;
      }
      actionDatabase.saveData(formData);
      console.log("Submitting form...", formData);
    }
    event.preventDefault();
    event.stopPropagation();
  });
}
function getFormData() {
  const actionFormElements = document.querySelector("#actionForm");
  if (!actionFormElements) return;
  if (actionFormElements.getElementsByTagName("c-input").length === 0) return;
  const allFields = actionFormElements.getElementsByTagName("c-input");
  const Data = {} as Record<string, any>;
  Object.entries(allFields).forEach(([key, field]) => {
    const fieldName = field.getAttribute("data-field-name") as string;
    if (!fieldName) return;
    const value = field.value;
    Data[fieldName] = value;
  });
  const fetchForm = document.querySelector(
    "#fetchForm_check"
  ) as HTMLInputElement;
  const fetchConfig = document.querySelector(
    "#fetchForm_config"
  ) as HttpRequestConfig;
  return {
    ...Data,
    fetchForm_check: fetchForm.value,
    fetchForm_value: fetchConfig.value,
  };
}
function setFormData(data: Record<string, any>) {
  const actionFormElements = document.querySelector("#actionForm");
  if (!actionFormElements) return;
  const allFields = actionFormElements.getElementsByTagName("c-input");
  Object.entries(allFields).forEach(([key, field]) => {
    const fieldName = field.getAttribute("data-field-name") as string;
    console.log("fieldName:", fieldName, field);
    if (!fieldName) return;
    const value = data[fieldName];
    field.value = value;
  });
  console.log("Setting form data:allFields ", data, allFields);
  const fetchForm = document.querySelector(
    "#fetchForm_check"
  ) as HTMLInputElement;
  fetchForm.value = data.fetchForm_check || "";
  const fetchConfig = document.querySelector(
    "#fetchForm_config"
  ) as HttpRequestConfig;
  fetchConfig.setConfig(data.fetchForm_value || {});
}
