<template>
  <TestReplacer
    :instanceId="instanceId"
    :removeBackslashes="removeBackslashes"
    :useLocalStorage="useLocalStorage"
    :replacements="replacements"
  />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ConfigurableReplacer, type ConfigOptions } from '../replace/ConfigurableReplacer'
import TestReplacer from './TestReplacer.vue'

// Estados reactivos
const instanceId = ref('default')
const removeBackslashes = ref(true)
const useLocalStorage = ref(true)
const replacements = ref<any[]>([])

// Inicialización con valores por defecto
onMounted(() => {
  const tempReplacer = new ConfigurableReplacer()
  const defaultReplacements = Object.entries(tempReplacer.getDefaultReplacements()).map(([pattern, config]) => ({
    id: Date.now() + Math.random(),
    pattern: {
      defaultValue: config.defaultValue,
      dataKey: config.dataKey,
      patternKey: pattern // Guardamos también el patrón original
    }
  }))
  
  replacements.value = defaultReplacements
  loadSavedConfig()
})

// Función para cargar la configuración guardada
const loadSavedConfig = () => {
  try {
    const savedConfig = localStorage.getItem(`configReplacer_default`)
    if (savedConfig) {
      const config: ConfigOptions = JSON.parse(savedConfig)
      instanceId.value = 'default'
      removeBackslashes.value = config.removeBackslashes ?? true
      useLocalStorage.value = config.useLocalStorage ?? true
      
      if (config.replacements) {
        const loadedReplacements = Object.entries(config.replacements).map(([pattern, options]) => ({
          id: Date.now() + Math.random(),
          pattern: {
            defaultValue: options.defaultValue,
            dataKey: options.dataKey,
            patternKey: pattern
          }
        }))
        replacements.value = loadedReplacements
      }
    }
  } catch (e) {
    console.error('Error loading saved config:', e)
  }
}
</script>