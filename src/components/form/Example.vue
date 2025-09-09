<!-- src/App.vue o cualquier otro componente padre -->
<template>
  <div class="container">
    <h1>Constructor de Peticiones HTTP</h1>
    <HttpRequestForm 
      ref="formComponent"
      v-model="requestConfig"
      :template="activeTemplate"
    />
    <div class="actions">
      <button class="button primary" @click="handleExecute" :disabled="isLoading">
        {{ isLoading ? 'Enviando...' : 'Enviar Petición' }}
      </button>
      <button class="button secondary" @click="resetForm">
        Resetear
      </button>
    </div>
    
    <div v-if="isLoading" class="loader">Cargando...</div>
    
    <div v-if="fetchResult" class="result-panel">
      <h2>Resultado</h2>
      <pre>{{ JSON.stringify(fetchResult, null, 2) }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import HttpRequestForm from './HttpRequestForm.vue';
import { HttpRequestExecutor,type RequestResponse } from '@/fetch/executor';
import type { RequestConfig, RequestTemplate } from '@litcomponents/fetch/types';

// Referencia al componente hijo para llamar sus métodos
const formComponent = ref<InstanceType<typeof HttpRequestForm> | null>(null);

// Estado inicial de la configuración
const requestConfig = ref<RequestConfig>({
  name: 'Mi Petición de Prueba',
  url: 'https://jsonplaceholder.typicode.com/posts',
  method: 'GET',
  headers: [],
  params: [{ key: 'userId', value: '1', enabled: true }],
  body: '',
  bodyType: 'json',
  auth: { type: 'none', token: '', username: '', password: '' }
});

// Ejemplo de un template que podrías cargar dinámicamente
const activeTemplate = ref<RequestTemplate | undefined>(undefined); // O define un template aquí

// Estado para la ejecución
const isLoading = ref(false);
const fetchResult = ref<RequestResponse | null>(null);

const handleExecute = async () => {
  if (!formComponent.value) return;

  const { isValid, errors } = formComponent.value.validate();
  if (!isValid) {
    alert(`El formulario tiene errores: ${errors.join(', ')}`);
    return;
  }

  isLoading.value = true;
  fetchResult.value = null;
  const executor = new HttpRequestExecutor();
  
  try {
    const result = await executor.execute(requestConfig.value);
    fetchResult.value = result;
  } catch (error) {
    console.error("Error al ejecutar la petición:", error);
    // Podrías mostrar un error más amigable aquí
  } finally {
    isLoading.value = false;
  }
};

const resetForm = () => {
  if (formComponent.value) {
    formComponent.value.reset();
  }
  // También resetea la config en el padre
  requestConfig.value = {
    name: '',
    url: '',
    method: 'GET',
    headers: [],
    params: [],
    body: '',
    bodyType: 'json',
    auth: { type: 'none', token: '', username: '', password: '' }
  };
};

</script>

<style>
body {
  background-color: #f3f4f6;
  margin: 0;
  padding: 2rem;
}
@media (prefers-color-scheme: dark) {
  body {
    background-color: #111827;
  }
}
.container {
  max-width: 800px;
  margin: 0 auto;
}
h1 {
  color: #111827;
}
@media (prefers-color-scheme: dark) {
  h1 {
    color: #f9fafb;
  }
}
.actions {
  margin-top: 1.5rem;
  display: flex;
  gap: 1rem;
}
.result-panel {
  margin-top: 2rem;
  background-color: #fff;
  padding: 1rem;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
}
@media (prefers-color-scheme: dark) {
  .result-panel {
    background-color: #1f2937;
    border-color: #374151;
    color: #f9fafb;
  }
}
pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  background-color: #f9fafb;
  padding: 1rem;
  border-radius: 0.5rem;
}
@media (prefers-color-scheme: dark) {
  pre {
     background-color: #111827;
  }
}
</style>