<!-- src/components/KeyValueEditor.vue -->
<template>
  <div class="key-value-editor">
    <div v-for="(item, index) in modelValue" :key="index" class="key-value-row">
      <input
        type="checkbox"
        class="checkbox"
        :checked="item.enabled"
        :disabled="isReadonly"
        @change="updateItem(index, 'enabled', ($event.target as HTMLInputElement).checked)"
      />
      <input
        type="text"
        class="input"
        :class="{ readonly: isReadonly }"
        placeholder="Clave"
        :value="item.key"
        :readonly="isReadonly"
        @input="updateItem(index, 'key', ($event.target as HTMLInputElement).value)"
      />
      <input
        :type="showSensitive || !isSensitiveKey(item.key) ? 'text' : 'password'"
        class="input"
        :class="{ readonly: isReadonly }"
        placeholder="Valor"
        :value="item.value"
        :readonly="isReadonly"
        @input="updateItem(index, 'value', ($event.target as HTMLInputElement).value)"
      />
      <button
        class="button danger remove-btn"
        :disabled="isReadonly"
        @click="removeItem(index)"
        title="Eliminar"
      >
        ✕
      </button>
    </div>
    <button
      v-if="canAdd"
      class="button secondary add-btn"
      @click="addItem"
    >
      ＋ Agregar {{ itemName }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { KeyValue } from '@litcomponents/fetch/types';

const props = defineProps<{
  modelValue: KeyValue[];
  isReadonly?: boolean;
  maxItems?: number;
  showSensitive?: boolean;
  itemName: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: KeyValue[]): void;
}>();

const canAdd = computed(() => !props.isReadonly && (!props.maxItems || props.modelValue.length < props.maxItems));

const addItem = () => {
  if (!canAdd.value) return;
  const newList = [...props.modelValue, { key: '', value: '', enabled: true }];
  emit('update:modelValue', newList);
};

const updateItem = (index: number, field: keyof KeyValue, value: string | boolean) => {
  const newList = [...props.modelValue];
  newList[index] = { ...newList[index], [field]: value };
  emit('update:modelValue', newList);
};

const removeItem = (index: number) => {
  const newList = props.modelValue.filter((_, i) => i !== index);
  emit('update:modelValue', newList);
};

const isSensitiveKey = (key: string) => {
  if (!key) return false;
  return key.toLowerCase().includes('auth') || key.toLowerCase().includes('token') || key.toLowerCase().includes('secret');
}
</script>

<style scoped>
.key-value-row {
  display: grid;
  grid-template-columns: auto 1fr 1fr auto;
  gap: 0.5rem;
  align-items: center;
  padding: 0.5rem;
  background: var(--bg-secondary);
  border-radius: 0.375rem;
  border: 1px solid var(--border-color);
  margin-bottom: 0.5rem;
}
.checkbox {
  width: 1rem;
  height: 1rem;
  accent-color: var(--accent-primary);
}
.remove-btn {
  padding: 0.5rem;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.add-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border: 1px dashed var(--accent-primary);
  color: var(--accent-primary);
}
</style>