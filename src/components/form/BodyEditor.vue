<!-- src/components/BodyEditor.vue -->
<template>
  <div>
    <div v-if="isBodyDisabled" class="disabled-body-message">
      Los métodos {{ method }} no permiten cuerpo en la petición.
    </div>
    
    <div v-else>
      <!-- Editor con Template -->
      <div v-if="template">
        <div v-for="fieldPath in template.editableFields" :key="fieldPath" class="form-group">
          <label class="form-label">{{ fieldPath }} ({{ template.fieldTypes[fieldPath] }})</label>
          <component
            :is="getFieldComponent(template.fieldTypes[fieldPath])"
            :model-value="getNestedValue(bodyData, fieldPath)"
            @update:model-value="updateNestedValue(fieldPath, $event)"
          />
          <div v-if="errors[`body.${fieldPath}`]" class="error-message">
            {{ errors[`body.${fieldPath}`] }}
          </div>
        </div>
        <div style="margin-top: 1rem;">
          <label class="form-label">Vista previa JSON</label>
          <textarea
            class="textarea readonly"
            :value="JSON.stringify(bodyData, null, 2)"
            readonly
          ></textarea>
        </div>
      </div>
      
      <!-- Editor sin Template -->
      <div v-else>
        <div class="body-header">
          <h3 class="form-label">Cuerpo de la petición</h3>
          <select
            class="select"
            style="width: auto;"
            :value="bodyType"
            @change="$emit('update:bodyType', ($event.target as HTMLSelectElement).value as any)"
          >
            <option v-for="type in bodyTypes" :key="type.value" :value="type.value">
              {{ type.label }}
            </option>
          </select>
        </div>
        <textarea
          class="textarea"
          :class="{ error: errors.body }"
          :placeholder="bodyType === 'json' ? '{}' : 'Contenido del cuerpo'"
          :value="body"
          @input="$emit('update:body', ($event.target as HTMLTextAreaElement).value)"
        ></textarea>
        <div v-if="errors.body" class="error-message">{{ errors.body }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { BodyTemplate } from '@litcomponents/fetch/types';
import { resolveComponent } from 'vue';

const props = defineProps<{
  body: string;
  bodyType: 'json' | 'text' | 'form' | 'urlencoded';
  method: string;
  template?: BodyTemplate;
  errors: Record<string, string>;
}>();

const emit = defineEmits<{
  (e: 'update:body', value: string): void;
  (e: 'update:bodyType', value: 'json' | 'text' | 'form' | 'urlencoded'): void;
}>();

const isBodyDisabled = computed(() => ['GET', 'HEAD'].includes(props.method));
const bodyTypes = [
  { value: 'json', label: 'JSON' },
  { value: 'text', label: 'Text' },
  { value: 'form', label: 'Form Data' },
  { value: 'urlencoded', label: 'URL Encoded' }
];

// --- Lógica para Body con Template ---
const bodyData = ref<any>({});

try {
  bodyData.value = JSON.parse(props.body || '{}');
} catch {
  bodyData.value = {};
}

watch(() => props.body, (newVal) => {
  try {
    bodyData.value = JSON.parse(newVal || '{}');
  } catch {}
});


const getNestedValue = (obj: any, path: string): any => {
  return path.split('.').reduce((current, key) => current?.[key], obj);
};

const updateNestedValue = (path: string, value: any) => {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  let target = bodyData.value;
  for (const key of keys) {
    target = target[key] = target[key] || {};
  }
  target[lastKey] = value;
  emit('update:body', JSON.stringify(bodyData.value, null, 2));
};

const getFieldComponent = (type: string) => {
  // En un proyecto real, estos serían componentes importados
  // Aquí usamos inputs nativos por simplicidad
  switch (type) {
    case 'number': return 'input'; // `type="number"` se manejaría con atributos
    case 'boolean': return 'select';
    default: return 'input'; // `type="text"`
  }
}
</script>

<style scoped>
.disabled-body-message {
  text-align: center;
  padding: 2rem;
  color: var(--text-muted);
  background: var(--bg-secondary);
  border-radius: 0.5rem;
  border: 1px dashed var(--border-color);
}
.body-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}
.textarea.readonly {
  min-height: 100px;
  font-size: 0.75rem;
}
</style>