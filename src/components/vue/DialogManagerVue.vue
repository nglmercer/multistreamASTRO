<template>
  <Teleport to="body" v-if="isVisible && currentDialog">
    <div
      ref="dialogOverlayRef"
      class="dialog-overlay show"
      :aria-hidden="!isVisible"
      role="alertdialog"
      aria-modal="true"
    >
      <div class="dialog-box" role="document">
        <h3 class="dialog-title">{{ currentDialog.title }}</h3>
        <p v-if="currentDialog.message" class="dialog-message">
          {{ currentDialog.message }}
        </p>
        <div class="dialog-actions">
          <button
            ref="acceptButtonRef"
            class="dialog-btn dialog-accept"
            @click="handleResolve(true)"
          >
            {{ currentDialog.acceptText || 'Aceptar' }}
          </button>
          <button
            class="dialog-btn dialog-reject"
            @click="handleResolve(false)"
          >
            {{ currentDialog.rejectText || 'Cancelar' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, reactive, watch, nextTick, onMounted, onUnmounted } from 'vue'

// Tipos
interface DialogOptions {
  title: string
  message?: string
  acceptText?: string
  rejectText?: string
  onOpen?: () => void
  onClose?: (value: boolean) => void
}

interface QueuedDialog extends DialogOptions {
  identifier?: string
  promiseResolve: (value: boolean) => void
}

// Estado global reactivo
const dialogQueue = ref<QueuedDialog[]>([])
const currentDialog = ref<QueuedDialog | null>(null)
const isVisible = ref(false)
const activeDialogIdentifiers = ref(new Set<string>())

// Referencias DOM
const dialogOverlayRef = ref<HTMLDivElement>()
const acceptButtonRef = ref<HTMLButtonElement>()

const HIDE_ANIMATION_DURATION = 300

// Función auxiliar para generar un identificador basado en el contenido del diálogo
const getDialogIdentifier = (options: DialogOptions): string => {
  return `${options.title}|${options.message || ''}|${options.acceptText || ''}|${options.rejectText || ''}`
}

// Función principal para mostrar diálogos
const showQueuedDialogVue = (options: DialogOptions): Promise<boolean> => {
  return new Promise<boolean>((resolve) => {
    const identifier = getDialogIdentifier(options)

    if (activeDialogIdentifiers.value.has(identifier)) {
      console.warn('DialogManagerVue: Un diálogo con datos idénticos ya está en cola o mostrándose. No se agregará.', options)
      resolve(false)
      return
    }

    const newDialog: QueuedDialog = {
      ...options,
      identifier,
      promiseResolve: (value) => {
        resolve(value)
        if (options.onClose) {
          options.onClose(value)
        }
        
        // Removemos el identificador del diálogo actual del Set
        const closingDialog = currentDialog.value
        if (closingDialog && closingDialog.identifier) {
          const newSet = new Set(activeDialogIdentifiers.value)
          newSet.delete(closingDialog.identifier)
          activeDialogIdentifiers.value = newSet
        }

        isVisible.value = false
        setTimeout(() => {
          currentDialog.value = null
        }, HIDE_ANIMATION_DURATION)
      },
    }

    // Agregamos el identificador al Set y el diálogo a la cola
    const newSet = new Set(activeDialogIdentifiers.value)
    newSet.add(identifier)
    activeDialogIdentifiers.value = newSet
    dialogQueue.value = [...dialogQueue.value, newDialog]
  })
}

// Watchers (equivalentes a createEffect)
watch([currentDialog, dialogQueue], () => {
  if (!currentDialog.value && dialogQueue.value.length > 0) {
    const nextDialog = dialogQueue.value[0]
    
    if (nextDialog.onOpen) {
      nextDialog.onOpen()
    }
    
    currentDialog.value = nextDialog
    dialogQueue.value = dialogQueue.value.slice(1)
    isVisible.value = true
  }
}, { deep: true })

watch([isVisible, currentDialog], async () => {
  if (isVisible.value && currentDialog.value) {
    await nextTick()
    if (acceptButtonRef.value) {
      acceptButtonRef.value.focus()
    }
  }
})

// Funciones de manejo
const handleResolve = (value: boolean) => {
  const dialog = currentDialog.value
  if (dialog) {
    dialog.promiseResolve(value)
  }
}

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && isVisible.value && currentDialog.value) {
    handleResolve(false)
  }
}

// Lifecycle hooks
onMounted(() => {
  // Exponemos la función globalmente
  if (typeof window !== 'undefined') {
    ;(window as any).showQueuedDialog = showQueuedDialogVue
  }
})

watch(isVisible, (newValue) => {
  if (newValue) {
    document.addEventListener('keydown', handleKeyDown)
  } else {
    document.removeEventListener('keydown', handleKeyDown)
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
})

// Exportamos la función para uso programático
defineExpose({
  showQueuedDialog: showQueuedDialogVue
})
</script>

<style scoped>
@import '@components/dialog/dialog.css';
</style>