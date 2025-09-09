<template>
  <div 
    ref="formElement"
    :class="`action-form ${darkmode ? 'dark' : 'light'}`" 
    :data-form-id="formId"
  >
    <form :id="formId" class="form-container" novalidate @submit.prevent="submitForm">
      <header class="form-header">
        <h3 class="form-title">{{ title }}</h3>
        <p v-if="description" class="form-description">{{ description }}</p>
      </header>
      
      <div class="fields-container">
        <div 
          v-for="[fieldKey, fieldConfig] in visibleFields" 
          :key="fieldKey"
          class="field-wrapper" 
          :data-field="fieldKey"
          :data-field-type="fieldConfig.type || 'text'"
          :class="{ invalid: validationErrors[fieldKey] }"
        >
          <label :for="`${formId}-field-${fieldKey}`" class="field-label">
            {{ fieldConfig.label || fieldKey }}
            <span v-if="fieldConfig.required" class="required-indicator" aria-label="Campo requerido">*</span>
          </label>
          
          <c-input
            :id="`${formId}-field-${fieldKey}`"
            :name="fieldKey"
            :type="fieldConfig.type || 'text'"
            :value="formData[fieldKey]?.toString() || ''"
            :placeholder="fieldConfig.placeholder"
            :required="fieldConfig.required"
            :disabled="fieldConfig.disabled"
            :readonly="fieldConfig.readonly"
            :min="fieldConfig.min"
            :max="fieldConfig.max"
            :step="fieldConfig.step"
            :pattern="fieldConfig.pattern"
            :multiple="fieldConfig.multiple"
            :options="fieldConfig.options ? JSON.stringify(fieldConfig.options) : undefined"
            :darkmode="darkmode"
            :data-field-name="fieldKey"
            @change="handleFieldChange"
            @input="handleFieldChange"
          />
          
          <div v-if="validationErrors[fieldKey]" class="field-error" role="alert">
            {{ validationErrors[fieldKey] }}
          </div>
        </div>
      </div>
      <div class="custom-fields">
    <SwitchEV
        :id="'fetchForm'"
        :label="'Habilitar Configuración HTTP'"
        v-model="fetchFormEnabled">
        <http-request-config id="fetchForm_config"></http-request-config>
        </SwitchEV>
      </div>
      <footer class="form-actions">
        <slot name="actions">
          <button 
            type="button" 
            class="btn btn-secondary" 
            @click="resetForm"
            :disabled="isSubmitting"
          >
            Reiniciar
          </button>
          <button 
             type="button" 
             class="btn btn-secondary" 
             @click="handleExport"
             :disabled="isSubmitting"
           >
             Exportar
           </button>
           <button 
             type="button" 
             class="btn btn-secondary" 
             @click="handleImport"
             :disabled="isSubmitting"
           >
             Importar
           </button>
          <button 
            type="submit" 
            class="btn btn-primary" 
            :disabled="isSubmitting || !isValid"
          >
            {{ isSubmitting ? 'Guardando...' : 'Guardar' }}
          </button>
        </slot>
      </footer>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, getCurrentInstance } from 'vue'
import { useFormManager } from './useFormManager'
import { vueFormAdapter } from './VueFormAdapter'
import type { FormData, FormConfig } from '../../config/actionsconfig'
import { defaultFormConfig } from '../../config/actionsconfig'
import SwitchEV from '@components/switchEV.vue'
// Props
interface Props {
  formId?: string
  title?: string
  description?: string
  initialData?: Partial<FormData>
  formConfig?: FormConfig
  darkmode?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  formId: 'mainForm',
  title: 'Configurar Acción',
  description: '',
  initialData: () => ({}),
  formConfig: () => defaultFormConfig,
  darkmode: true
})

// Emits
interface Emits {
  submit: [data: FormData]
  reset: []
  change: [fieldName: string, value: any, formData: FormData]
  export: [data: FormData]
  import: []
}

const emit = defineEmits<Emits>()

// Form manager
const {
  formData,
  validationErrors,
  isSubmitting,
  isValid,
  visibleFields,
  formElement,
  updateField,
  validateForm,
  submitForm: _submitForm,
  resetForm: _resetForm,
  setFormData
} = useFormManager({
  formId: props.formId,
  initialData: props.initialData,
  formConfig: props.formConfig,
  onSubmit: async (data) => {
    await vueFormAdapter.handleSubmit(data)
    emit('submit', data)
  },
  onReset: () => {
    emit('reset')
  },
  onChange: (fieldName, value, formData) => {
    emit('change', fieldName, value, formData)
  }
})

// Instancia actual del componente
const instance = getCurrentInstance()

// Estado para el switch de configuración HTTP
const fetchFormEnabled = ref(false)

// Métodos
function handleFieldChange(event: Event) {
  const target = event.target as any
  if (target.tagName === 'C-INPUT') {
    const fieldName = target.getAttribute('data-field-name')
    if (fieldName) {
      const value = target.getVal ? target.getVal() : target.value
      updateField(fieldName, value)
    }
  }
}

function submitForm() {
  _submitForm()
}

function resetForm() {
  _resetForm()
}

// Manejadores de eventos específicos
function handleExport() {
  vueFormAdapter.handleExport(formData)
}

function handleImport() {
  vueFormAdapter.handleImport()
}

// Watchers
watch(() => props.initialData, (newData) => {
  if (newData && Object.keys(newData).length > 0) {
    setFormData(newData)
  }
}, { deep: true, immediate: true })

// Lifecycle hooks
onMounted(() => {
  // Registrar este componente con el adaptador
  vueFormAdapter.registerVueForm({
    formData,
    setFormData,
    resetForm,
    submitForm,
    validateForm,
    updateField
  })
  
  // Registrar el modal si existe
  const modal = document.getElementById('ActionModal')
  if (modal) {
    vueFormAdapter.registerModal(modal)
  }
})

// Expose methods for parent components
defineExpose({
  formData,
  setFormData,
  resetForm,
  submitForm,
  validateForm,
  updateField,
  handleExport,
  handleImport
})
</script>

<style scoped>
.action-form {
  --form-bg: #f9f9f9;
  --form-border: #eee;
  --text-color: #333;
  --border-color: #ddd;
  --error-color: #dc3545;
  --success-color: #28a745;
  --primary-color: #007bff;
  --secondary-color: #6c757d;
  
  display: block;
  font-family: system-ui, -apple-system, sans-serif;
  background-color: var(--form-bg);
  border: 1px solid var(--form-border);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 16px;
  color: var(--text-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  width: 80%;
  max-height: 90dvh;
  overflow: auto;
}

.action-form.dark {
  --form-bg: #1a1a1a;
  --form-border: #333;
  --text-color: #e0e0e0;
  --border-color: #444;
}

.form-header {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color);
}

.form-title {
  margin: 0 0 8px 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-color);
}

.form-description {
  margin: 0;
  color: var(--text-color);
  opacity: 0.8;
  font-size: 0.9rem;
  line-height: 1.4;
}

.fields-container {
  display: grid;
  grid-template-columns: auto auto;
  gap: 20px 24px;
  margin-bottom: 24px;
}

.field-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: opacity 0.2s ease;
  grid-column: span 2;
}

.field-wrapper.invalid {
  border-left: 3px solid var(--error-color);
  padding-left: 12px;
  margin-left: -15px;
}

.field-label {
  font-weight: 500;
  font-size: 0.9rem;
  color: var(--text-color);
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.required-indicator {
  color: var(--error-color);
  font-weight: bold;
}

.field-error {
  font-size: 0.8rem;
  color: var(--error-color);
  margin-top: 4px;
}

.custom-fields {
  margin-bottom: 24px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 100px;
}

.btn:focus {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background-color: var(--primary-color);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #0056b3;
  transform: translateY(-1px);
}

.btn-secondary {
  background-color: transparent;
  color: var(--secondary-color);
  border: 1px solid var(--secondary-color);
}

.btn-secondary:hover:not(:disabled) {
  background-color: var(--secondary-color);
  color: white;
}

/* Estilos específicos para tipos de campo */
.field-wrapper[data-field-type="range"] {
  grid-column: span 2;
}

.field-wrapper[data-field-type="textarea"] {
  grid-column: span 2;
}

/* Responsive design */
@media (max-width: 768px) {
  .action-form {
    padding: 16px;
  }
  
  .fields-container {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .field-wrapper[data-field-type="range"],
  .field-wrapper[data-field-type="textarea"] {
    grid-column: span 1;
  }
  
  .form-actions {
    flex-direction: column-reverse;
  }
  
  .btn {
    width: 100%;
  }
}
</style>
