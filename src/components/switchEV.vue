<template>
  <div class="switch-field-container">
    <label :for="switchId" class="field-label">
      {{ label || id }}
    </label>
    
    <input
      :id="switchId"
      :name="switchId"
      type="checkbox"
      :checked="isChecked"
      @change="handleChange"
      class="switch"
    />
    
    <div
      :class="['field-wrapper', { hidden: !isChecked }]"
      :data-field="id"
      :data-field-type="label || 'text'"
    >
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

interface Props {
  id: string
  label: string
  checked?: boolean
  modelValue?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  checked: false,
  modelValue: false
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'change': [value: boolean]
}>()

const switchId = computed(() => `${props.id}_check`)

// Usar modelValue si está disponible, sino usar checked
const isChecked = computed(() => props.modelValue !== undefined ? props.modelValue : props.checked)

const handleChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const value = target.checked
  
  emit('update:modelValue', value)
  emit('change', value)
  
  console.log(`Switch ${props.id} changed to ${value}`)
}

// Sincronizar con prop checked si no se usa v-model
watch(() => props.checked, (newValue) => {
  if (props.modelValue === undefined && newValue !== undefined) {
    emit('update:modelValue', newValue)
  }
}, { immediate: true })
</script>

<style scoped>
.switch-field-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.field-label {
  font-weight: 500;
  cursor: pointer;
}

.switch {
  /* Estilos básicos para el switch - personaliza según necesites */
  appearance: none;
  width: 3rem;
  height: 1.5rem;
  background-color: #e5e7eb;
  border-radius: 0.75rem;
  position: relative;
  cursor: pointer;
  transition: background-color 0.2s;
}

.switch:checked {
  background-color: #3b82f6;
}

.switch::before {
  content: '';
  position: absolute;
  width: 1.25rem;
  height: 1.25rem;
  background-color: white;
  border-radius: 50%;
  top: 0.125rem;
  left: 0.125rem;
  transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.switch:checked::before {
  transform: translateX(1.5rem);
}

.field-wrapper {
  transition: all 0.2s ease-in-out;
}

.hidden {
  display: none;
}
</style>