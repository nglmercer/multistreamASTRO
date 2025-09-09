<!-- src/components/HttpRequestForm.vue -->
<template>
  <div class="http-request-form panel" :data-theme="theme" style="position: relative;">
    <!-- Theme toggle button -->
    <button
      class="button secondary"
      style="position: absolute; top: 1rem; right: 1rem; padding: 0.5rem; width: auto;"
      @click="toggleTheme"
      :title="`Cambiar tema: ${theme}`"
    >
      {{ theme === 'light' ? '☀️' : theme === 'dark' ? '🌙' : '🔄' }}
    </button>

    <div v-if="template" class="template-info">
      <h3 class="template-title">{{ template.name }}</h3>
      <p class="template-description">{{ template.description }}</p>
    </div>

    <!-- Información básica -->
    <div class="form-group">
      <label class="form-label" :class="{ required: isFieldRequired('name') }">Nombre de la configuración</label>
      <input
        type="text"
        class="input"
        :class="{ readonly: isFieldReadonly('name'), error: errors.name }"
        placeholder="Mi API Request"
        v-model="config.name"
        :readonly="isFieldReadonly('name')"
      />
      <div v-if="errors.name" class="error-message">{{ errors.name }}</div>
    </div>

    <div class="form-group">
      <label class="form-label" :class="{ required: isFieldRequired('url') }">Endpoint</label>
      <div class="url-row">
        <select
          class="select"
          v-model="config.method"
          :disabled="isFieldReadonly('method')"
        >
          <option v-for="method in allowedMethods" :key="method" :value="method">
            {{ method }}
          </option>
        </select>
        
        <input
          type="text"
          class="input"
          :class="{ readonly: isFieldReadonly('url'), error: errors.url }"
          placeholder="https://api.ejemplo.com/endpoint"
          v-model="config.url"
          :readonly="isFieldReadonly('url')"
        />
      </div>
      <div v-if="errors.url" class="error-message">{{ errors.url }}</div>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <nav class="tab-nav">
        <button
          v-if="!isFieldHidden('params')"
          class="tab-button"
          :class="{ active: activeTab === 'params' }"
          @click="activeTab = 'params'"
        >
          Parámetros
        </button>
        
        <button
          v-if="!isFieldHidden('headers')"
          class="tab-button"
          :class="{ active: activeTab === 'headers' }"
          @click="activeTab = 'headers'"
        >
          Headers
        </button>
        
        <button
          v-if="!isFieldHidden('auth')"
          class="tab-button"
          :class="{ active: activeTab === 'auth' }"
          @click="activeTab = 'auth'"
        >
          Auth
        </button>
        
        <button
          v-if="!isFieldHidden('body')"
          class="tab-button"
          :class="{ active: activeTab === 'body' }"
          @click="activeTab = 'body'"
        >
          Body
        </button>
        
        <button
          class="button secondary show-sensitive-btn"
          @click="showSensitive = !showSensitive"
          title="Mostrar/ocultar valores sensibles"
        >
          {{ showSensitive ? '🙈' : '👁️' }}
        </button>
      </nav>
    </div>

    <!-- Tab Content -->
    <div class="tab-content">
      <!-- Parámetros -->
      <div v-if="activeTab === 'params' && !isFieldHidden('params')">
        <h3 class="form-label">Parámetros de Query</h3>
        <KeyValueEditor 
          v-model="config.params"
          :is-readonly="isFieldReadonly('params')"
          :max-items="template?.maxParams"
          :show-sensitive="showSensitive"
          item-name="parámetro"
        />
        <div v-if="errors.params" class="error-message">{{ errors.params }}</div>
      </div>

      <!-- Headers -->
      <div v-if="activeTab === 'headers' && !isFieldHidden('headers')">
        <h3 class="form-label">Headers</h3>
        <KeyValueEditor 
          v-model="config.headers"
          :is-readonly="isFieldReadonly('headers')"
          :show-sensitive="showSensitive"
          item-name="header"
        />
        <div v-if="errors.headers" class="error-message">{{ errors.headers }}</div>
      </div>

      <!-- Auth -->
      <div v-if="activeTab === 'auth' && !isFieldHidden('auth')">
        <h3 class="form-label">Autenticación</h3>
        <div class="auth-container">
          <select
            class="select"
            v-model="config.auth.type"
            :disabled="isFieldReadonly('auth')"
          >
            <option value="none">Sin autenticación</option>
            <option value="bearer">Bearer Token</option>
            <option value="basic">Basic Auth</option>
          </select>

          <input
            v-if="config.auth.type === 'bearer'"
            :type="showSensitive ? 'text' : 'password'"
            class="input"
            :class="{ readonly: isFieldReadonly('auth.token') }"
            placeholder="Token"
            v-model="config.auth.token"
            :readonly="isFieldReadonly('auth.token')"
          />

          <div v-if="config.auth.type === 'basic'" class="auth-grid">
            <input
              type="text"
              class="input"
              :class="{ readonly: isFieldReadonly('auth.username') }"
              placeholder="Usuario"
              v-model="config.auth.username"
              :readonly="isFieldReadonly('auth.username')"
            />
            <input
              :type="showSensitive ? 'text' : 'password'"
              class="input"
              :class="{ readonly: isFieldReadonly('auth.password') }"
              placeholder="Contraseña"
              v-model="config.auth.password"
              :readonly="isFieldReadonly('auth.password')"
            />
          </div>
        </div>
      </div>

      <!-- Body -->
      <div v-if="activeTab === 'body' && !isFieldHidden('body')">
        <BodyEditor 
          v-model:body="config.body"
          v-model:body-type="config.bodyType"
          :method="config.method"
          :template="template?.bodyTemplate"
          :errors="errors"
          @update:body="handleBodyUpdate"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, defineAsyncComponent } from 'vue';
import type { RequestConfig, RequestTemplate, KeyValue, FieldConstraint, BodyTemplate } from '@litcomponents/fetch/types';

// --- Componentes dinámicos para evitar dependencias circulares si se separan ---
//@ts-ignore
const KeyValueEditor = defineAsyncComponent(() => import('./KeyValueEditor.vue'));
//@ts-ignore
const BodyEditor = defineAsyncComponent(() => import('./BodyEditor.vue'));
// --- PROPS Y EMITS ---
const props = defineProps<{
  modelValue: RequestConfig;
  template?: RequestTemplate;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: RequestConfig): void;
}>();

// --- ESTADO REACTIVO ---
const theme = ref<'light' | 'dark'>('dark');
const activeTab = ref<'params' | 'headers' | 'auth' | 'body'>('params');
const showSensitive = ref(false);
const errors = reactive<Record<string, string>>({});

// --- CONFIGURACIÓN CON V-MODEL ---
// Usamos un computed para que el v-model funcione correctamente con props
const config = computed({
  get: () => props.modelValue,
  set: (value) => {
    emit('update:modelValue', value);
    validateAllFields();
  }
});

// --- LÓGICA DE TEMPLATE Y CONSTRAINTS ---
const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
const allowedMethods = computed(() => props.template?.allowedMethods || methods);

const getFieldConstraint = (fieldName: string): FieldConstraint | undefined => {
  return props.template?.constraints[fieldName];
};

const isFieldReadonly = (fieldName: string) => getFieldConstraint(fieldName)?.type === 'readonly';
const isFieldHidden = (fieldName: string) => getFieldConstraint(fieldName)?.type === 'hidden';
const isFieldRequired = (fieldName: string) => getFieldConstraint(fieldName)?.type === 'required';

// --- VALIDACIÓN ---
const getNestedValue = (obj: any, path: string): any => {
    return path.split('.').reduce((current, key) => current?.[key], obj);
}

const validateField = (fieldName: string, value: any): string | null => {
  const constraint = getFieldConstraint(fieldName);
  if (!constraint) return null;

  if (constraint.type === 'required' && (!value || value.toString().trim() === '')) {
    return constraint.message || `${fieldName} es requerido`;
  }
  if (constraint.validator && !constraint.validator(value)) {
    return constraint.message || `${fieldName} no es válido`;
  }
  if (constraint.options && !constraint.options.includes(value)) {
    return constraint.message || `${fieldName} debe ser uno de: ${constraint.options.join(', ')}`;
  }
  return null;
};

const validateAllFields = () => {
  // Limpiar errores antiguos
  for (const key in errors) {
    delete errors[key];
  }
  
  // Validar campos básicos
  Object.keys(props.template?.constraints || {}).forEach(fieldName => {
    const value = getNestedValue(config.value, fieldName);
    const error = validateField(fieldName, value);
    if (error) {
      errors[fieldName] = error;
    }
  });

  // Validar body (si es JSON y tiene template)
  if (props.template?.bodyTemplate && config.value.body) {
    validateBodyTemplate();
  }
};

const validateBodyTemplate = () => {
    try {
      const bodyData = JSON.parse(config.value.body);
      const template = props.template!.bodyTemplate!;
      
      template.editableFields.forEach(fieldPath => {
        const value = getNestedValue(bodyData, fieldPath);
        // Aquí podrías agregar validaciones más complejas si las necesitas
      });
    } catch (e) {
      errors['body'] = 'El JSON en el cuerpo no es válido.';
    }
}

// Escuchar cambios en la configuración para re-validar
watch(config, validateAllFields, { deep: true });

// --- MÉTODOS PÚBLICOS (expuestos al padre) ---
const validate = (): { isValid: boolean; errors: string[] } => {
  validateAllFields();
  const errorMessages = Object.values(errors);
  return {
    isValid: errorMessages.length === 0,
    errors: errorMessages,
  };
};

const reset = () => {
  // Implementa la lógica de reseteo según tus necesidades
  // Por ejemplo, volver a un estado inicial o por defecto.
  console.log("Formulario reseteado.");
};

defineExpose({ validate, reset });

// --- LÓGICA AUXILIAR ---
const toggleTheme = () => {
  const themes: ('light' | 'dark')[] = ['light', 'dark'];
  const currentIndex = themes.indexOf(theme.value);
  theme.value = themes[(currentIndex + 1) % themes.length];
};

const handleBodyUpdate = (newBody: string) => {
    config.value.body = newBody;
    validateBodyTemplate();
}
</script>


<style>
/* He copiado y adaptado tus estilos base para que funcionen con este componente.
   Cambié ':host' por '.http-request-form' para que se aplique al div raíz del componente. */

.http-request-form {
  display: block;
  font-family: system-ui, -apple-system, sans-serif;
  color-scheme: light dark;
  
  /* Variables CSS para colores - Light theme (default) */
  --bg-primary: #ffffff;
  --bg-secondary: #f9fafb;
  --bg-tertiary: #f3f4f6;
  --border-color: #e5e7eb;
  --border-focus: #3b82f6;
  --text-primary: #111827;
  --text-secondary: #6b7280;
  --text-muted: #9ca3af;
  --accent-primary: #3b82f6;
  --accent-hover: #2563eb;
  --danger: #dc2626;
  --danger-bg: #fef2f2;
  --success: #059669;
  --warning: #d97706;
  --shadow: rgba(0, 0, 0, 0.1);
  --shadow-focus: rgba(59, 130, 246, 0.1);
  --input-bg: #ffffff;
  --disabled-bg: #f9fafb;
  --disabled-text: #9ca3af;
}

/* Dark theme con atributo de datos */
.http-request-form[data-theme="dark"] {
  --bg-primary: #111827;
  --bg-secondary: #1f2937;
  --bg-tertiary: #374151;
  --border-color: #374151;
  --border-focus: #60a5fa;
  --text-primary: #f9fafb;
  --text-secondary: #d1d5db;
  --text-muted: #9ca3af;
  --accent-primary: #60a5fa;
  --accent-hover: #3b82f6;
  --danger: #f87171;
  --danger-bg: #1f2937;
  --success: #34d399;
  --warning: #fbbf24;
  --shadow: rgba(0, 0, 0, 0.3);
  --shadow-focus: rgba(96, 165, 250, 0.2);
  --input-bg: #1f2937;
  --disabled-bg: #374151;
  --disabled-text: #6b7280;
}

/* Light theme con atributo de datos */
.http-request-form[data-theme="light"] {
  --bg-primary: #ffffff;
  --bg-secondary: #f9fafb;
  --bg-tertiary: #f3f4f6;
  --border-color: #e5e7eb;
  --border-focus: #3b82f6;
  --text-primary: #111827;
  --text-secondary: #6b7280;
  --text-muted: #9ca3af;
  --accent-primary: #3b82f6;
  --accent-hover: #2563eb;
  --danger: #dc2626;
  --danger-bg: #fef2f2;
  --success: #059669;
  --warning: #d97706;
  --shadow: rgba(0, 0, 0, 0.1);
  --shadow-focus: rgba(59, 130, 246, 0.1);
  --input-bg: #ffffff;
  --disabled-bg: #f9fafb;
  --disabled-text: #9ca3af;
}

/* Estilos de los componentes */
.panel {
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  padding: 1.5rem;
  background: var(--bg-primary);
  color: var(--text-primary);
  box-shadow: 0 1px 3px var(--shadow);
}

.input, .select, .textarea {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  font-size: 0.875rem;
  outline: none;
  transition: all 0.2s ease;
  width: 100%;
  box-sizing: border-box;
  background: var(--input-bg);
  color: var(--text-primary);
}

.input:focus, .select:focus, .textarea:focus {
  border-color: var(--border-focus);
  box-shadow: 0 0 0 3px var(--shadow-focus);
}

.input.readonly, .textarea.readonly {
  background: var(--bg-secondary);
  border-style: dashed;
  cursor: default;
}

.input.error, .textarea.error {
  border-color: var(--danger);
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
}

.form-group {
  margin-bottom: 1rem;
}

.form-label {
  display: block;
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

.form-label.required::after {
  content: " *";
  color: var(--danger);
}

.error-message {
  color: var(--danger);
  font-size: 0.75rem;
  margin-top: 0.25rem;
}

.button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.5rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
}
.button.primary { background: var(--accent-primary); color: white; }
.button.primary:hover { background: var(--accent-hover); }
.button.secondary { background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border-color); }
.button.secondary:hover { background: var(--bg-tertiary); }
.button.danger { background: var(--danger); color: white; }
.button.danger:hover { background: #b91c1c; }
.button:disabled { opacity: 0.5; cursor: not-allowed; }

.tabs {
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 1rem;
}

.tab-nav {
  display: flex;
  gap: 2rem;
  align-items: center;
}

.tab-button {
  padding: 0.5rem 0.25rem;
  border: none;
  border-bottom: 2px solid transparent;
  background: none;
  font-weight: 500;
  font-size: 0.875rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.tab-button.active {
  color: var(--accent-primary);
  border-bottom-color: var(--accent-primary);
}

.tab-button:hover:not(.active) {
  color: var(--text-primary);
}

.tab-content {
  min-height: 200px;
}

.url-row {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.5rem;
  align-items: center;
}

.show-sensitive-btn {
  margin-left: auto;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
}

.auth-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.auth-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.template-info {
  margin-bottom: 1rem;
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 0.5rem;
  border-left: 4px solid var(--accent-primary);
}
.template-title {
  margin: 0 0 0.5rem 0;
  color: var(--accent-primary);
}
.template-description {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

</style>